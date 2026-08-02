/**
 * Admin Audit Log
 *
 * Writes immutable audit records to AdminAuditLog for every admin action.
 * Non-blocking: errors are caught and logged but never thrown to callers.
 *
 * Usage:
 *   await writeAudit({ adminId, action: 'USER_ROLE_UPDATED', targetType: 'User', targetId: userId, after: { role } });
 */

import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export interface AuditEntry {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: entry.adminId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        before: entry.before,
        after: entry.after,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch {
    // Audit failures must never interrupt the admin action itself
    process.stderr.write(`[audit] failed to write audit log for action ${entry.action}\n`);
  }
}
