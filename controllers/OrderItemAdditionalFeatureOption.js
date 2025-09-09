// controllers/OrderItemAdditionalFeatureOptionController.js
import { sequelize, Order, Item, ItemFeature, FeatureOption, OrderItemAdditionalFeatureOption } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

class OrderItemAdditionalFeatureOptionController {

  // Cria uma opção subsequente
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { orderId, itemId, itemFeatureId, featureOptionId } = req.body;

      // Verificações básicas
      const order = await Order.findByPk(orderId);
      if (!order) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Pedido não encontrado' });
      }

      const item = await Item.findByPk(itemId);
      if (!item) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Item não encontrado' });
      }

      const feature = await ItemFeature.findByPk(itemFeatureId);
      if (!feature) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Característica não encontrada' });
      }

      const option = await FeatureOption.findByPk(featureOptionId);
      if (!option) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Opção de característica não encontrada' });
      }

      const record = await OrderItemAdditionalFeatureOption.create({
        id: uuidv4(),
        orderId,
        itemId,
        itemFeatureId,
        featureOptionId
      }, { transaction });

      await transaction.commit();
      return res.status(201).json({ success: true, data: record });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar opção adicional:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Listar por pedido
static async getByOrder(req, res) {
  try {
    const { id } = req.params;
    const rows = await OrderItemAdditionalFeatureOption.findAll({
      where: { orderId: id },
      include: [
        { model: Item, as: 'item' },
        { model: ItemFeature, as: 'itemFeature' },
        { model: FeatureOption, as: 'featureOption' }
      ]
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Erro ao buscar adicionais por pedido:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}

// Listar por pedido + item
static async getByOrderAndItem(req, res) {
  try {
    const { orderId, itemFeatureId } = req.params;
    const rows = await OrderItemAdditionalFeatureOption.findAll({
      where: { orderId, itemFeatureId },
      include: [
        { model: ItemFeature, as: 'itemFeature' },
        { model: FeatureOption, as: 'featureOption' }
      ]
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Erro ao buscar adicionais por pedido e item:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}


  // Atualiza uma opção subsequente
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existing = await OrderItemAdditionalFeatureOption.findByPk(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Registro não encontrado' });

      await existing.update(updates);
      res.json({ success: true, data: existing });
    } catch (error) {
      console.error('Erro ao atualizar opção adicional:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Deleta uma opção subsequente
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const existing = await OrderItemAdditionalFeatureOption.findByPk(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Registro não encontrado' });

      await existing.destroy();
      res.json({ success: true, message: 'Registro removido com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar opção adicional:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }
}

export default OrderItemAdditionalFeatureOptionController;
