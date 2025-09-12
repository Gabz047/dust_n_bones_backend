// controllers/ProductionOrderItemAdditionalFeatureOptionController.js
import { sequelize, ProductionOrder, Item, ItemFeature, FeatureOption, ProductionOrderItemAdditionalFeatureOption } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

class ProductionOrderItemAdditionalFeatureOptionController {

  // Cria uma opção adicional de item da ordem de produção
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { productionOrderId, itemId, itemFeatureId, featureOptionId } = req.body;

      // Verificações básicas
      const productionOrder = await ProductionOrder.findByPk(productionOrderId);
      if (!productionOrder) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Ordem de produção não encontrada' });
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

      const record = await ProductionOrderItemAdditionalFeatureOption.create({
        id: uuidv4(),
        productionOrderId,
        itemId,
        itemFeatureId,
        featureOptionId
      }, { transaction });

      await transaction.commit();
      return res.status(201).json({ success: true, data: record });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar opção adicional da ordem de produção:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Listar por ordem de produção
  static async getByProductionOrder(req, res) {
    try {
      const { id } = req.params;
      const rows = await ProductionOrderItemAdditionalFeatureOption.findAll({
        where: { productionOrderId: id },
        include: [
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' }
        ]
      });
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Erro ao buscar adicionais por ordem de produção:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Listar por ordem de produção + item
  static async getByProductionOrderAndItem(req, res) {
    try {
      const { productionOrderId, itemFeatureId } = req.params;
      const rows = await ProductionOrderItemAdditionalFeatureOption.findAll({
        where: { productionOrderId, itemFeatureId },
        include: [
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' }
        ]
      });
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Erro ao buscar adicionais por ordem de produção e item:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Atualiza uma opção adicional
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existing = await ProductionOrderItemAdditionalFeatureOption.findByPk(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Registro não encontrado' });

      await existing.update(updates);
      res.json({ success: true, data: existing });
    } catch (error) {
      console.error('Erro ao atualizar opção adicional da ordem de produção:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Deleta uma opção adicional
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const existing = await ProductionOrderItemAdditionalFeatureOption.findByPk(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Registro não encontrado' });

      await existing.destroy();
      res.json({ success: true, message: 'Registro removido com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar opção adicional da ordem de produção:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }
}

export default ProductionOrderItemAdditionalFeatureOptionController;
