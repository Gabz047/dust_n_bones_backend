import { ProductionOrderItem, ProductionOrder, Item, ItemFeature, FeatureOption, Project, OrderItem, sequelize } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

class ProductionOrderItemController {
  // Criar item da OP
  static async create(req, res) {
    try {
      const { productionOrderId, itemId, itemFeatureId, featureOptionId, quantity } = req.body;

      const item = await ProductionOrderItem.create({
        id: uuidv4(),
        productionOrderId,
        itemId,
        itemFeatureId: itemFeatureId || null,
        featureOptionId: featureOptionId || null,
        quantity
      });

      const result = await ProductionOrderItem.findByPk(item.id, {
        include: [
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' },
          { model: ProductionOrder, as: 'productionOrder' },
        ]
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      console.error('Erro ao criar item da O.P.:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

    // Criar vários itens em batch
  static async createBatch(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum item enviado para criação em lote' });
    }

    // Extrair IDs
    const itemIds = items.map(i => i.itemId);
    const featureIds = items.map(i => i.itemFeatureId).filter(Boolean);
    const optionIds = items.map(i => i.featureOptionId).filter(Boolean);

    // Buscar todos de uma vez (evita N+1)
    const products = await Item.findAll({ where: { id: itemIds }, transaction });
    const features = featureIds.length ? await ItemFeature.findAll({ where: { id: featureIds }, transaction }) : [];
    const options = optionIds.length ? await FeatureOption.findAll({ where: { id: optionIds }, transaction }) : [];

    // Criar maps para validação rápida
    const productMap = new Map(products.map(p => [p.id, p]));
    const featureMap = new Map(features.map(f => [f.id, f]));
    const optionMap = new Map(options.map(o => [o.id, o]));

    // Validar itens
    for (const item of items) {
      if (!productMap.has(item.itemId)) throw new Error(`Item ${item.itemId} não encontrado`);
      if (item.itemFeatureId && !featureMap.has(item.itemFeatureId)) throw new Error(`Característica ${item.itemFeatureId} não encontrada`);
      if (item.featureOptionId && !optionMap.has(item.featureOptionId)) throw new Error(`Opção ${item.featureOptionId} não encontrada`);
    }

    // Preparar dados para bulkCreate
    const itemsWithIds = items.map(item => ({
      id: uuidv4(),
      productionOrderId: item.productionOrderId,
      itemId: item.itemId,
      itemFeatureId: item.itemFeatureId || null,
      featureOptionId: item.featureOptionId || null,
      quantity: item.quantity || 1
    }));

    const createdItems = await ProductionOrderItem.bulkCreate(itemsWithIds, { transaction });
    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: `${createdItems.length} itens criados com sucesso`,
      data: createdItems
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao criar itens do pedido em lote:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}

// Atualizar vários itens em batch (otimizado)
static async updateBatch(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const updates = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum item enviado para atualização em lote' });
    }

    // Extrair IDs e buscar todos de uma vez
    const ids = updates.map(u => u.id);
    const existingItems = await ProductionOrderItem.findAll({ where: { id: ids }, transaction });

    if (existingItems.length !== ids.length) {
      return res.status(404).json({ success: false, message: 'Um ou mais IDs não foram encontrados para atualização' });
    }

    // Atualizar cada item em paralelo, mas dentro da mesma transação
    await Promise.all(updates.map(update => {
      return ProductionOrderItem.update(update, { where: { id: update.id }, transaction });
    }));

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: `${updates.length} itens atualizados com sucesso`,
      data: updates
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao atualizar itens do pedido em lote:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}

  // Deletar vários itens em batch
  static async deleteBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { ids } = req.body;
      console.log(ids)
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Nenhum ID enviado para exclusão em lote' });
      }

      const existingItems = await ProductionOrderItem.findAll({ where: { id: ids }, transaction });
      if (existingItems.length !== ids.length) {
        return res.status(404).json({ success: false, message: 'Um ou mais IDs não foram encontrados para exclusão' });
      }

      await ProductionOrderItem.destroy({ where: { id: ids }, transaction });
      await transaction.commit();

      return res.status(200).json({ success: true, message: `${ids.length} itens deletados com sucesso` });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao deletar itens do pedido em lote:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Buscar itens por OP
  static async getByProductionOrder(req, res) {
    try {
      const { id } = req.params;
      const items = await ProductionOrderItem.findAll({
        where: { productionOrderId: id },
        include: [
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' },
          { model: ProductionOrder, as: 'productionOrder' },
        ]
      });

      res.json({ success: true, data: items });
    } catch (error) {
      console.error('Erro ao buscar itens por OP:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Buscar itens por projeto
  static async getByProject(req, res) {
    try {
      const { id } = req.params;

      const items = await ProductionOrderItem.findAll({
        include: [
          {
            model: ProductionOrder,
            as: 'productionOrder',
            include: [
              {
                model: Project,
                as: 'project',
                where: { id } // filtra pelo projeto
              }
            ]
          },
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' },
        ]
      });

      res.json({ success: true, data: items });
    } catch (error) {
      console.error('Erro ao buscar itens por projeto:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Buscar itens por item
  static async getByItem(req, res) {
    try {
      const { id } = req.params;
      const items = await ProductionOrderItem.findAll({
        where: { itemId: id },
        include: [
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' },
          { model: ProductionOrder, as: 'productionOrder' },

        ]
      });

      res.json({ success: true, data: items });
    } catch (error) {
      console.error('Erro ao buscar itens por item:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Buscar itens por feature
  static async getByFeature(req, res) {
    try {
      const { id } = req.params;
      const items = await ProductionOrderItem.findAll({
        where: { itemFeatureId: id },
        include: [
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' },
          { model: ProductionOrder, as: 'productionOrder' },
        ]
      });

      res.json({ success: true, data: items });
    } catch (error) {
      console.error('Erro ao buscar itens por feature:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

   static async getByOrderItem(req, res) {
    try {
      const { id } = req.params;
      const items = await ProductionOrderItem.findAll({
        where: { orderItemId: id },
        include: [
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' },
          { model: ProductionOrder, as: 'productionOrder' },
        ]
      });

      res.json({ success: true, data: items });
    } catch (error) {
      console.error('Erro ao buscar itens por item do pedido:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Buscar itens com filtros
  static async getAll(req, res) {
    try {
      const { productionOrderId, itemId, itemFeatureId, featureOptionId } = req.query;
      const where = {};
      if (productionOrderId) where.productionOrderId = productionOrderId;
      if (itemId) where.itemId = itemId;
      if (itemFeatureId) where.itemFeatureId = itemFeatureId;
      if (featureOptionId) where.featureOptionId = featureOptionId;
  

      const items = await ProductionOrderItem.findAll({
        where,
        include: [
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' },
          { model: ProductionOrder, as: 'productionOrder' },
          
        ]
      });

      res.json({ success: true, data: items });
    } catch (error) {
      console.error('Erro ao buscar itens da O.P.:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Buscar item por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const item = await ProductionOrderItem.findByPk(id, {
        include: [
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' },
          { model: ProductionOrder, as: 'productionOrder' }
        ]
      });

      if (!item) return res.status(404).json({ success: false, message: 'Item da O.P. não encontrado' });
      res.json({ success: true, data: item });
    } catch (error) {
      console.error('Erro ao buscar item da O.P.:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Atualizar item da OP
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const item = await ProductionOrderItem.findByPk(id);
      if (!item) return res.status(404).json({ success: false, message: 'Item da O.P. não encontrado' });

      await item.update(updates);
      res.json({ success: true, data: item });
    } catch (error) {
      console.error('Erro ao atualizar item da O.P.:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Deletar item da OP
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const item = await ProductionOrderItem.findByPk(id);
      if (!item) return res.status(404).json({ success: false, message: 'Item da O.P. não encontrado' });

      await item.destroy();
      res.json({ success: true, message: 'Item da O.P. removido com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar item da O.P.:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }
}

export default ProductionOrderItemController;
