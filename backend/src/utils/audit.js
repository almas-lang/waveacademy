/**
 * Log an admin action to the audit_logs table.
 * Fire-and-forget — never blocks the response.
 */
function logAudit(prisma, { admin, action, targetType, targetId, details }) {
  try {
    prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action,
        targetType,
        targetId,
        details: details || null,
      }
    }).catch(err => console.error('Audit log error:', err.message));
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = { logAudit };
