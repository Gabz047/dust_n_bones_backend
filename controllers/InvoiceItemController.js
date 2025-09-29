import { sequelize, InvoiceItem, Invoice, MovementLogEntityItem, DeliveryNote, Box, BoxItem, FeatureOption, ItemFeature, Feature, OrderItem, Order, Item, Customer } from '../models/index.js';
import { calculateQuantityAndPrice, groupItems } from '../utils/invoice.js';

class InvoiceItemController {

  static async createBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { items, movementLogEntityId } = req.body;

      if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Array de items é obrigatório' });
      if (!movementLogEntityId) return res.status(400).json({ error: 'movementLogEntityId é obrigatório' });

      const createdItems = [];

      for (const item of items) {
        // Calcula quantidade total e preço baseado no romaneio
        const { totalQuantity, totalPrice } = await calculateQuantityAndPrice(item.deliveryNoteId, transaction);

        const invoiceItem = await InvoiceItem.create({
          invoiceId: item.invoiceId,
          deliveryNoteId: item.deliveryNoteId,
          orderId: item.orderId,
          price: totalPrice
        }, { transaction });

        if (item.deliveryNoteId) {
          await DeliveryNote.update(
            { invoiceId: item.invoiceId },
            { where: { id: item.deliveryNoteId }, transaction }
          );
        }

        if (item.invoiceId) {
          const totalInvoicePrice = await InvoiceItem.sum('price', {
            where: { invoiceId: item.invoiceId },
            transaction
          });
          await Invoice.update({ totalPrice: totalInvoicePrice }, { where: { id: item.invoiceId }, transaction });
        }

        // Cria o log com quantidade correta
        await MovementLogEntityItem.create({
          movementLogEntityId,
          entity: 'fatura',
          entityId: invoiceItem.id,
          quantity: totalQuantity,
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

  // ---------------------- UPDATE BATCH ----------------------
  static async updateBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { items, movementLogEntityId } = req.body;

      if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Array de items é obrigatório' });
      if (!movementLogEntityId) return res.status(400).json({ error: 'movementLogEntityId é obrigatório' });

      const updatedItems = [];

      for (const item of items) {
        const invoiceItem = await InvoiceItem.findByPk(item.id, { transaction });
        if (!invoiceItem) continue;

        // Recalcula quantidade e preço
        const { totalQuantity, totalPrice } = await calculateQuantityAndPrice(invoiceItem.deliveryNoteId, transaction);

        await invoiceItem.update({
          orderId: item.orderId ?? invoiceItem.orderId,
          price: totalPrice
        }, { transaction });

        if (invoiceItem.invoiceId) {
          const totalInvoicePrice = await InvoiceItem.sum('price', {
            where: { invoiceId: invoiceItem.invoiceId },
            transaction
          });
          await Invoice.update({ totalPrice: totalInvoicePrice }, { where: { id: invoiceItem.invoiceId }, transaction });
        }

        if (invoiceItem.deliveryNoteId) {
          await DeliveryNote.update(
            { invoiceId: invoiceItem.invoiceId },
            { where: { id: invoiceItem.deliveryNoteId }, transaction }
          )
        }

        // Atualiza o log
        await MovementLogEntityItem.create({
          movementLogEntityId,
          entity: 'fatura',
          entityId: invoiceItem.id,
          quantity: totalQuantity,
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

  // ---------------------- DELETE BATCH ----------------------
  static async deleteBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { ids, movementLogEntityId } = req.body;

      if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'Array de IDs é obrigatório' });
      if (!movementLogEntityId) return res.status(400).json({ error: 'movementLogEntityId é obrigatório' });

      const deletedItems = [];

      for (const id of ids) {
        const invoiceItem = await InvoiceItem.findByPk(id, { transaction });
        if (!invoiceItem) continue;

        if (invoiceItem.deliveryNoteId) {
          await DeliveryNote.update(
            { invoiceId: null },
            { where: { id: invoiceItem.deliveryNoteId }, transaction }
          );
        }

        if (invoiceItem.invoiceId) {
          const totalInvoicePrice = await InvoiceItem.sum('price', {
            where: { invoiceId: invoiceItem.invoiceId },
            transaction
          }) || 0; // se não tiver mais nenhum item, coloca 0
          await Invoice.update({ totalPrice: totalInvoicePrice }, { where: { id: invoiceItem.invoiceId }, transaction });
        }

        // Deleta o item
        await invoiceItem.destroy({ transaction });

        // Cria log de exclusão (quantidade = 0)
        await MovementLogEntityItem.create({
          movementLogEntityId,
          entity: 'fatura',
          entityId: id,
          quantity: 0,
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


  // Busca todos os InvoiceItems
  static async getAll(req, res) {
    try {
      const items = await InvoiceItem.findAll({
        include: [
          { model: DeliveryNote, as: 'deliveryNote', attributes: ['id', 'number'] },
          { model: Box, as: 'box', attributes: ['id', 'label'] }
        ]
      });
      return res.json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const item = await InvoiceItem.findByPk(id, {
        include: [
          { model: DeliveryNote, as: 'deliveryNote', attributes: ['id', 'number'] },
          { model: Box, as: 'box', attributes: ['id', 'label'] }
        ]
      });
      if (!item) return res.status(404).json({ error: 'Item não encontrado' });
      return res.json(item);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca por Invoice



  static async getByInvoice(req, res) {
    try {
      const { invoiceId } = req.params

      const invoiceItems = await InvoiceItem.findAll({
        where: { invoiceId },
        include: [
          {
            model: DeliveryNote,
            as: 'deliveryNote',
            attributes: ['id', 'referralId'],
            include: [
              {
                model: Box,
                as: 'boxes',
                attributes: ['id', 'referralId'],
                include: [
                  { model: Customer, as: 'customer', attributes: ['name'] },
                  {
                    model: BoxItem,
                    as: 'items',
                    attributes: ['id', 'quantity'],
                    include: [
                      { model: Item, as: 'item', attributes: ['id', 'name', 'price'] },
                      { model: FeatureOption, as: 'featureOption', attributes: ['id', 'name'] },
                      { model: ItemFeature, as: 'itemFeature', attributes: ['id'], include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }] }
                    ]
                  }
                ]
              }
            ]
          },
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'referralId'],
            include: [
              { model: Customer, as: 'customer', attributes: ['name'] },
              {
                model: OrderItem,
                as: 'orderItems',
                attributes: ['id', 'quantity'],
                include: [
                  { model: Item, as: 'item', attributes: ['id', 'name', 'price'] },
                  { model: FeatureOption, as: 'featureOption', attributes: ['id', 'name'] },
                  { model: ItemFeature, as: 'itemFeature', attributes: ['id'], include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }] }
                ]
              }
            ]
          }
        ]
      })

      // Agrupa BoxItems dentro de cada InvoiceItem
      const groupedInvoiceItems = invoiceItems.map(ii => {
        // DeliveryNote → Boxes → Items
        if (ii.deliveryNote?.boxes) {
          ii.deliveryNote.boxes = ii.deliveryNote.boxes.map(box => ({
            ...box.toJSON?.() || box,
            items: groupItems(box.items)
          }))
        }

        // Order → OrderItems
        if (ii.order?.orderItems) {
          ii.order.orderItems = groupItems(ii.order.orderItems)
        }

        return ii
      })

      return res.json(groupedInvoiceItems)
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }



  // Busca por DeliveryNote
  static async getByDeliveryNote(req, res) {
    try {
      const { deliveryNoteId } = req.params;
      const items = await InvoiceItem.findAll({
        where: { deliveryNoteId },
        include: [
          { model: Box, as: 'box', attributes: ['id', 'label'] }
        ]
      });
      return res.json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca por Order
  static async getByOrder(req, res) {
    try {
      const { orderId } = req.params;
      const items = await InvoiceItem.findAll({
        where: { orderId },
        include: [
          { model: DeliveryNote, as: 'deliveryNote', attributes: ['id', 'number'] },
          { model: Box, as: 'box', attributes: ['id', 'label'] }
        ]
      });
      return res.json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export default InvoiceItemController;
