import { MovementLogEntity } from '../models/index.js';

export async function attachLastInvoiceLog(invoices) {
  if (!Array.isArray(invoices)) return;

  for (const invoice of invoices) {
    const lastMovement = await MovementLogEntity.findOne({
      where: { entity: 'fatura', entityId: invoice.id },
      order: [['date', 'DESC']],
      attributes: ['id', 'method', 'status', 'userId', 'date']
    });
    invoice.dataValues.lastMovementLog = lastMovement || null;
  }
}
