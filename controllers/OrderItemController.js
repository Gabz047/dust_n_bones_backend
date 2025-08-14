import {
  OrderItem,
  Order,
  Item,
  ItemFeature,
  FeatureOption,
  sequelize
} from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

class OrderItemController {
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { orderId, itemId, itemFeatureId, featureOptionId, quantity } = req.body;

      
      const order = await Order.findByPk(orderId);
      if (!order) {
        return res.status(400).json({ success: false, message: 'Pedido não encontrado' });
      }

      const item = await Item.findByPk(itemId);
      if (!item) {
        return res.status(400).json({ success: false, message: 'Item não encontrado' });
      }

      if (itemFeatureId) {
        const feature = await ItemFeature.findByPk(itemFeatureId);
        if (!feature) {
          return res.status(400).json({ success: false, message: 'Característica do item não encontrada' });
        }
      }

      const option = await FeatureOption.findByPk(featureOptionId);
      if (!option) {
        return res.status(400).json({ success: false, message: 'Opção de característica não encontrada' });
      }

      const OrderItem = await OrderItem.create({
        id: uuidv4(),
        orderId,
        itemId,
        itemFeatureId: itemFeatureId || null,
        featureOptionId,
        quantity: quantity || 1
      }, { transaction });

      await transaction.commit();
      return res.status(201).json({ success: true, data: OrderItem });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar item do pedido:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getAll(req, res) {
    try {
      const { count, rows } = await OrderItem.findAndCountAll({
        include: [
          { model: Order, as: 'order' },
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, data: rows, total: count });
    } catch (error) {
      console.error('Erro ao listar itens de pedido:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getByOrder(req, res) {
    try {
      const { orderId } = req.params;
      const rows = await OrderItem.findAll({
        where: { orderId },
        include: [
          { model: Order, as: 'order' },
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' }
        ]
      });

      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Erro ao buscar itens por pedido:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getByItem(req, res) {
    try {
      const { itemId } = req.params;
      const rows = await OrderItem.findAll({
        where: { itemId },
        include: [
          { model: Order, as: 'order' },
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' }
        ]
      });

      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Erro ao buscar itens por produto:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getByFeature(req, res) {
    try {
      const { itemFeatureId } = req.params;
      const rows = await OrderItem.findAll({
        where: { itemFeatureId },
        include: [
          { model: Order, as: 'order' },
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' }
        ]
      });

      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Erro ao buscar itens por característica:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const OrderItem = await OrderItem.findByPk(id);
      if (!OrderItem) {
        return res.status(404).json({ success: false, message: 'Registro não encontrado' });
      }

      await OrderItem.update(updates);
      res.json({ success: true, data: OrderItem });
    } catch (error) {
      console.error('Erro ao atualizar item de pedido:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const OrderItem = await OrderItem.findByPk(id);
      if (!OrderItem) {
        return res.status(404).json({ success: false, message: 'Registro não encontrado' });
      }

      await OrderItem.destroy();
      res.json({ success: true, message: 'Registro removido com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar item de pedido:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }
}

export default OrderItemController;
