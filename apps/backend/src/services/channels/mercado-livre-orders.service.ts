import { ValidationError } from '../../utils/errors.util.js';
import { providerJson } from './provider-http.js';

type RemoteOrder = { id?: number; status?: string; currency_id?: string; total_amount?: number; date_created?: string;
  seller?: { id?: number }; order_items?: Array<{ quantity?: number; unit_price?: number; item?: { id?: string; title?: string } }> };

/** Read-only preview: never turns a marketplace buyer into an application user. */
export async function readMercadoLivreOrders(channelId: string, page: number) {
  const { prisma } = await import('../../lib/prisma.js');
  const { getMercadoLivreCredentials } = await import('./mercado-livre-auth.service.js');
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel?.isActive || channel.type !== 'MERCADO_LIVRE' || !channel.externalId || !/^\d+$/.test(channel.externalId)) throw new ValidationError('Autorize a conta Mercado Livre antes de consultar pedidos');
  const credentials = await getMercadoLivreCredentials(channelId);
  return fetchMercadoLivreOrders(credentials.accessToken, channel.externalId, page);
}

export async function fetchMercadoLivreOrders(accessToken: string, sellerId: string, page: number) {
  if (!accessToken || !/^\d+$/.test(sellerId) || !Number.isInteger(page) || page < 1 || page > 50) throw new ValidationError('Consulta de pedidos inválida');
  const limit = 20; const offset = (page - 1) * limit;
  const url = new URL('https://api.mercadolibre.com/orders/search');
  url.search = new URLSearchParams({ seller: sellerId, sort: 'date_desc', limit: String(limit), offset: String(offset) }).toString();
  const response = await providerJson<{ results?: RemoteOrder[]; paging?: { total?: number } }>(url.href, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  }).catch(() => { throw new ValidationError('Não foi possível consultar os pedidos. Confira a autorização e as permissões do Mercado Livre.'); });
  if (!response || !Array.isArray(response.results) || response.results.length > limit || !Number.isSafeInteger(response.paging?.total) || response.paging!.total! < 0) throw new ValidationError('O Mercado Livre retornou pedidos em formato inesperado');
  const orders = response.results.map(order => {
    if (!order || !Number.isSafeInteger(order.id) || order.id! <= 0 || String(order.seller?.id) !== sellerId || order.currency_id !== 'BRL' || !Number.isFinite(order.total_amount) || order.total_amount! < 0 || !Array.isArray(order.order_items) || !order.order_items.length || order.order_items.length > 100) throw new ValidationError('O pedido não corresponde à conta ou ao formato esperado');
    return { id: String(order.id), status: String(order.status ?? '').slice(0, 64), currency: 'BRL', total: order.total_amount!,
      createdAt: order.date_created && Number.isFinite(Date.parse(order.date_created)) ? order.date_created : null,
      items: order.order_items.map(item => {
        if (!item?.item?.id || !/^MLB\d+$/.test(item.item.id) || !Number.isSafeInteger(item.quantity) || item.quantity! <= 0 || !Number.isFinite(item.unit_price) || item.unit_price! < 0) throw new ValidationError('O Mercado Livre retornou um item inválido');
        return { externalListingId: item.item.id, title: String(item.item.title ?? item.item.id).slice(0, 255), quantity: item.quantity!, unitPrice: item.unit_price! };
      }) };
  });
  const total = response.paging!.total!;
  return { orders, page, limit, total, hasNext: offset + orders.length < Math.min(total, 1000), checkedAt: new Date().toISOString() };
}
