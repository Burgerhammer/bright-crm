import { prisma } from "@/lib/prisma";

interface LogAuditParams {
  entityType: string;
  entityId: string;
  action: string;
  changes?: string;
  userId: string;
}

export async function logAudit(params: LogAuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        changes: params.changes || null,
        userId: params.userId,
      },
    });
  } catch (error) {
    // Log but don't throw — audit logging should not break the main operation
    console.error("Failed to create audit log:", error);
  }
}

export function diffChanges(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): string {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const key of Object.keys(newData)) {
    // Skip internal/meta fields
    if (["id", "createdAt", "updatedAt", "completedAt"].includes(key)) continue;

    const oldVal = oldData[key] ?? null;
    const newVal = newData[key] ?? null;

    // Normalize for comparison: convert Date objects to ISO strings
    const normalizedOld =
      oldVal instanceof Date ? oldVal.toISOString() : oldVal;
    const normalizedNew =
      newVal instanceof Date ? newVal.toISOString() : newVal;

    if (normalizedOld !== normalizedNew) {
      changes[key] = { old: normalizedOld, new: normalizedNew };
    }
  }

  return JSON.stringify(changes);
}
