// controllers/ProductionOrderItemAdditionalFeatureOptionController.js
import { sequelize, ProductionOrder, Item, ItemFeature, FeatureOption, ProductionOrderItemAdditionalFeatureOption, Feature } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

class ProductionOrderItemAdditionalFeatureOptionController {

  // Cria uma opção adicional de item da ordem de produção
// Cria uma opção adicional de item da ordem de produção
static async create(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { productionOrderId, itemId, itemFeatureId, featureOptionId } = req.body;

    // 🔍 Verifica se já existe exatamente igual
    const existing = await ProductionOrderItemAdditionalFeatureOption.findOne({
      where: {
        productionOrderId,
        itemId,
        itemFeatureId,
        featureOptionId
      },
      transaction
    });

    let record;
    if (existing) {
      // Se já existir, não cria um novo, apenas retorna o existente
      record = existing;
    } else {
      // Cria um novo se for diferente em qualquer característica
      record = await ProductionOrderItemAdditionalFeatureOption.create({
        id: uuidv4(),
        productionOrderId,
        itemId,
        itemFeatureId,
        featureOptionId
      }, { transaction });
    }

    await transaction.commit();
    return res.status(201).json({ success: true, data: record });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao criar opção adicional da ordem de produção:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}

// Criar várias opções adicionais em batch
static async createBatch(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum item enviado para criação em lote' });
    }

    const createdOrExisting = [];

    for (const item of items) {
      const { productionOrderId, itemId, itemFeatureId, featureOptionId } = item;

      const existing = await ProductionOrderItemAdditionalFeatureOption.findOne({
        where: { productionOrderId, itemId, itemFeatureId, featureOptionId },
        transaction
      });

      if (existing) {
        createdOrExisting.push(existing);
      } else {
        const record = await ProductionOrderItemAdditionalFeatureOption.create({
          id: uuidv4(),
          productionOrderId,
          itemId,
          itemFeatureId,
          featureOptionId
        }, { transaction });
        createdOrExisting.push(record);
      }
    }

    await transaction.commit();
    return res.status(201).json({
      success: true,
      message: `${createdOrExisting.length} registros processados com sucesso`,
      data: createdOrExisting
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao criar adicionais em lote:', error);
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
    { 
      model: ItemFeature, 
      as: 'itemFeature',
      include: [
        { model: Feature, as: 'feature' } // 🔹 Aqui está o segredo
      ]
    },
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
  where: { productionOrderId: productionOrderId, itemFeatureId: itemFeatureId },
  include: [
    { model: Item, as: 'item' },
    { 
      model: ItemFeature, 
      as: 'itemFeature',
      include: [
        { model: Feature, as: 'feature' } // 🔹 Aqui está o segredo
      ]
    },
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
