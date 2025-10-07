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

      for (const item of items) {
        const { itemId, itemFeatureId, featureOptionId } = item;

        const product = await Item.findByPk(itemId);
        if (!product) throw new Error(`Item ${itemId} não encontrado`);

        if (itemFeatureId) {
          const feature = await ItemFeature.findByPk(itemFeatureId);
          if (!feature) throw new Error(`Característica ${itemFeatureId} não encontrada`);
        }

        if (featureOptionId) {
          const option = await FeatureOption.findByPk(featureOptionId);
          if (!option) throw new Error(`Opção ${featureOptionId} não encontrada`);
        }
      }

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

  // Atualizar vários itens em batch
  static async updateBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const updates = req.body;
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ success: false, message: 'Nenhum item enviado para atualização em lote' });
      }

      const updatedItems = [];
      for (const item of updates) {
        const { id, ...fields } = item;
        if (!id) throw new Error('ID do item é obrigatório para atualização');

        await ProductionOrderItem.update(item, { where: { id }, transaction });
        updatedItems.push(item);
      }

      await transaction.commit();
      return res.status(200).json({
        success: true,
        message: `${updatedItems.length} itens atualizados com sucesso`,
        data: updatedItems
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
