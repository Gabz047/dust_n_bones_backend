import { sequelize, DeliveryNoteItem, DeliveryNote, Box, MovementLogEntityItem } from '../models/index.js';
import { Op } from 'sequelize';

class DeliveryNoteItemController {

  // Cria vários itens
  static async createBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { items, movementLogEntityId } = req.body; // [{ deliveryNoteId, boxId }, ...]
      if (!items?.length) return res.status(400).json({ error: 'Nenhum item fornecido' });
      if (!movementLogEntityId) return res.status(400).json({ error: 'movementLogEntityId não fornecido' });

      const createdItems = [];

      for (const item of items) {
        const deliveryNoteItem = await DeliveryNoteItem.create({
          deliveryNoteId: item.deliveryNoteId,
          boxId: item.boxId
        }, { transaction });

        await MovementLogEntityItem.create({
          entity: 'romaneio',
          entityId: item.deliveryNoteId,
          quantity: 1,
          movementLogEntityId,
          date: new Date()
        }, { transaction });

        createdItems.push(deliveryNoteItem);
      }

      await DeliveryNoteItemController._updateDeliveryNotes(items.map(i => i.deliveryNoteId), transaction);

      await transaction.commit();
      return res.status(201).json(createdItems);
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  // Atualiza itens existentes
  static async updateBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { items, movementLogEntityId } = req.body; // [{ id, boxId }, ...]
      if (!items?.length) return res.status(400).json({ error: 'Nenhum item fornecido' });
      if (!movementLogEntityId) return res.status(400).json({ error: 'movementLogEntityId não fornecido' });

      const deliveryNoteIds = [];

      for (const item of items) {
        const existing = await DeliveryNoteItem.findByPk(item.id, { transaction });
        if (!existing) continue;

        deliveryNoteIds.push(existing.deliveryNoteId);

        await existing.update({ boxId: item.boxId }, { transaction });

        await MovementLogEntityItem.create({
          entity: 'romaneio',
          entityId: existing.deliveryNoteId,
          quantity: 1,
          movementLogEntityId,
          date: new Date()
        }, { transaction });
      }

      await DeliveryNoteItemController._updateDeliveryNotes(deliveryNoteIds, transaction);

      await transaction.commit();
      return res.json({ message: 'Itens atualizados com sucesso' });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  // Deleta vários itens
  static async deleteBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { itemIds, movementLogEntityId } = req.body;
      if (!itemIds?.length) return res.status(400).json({ error: 'Nenhum ID fornecido' });
      if (!movementLogEntityId) return res.status(400).json({ error: 'movementLogEntityId não fornecido' });

      const items = await DeliveryNoteItem.findAll({ where: { id: itemIds }, transaction });
      const deliveryNoteIds = [...new Set(items.map(i => i.deliveryNoteId))];

      await DeliveryNoteItem.destroy({ where: { id: itemIds }, transaction });

      for (const item of items) {
        await MovementLogEntityItem.create({
          entity: 'romaneio',
          entityId: item.deliveryNoteId,
          quantity: 1,
          movementLogEntityId,
          date: new Date()
        }, { transaction });
      }

      await DeliveryNoteItemController._updateDeliveryNotes(deliveryNoteIds, transaction);

      await transaction.commit();
      return res.json({ message: 'Itens deletados com sucesso' });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca todos os itens
  static async getAll(req, res) {
    try {
      const items = await DeliveryNoteItem.findAll();
      return res.json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca item por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const item = await DeliveryNoteItem.findByPk(id);
      if (!item) return res.status(404).json({ error: 'Item não encontrado' });
      return res.json(item);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca itens por DeliveryNote
  static async getByDeliveryNote(req, res) {
    try {
      const { deliveryNoteId } = req.params;
      const items = await DeliveryNoteItem.findAll({ where: { deliveryNoteId } });
      return res.json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca itens por Box
  static async getByBox(req, res) {
    try {
      const { boxId } = req.params;
      const items = await DeliveryNoteItem.findAll({ where: { boxId } });
      return res.json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Método privado para atualizar boxQuantity e totalQuantity do DeliveryNote
  static async _updateDeliveryNotes(deliveryNoteIds, transaction) {
    const uniqueIds = [...new Set(deliveryNoteIds)];
    for (const dnId of uniqueIds) {
      const dnItems = await DeliveryNoteItem.findAll({ where: { deliveryNoteId: dnId }, transaction });
      const boxCount = dnItems.length;
      const boxes = await Box.findAll({ where: { id: dnItems.map(i => i.boxId) }, transaction });
      const totalQuantity = boxes.reduce((sum, b) => sum + (b.totalQuantity || 0), 0);
      await DeliveryNote.update({ boxQuantity: boxCount, totalQuantity }, { where: { id: dnId }, transaction });
    }
  }
}

export default DeliveryNoteItemController;
