import { MovementLogEntity } from "../../models";

export async function attachLastMovementLog(entityArray, entityName = 'romaneio') {
  if (!Array.isArray(entityArray)) return;

  for (const entity of entityArray) {
    const lastLog = await MovementLogEntity.findOne({
      where: { entity: entityName, entityId: entity.id },
      order: [['createdAt', 'DESC']]
    });
    entity.dataValues.lastMovementLog = lastLog;

    // Se a entidade tiver sub-entidades (ex: boxes dentro do deliveryNote)
    if (entity.boxes) {
      await attachLastMovementLog(entity.boxes, 'caixa');
    }
  }
}
