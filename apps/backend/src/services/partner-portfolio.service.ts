import { createHash } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { ForbiddenError, ConflictError, ValidationError } from '../utils/errors.util.js';
import { storePartnerPortfolioImage, deleteStoredImages } from './product-image-storage.service.js';
import { logger } from '../utils/logger.util.js';

const publicFields = { id: true, url: true, caption: true, size: true, width: true, height: true, createdAt: true } as const;
export async function listPartnerPortfolio(userId: string) {
  return prisma.partnerPortfolioImage.findMany({ where: { partner: { userId } }, select: publicFields, orderBy: { createdAt: 'desc' }, take: 8 });
}
export async function addPartnerPortfolio(userId: string, file: Express.Multer.File, caption: string, key: string) {
  if (!file?.buffer?.length) throw new ValidationError('Escolha uma foto');
  const requestKey = createHash('sha256').update(`${userId}:${key}`).digest('hex');
  const fingerprint = createHash('sha256').update(file.buffer).update(caption).digest('hex');
  let stored: Awaited<ReturnType<typeof storePartnerPortfolioImage>> | undefined;
  try {
    return await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner:${userId}`}))`;
      const partner = await tx.partnerProfile.findUnique({ where: { userId } });
      if (!partner || !['PENDING', 'APPROVED'].includes(partner.status)) throw new ForbiddenError('Atualize o cadastro ou fale com a loja antes de enviar fotos.');
      const previous = await tx.partnerPortfolioImage.findUnique({ where: { requestKey }, select: { ...publicFields, fingerprint: true } });
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outra foto.');
        return { ...previous, fingerprint: undefined };
      }
      if (await tx.partnerPortfolioImage.count({ where: { partnerId: partner.id } }) >= 8) throw new ValidationError('Seu portfólio aceita até 8 fotos. Remova uma para adicionar outra.');
      stored = await storePartnerPortfolioImage(file);
      return tx.partnerPortfolioImage.create({ data: { partnerId: partner.id, storageKey: stored.storageKey, url: stored.url,
        caption, size: stored.size, width: stored.width!, height: stored.height!, requestKey, fingerprint }, select: publicFields });
    }, { timeout: 15000 });
  } catch (error) {
    if (stored) await deleteStoredImages([stored]).catch(() => logger.warn('Falha ao limpar upload de portfólio não confirmado'));
    throw error;
  }
}
export async function removePartnerPortfolio(userId: string, id: string) {
  const image = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner:${userId}`}))`;
    const owned = await tx.partnerPortfolioImage.findFirst({ where: { id, partner: { userId } }, select: { storageKey: true } });
    if (!owned) return null;
    await tx.partnerPortfolioImage.delete({ where: { id } }); return owned;
  });
  if (image) await deleteStoredImages([image]).catch(() => logger.warn('Falha ao remover arquivo órfão de portfólio'));
}
