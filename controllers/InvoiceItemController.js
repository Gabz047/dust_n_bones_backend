import { sequelize, InvoiceItem, MovementLogEntityItem, Box, DeliveryNote } from '../models/index.js';

class InvoiceItemController {

  // Cria múltiplos InvoiceItems (createBatch)
  static async createBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { items, movementLogEntityId } = req.body;

      if (!Array.isArray(items) || !items.length) {
        return res.status(400).json({ error: 'Array de items é obrigatório' });
      }
      if (!movementLogEntityId) {
        return res.status(400).json({ error: 'movementLogEntityId é obrigatório' });
      }

      const createdItems = [];
      for (const item of items) {
        const invoiceItem = await InvoiceItem.create({
          invoiceId: item.invoiceId,
          deliveryNoteId: item.deliveryNoteId,
          orderId: item.orderId,
          price: item.price || 0
        }, { transaction });

        await MovementLogEntityItem.create({
          movementLogEntityId,
          entity: 'fatura',
          entityId: invoiceItem.id,
          quantity: 1,
          date: new Date()
        }, { transaction });

        createdItems.push(invoiceItem);
      }

      await transaction.commit();
      return res.status(201).json(createdItems);
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  // Atualiza múltiplos InvoiceItems
  static async updateBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { items, movementLogEntityId } = req.body;

      if (!Array.isArray(items) || !items.length) {
        return res.status(400).json({ error: 'Array de items é obrigatório' });
      }
      if (!movementLogEntityId) {
        return res.status(400).json({ error: 'movementLogEntityId é obrigatório' });
      }

      const updatedItems = [];
      for (const item of items) {
        const invoiceItem = await InvoiceItem.findByPk(item.id, { transaction });
        if (!invoiceItem) continue;

        await invoiceItem.update({
          invoiceId: item.invoiceId,
          deliveryNoteId: item.deliveryNoteId,
          orderId: item.orderId,
          price: item.price || invoiceItem.price
        }, { transaction });

        await MovementLogEntityItem.create({
          movementLogEntityId,
          entity: 'fatura',
          entityId: invoiceItem.id,
          quantity: 1,
          date: new Date()
        }, { transaction });

        updatedItems.push(invoiceItem);
      }

      await transaction.commit();
      return res.json(updatedItems);
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  // Deleta múltiplos InvoiceItems
  static async deleteBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { ids, movementLogEntityId } = req.body;

      if (!Array.isArray(ids) || !ids.length) {
        return res.status(400).json({ error: 'Array de IDs é obrigatório' });
      }
      if (!movementLogEntityId) {
        return res.status(400).json({ error: 'movementLogEntityId é obrigatório' });
      }

      const deletedItems = [];
      for (const id of ids) {
        const invoiceItem = await InvoiceItem.findByPk(id, { transaction });
        if (!invoiceItem) continue;

        await invoiceItem.destroy({ transaction });

        await MovementLogEntityItem.create({
          movementLogEntityId,
          entity: 'fatura',
          entityId: id,
          quantity: 1,
          date: new Date()
        }, { transaction });

        deletedItems.push(id);
      }

      await transaction.commit();
      return res.json({ deleted: deletedItems });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca todos
  static async getAll(req, res) {
    try {
      const items = await InvoiceItem.findAll();
      return res.json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const item = await InvoiceItem.findByPk(id);
      if (!item) return res.status(404).json({ error: 'Item não encontrado' });
      return res.json(item);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca por Invoice
  static async getByInvoice(req, res) {
    try {
      const { invoiceId } = req.params;
      const items = await InvoiceItem.findAll({ where: { invoiceId } });
      return res.json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca por DeliveryNote
  static async getByDeliveryNote(req, res) {
    try {
      const { deliveryNoteId } = req.params;
      const items = await InvoiceItem.findAll({ where: { deliveryNoteId } });
      return res.json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca por Order
  static async getByOrder(req, res) {
    try {
      const { orderId } = req.params;
      const items = await InvoiceItem.findAll({ where: { orderId } });
      return res.json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export default InvoiceItemController;
