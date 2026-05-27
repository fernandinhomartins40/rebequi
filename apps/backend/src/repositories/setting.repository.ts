/**
 * Setting Repository
 * Data access layer for the generic Setting key/value store.
 */

import { Setting } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export class SettingRepository {
  async findByKey(key: string): Promise<Setting | null> {
    return prisma.setting.findUnique({ where: { key } });
  }

  async findManyByKeys(keys: string[]): Promise<Setting[]> {
    if (keys.length === 0) return [];
    return prisma.setting.findMany({ where: { key: { in: keys } } });
  }

  async upsert(params: {
    key: string;
    value: string;
    isSecret?: boolean;
    description?: string;
  }): Promise<Setting> {
    const { key, value, isSecret = false, description } = params;
    return prisma.setting.upsert({
      where: { key },
      update: { value, isSecret, description },
      create: { key, value, isSecret, description },
    });
  }

  async deleteByKey(key: string): Promise<void> {
    await prisma.setting.deleteMany({ where: { key } });
  }
}
