import { sequelize, DeliveryNote, DeliveryNoteItem, MovementLogEntity, MovementLogEntityItem, Box } from '../models/index.js';
import { Op } from 'sequelize';

class DeliveryNoteController {

  // Cria um novo Delivery Note
static async create(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { invoiceId, projectId, companyId, branchId, customerId, orderId, expeditionId, userId, boxes } = req.body;

    const deliveryNote = await DeliveryNote.create({
      invoiceId,
      projectId,
      companyId: companyId || null,
      branchId: branchId || (companyId ? null : /* pegar branch do user */ null),
      customerId,
      orderId,
      expeditionId,
      totalQuantity: 0,
      boxQuantity: 0
    }, { transaction });

    const movementLog = await MovementLogEntity.create({
      userId,
      method: 'criação',
      entity: 'romaneio',
      entityId: deliveryNote.id,
      status: 'finalizado'
    }, { transaction });

    // Cria os itens
    const itemsToCreate = boxes.map(boxId => ({
      deliveryNoteId: deliveryNote.id,
      boxId
    }));

    for (const item of itemsToCreate) {
      await DeliveryNoteItem.create(item, { transaction });
      await MovementLogEntityItem.create({
        entity: 'romaneio',
        entityId: deliveryNote.id,
        quantity: 1,
        movementLogEntityId: movementLog.id,
        date: new Date()
      }, { transaction });
    }

    // Atualiza totais
    const totalQuantity = await Box.sum('totalQuantity', { where: { id: boxes }, transaction });
    await deliveryNote.update({ boxQuantity: boxes.length, totalQuantity }, { transaction });

    await transaction.commit();
    return res.status(201).json(deliveryNote);
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ error: error.message });
  }
}


  // Atualiza um Delivery Note
  static async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { invoiceId, projectId, companyId, branchId, customerId, orderId, expeditionId, userId } = req.body;

      const deliveryNote = await DeliveryNote.findByPk(id);
      if (!deliveryNote) return res.status(404).json({ error: 'DeliveryNote não encontrado' });

      await deliveryNote.update({
        invoiceId,
        projectId,
        companyId,
        branchId,
        customerId,
        orderId,
        expeditionId
      }, { transaction });

      // Cria movimentação
      await MovementLogEntity.create({
        userId,
        method: 'edição',
        entity: 'romaneio',
        entityId: deliveryNote.id,
        status: 'finalizado'
      }, { transaction });

      await transaction.commit();
      return res.json(deliveryNote);
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  // Deleta um Delivery Note
  static async delete(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const deliveryNote = await DeliveryNote.findByPk(id);
      if (!deliveryNote) return res.status(404).json({ error: 'DeliveryNote não encontrado' });

      await deliveryNote.destroy({ transaction });

      // Cria movimentação
      await MovementLogEntity.create({
        userId,
        method: 'remoção',
        entity: 'romaneio',
        entityId: id,
        status: 'finalizado'
      }, { transaction });

      await transaction.commit();
      return res.json({ message: 'DeliveryNote deletado com sucesso' });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  // Métodos de consulta
  static async getAll(req, res) {
    try {
      const deliveryNotes = await DeliveryNote.findAll();
      return res.json(deliveryNotes);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const deliveryNote = await DeliveryNote.findByPk(id);
      if (!deliveryNote) return res.status(404).json({ error: 'DeliveryNote não encontrado' });
      return res.json(deliveryNote);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getByInvoice(req, res) {
    try {
      const { invoiceId } = req.params;
      const deliveryNotes = await DeliveryNote.findAll({ where: { invoiceId } });
      return res.json(deliveryNotes);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getByCompanyOrBranch(req, res) {
    try {
      const { companyId, branchId } = req.query;
      const deliveryNotes = await DeliveryNote.findAll({
        where: { [Op.or]: [{ companyId }, { branchId }] }
      });
      return res.json(deliveryNotes);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getByCustomer(req, res) {
    try {
      const { customerId } = req.params;
      const deliveryNotes = await DeliveryNote.findAll({ where: { customerId } });
      return res.json(deliveryNotes);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getByOrder(req, res) {
    try {
      const { orderId } = req.params;
      const deliveryNotes = await DeliveryNote.findAll({ where: { orderId } });
      return res.json(deliveryNotes);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getByExpedition(req, res) {
    try {
      const { expeditionId } = req.params;
      const deliveryNotes = await DeliveryNote.findAll({ where: { expeditionId } });
      return res.json(deliveryNotes);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export default DeliveryNoteController;
