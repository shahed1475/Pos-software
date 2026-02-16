import { prisma } from "./prisma"

export async function logAudit(params: {
  tenantId?: string
  staffId?: string
  action: string
  entity: string
  entityId?: string
  details?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId || null,
        staffId: params.staffId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
      },
    })
  } catch (error) {
    console.error("Audit log error:", error)
  }
}
