import { v4 as uuidv4 } from 'uuid';
import { sequelize, BoxItem, Box, OrderItem, Item, ItemFeature, FeatureOption, User, MovementLogEntityItem } from '../models/index.js';

class BoxItemController {

  // Cria múltiplos BoxItems
  static async createBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const items = req.body; // [{ boxId, orderItemId, itemId, itemFeatureId, featureOptionId, quantity, userId, movementLogEntityId }]
      const createdItems = [];

      for (const data of items) {
        const { boxId, orderItemId, itemId, itemFeatureId, featureOptionId, quantity, userId, movementLogEntityId } = data;

        // Validações
        if (!await Box.findByPk(boxId, { transaction })) throw new Error(`Box ${boxId} não encontrado`);
        if (!await OrderItem.findByPk(orderItemId, { transaction })) throw new Error(`OrderItem ${orderItemId} não encontrado`);
        if (!await Item.findByPk(itemId, { transaction })) throw new Error(`Item ${itemId} não encontrado`);
        if (itemFeatureId && !await ItemFeature.findByPk(itemFeatureId, { transaction })) throw new Error(`ItemFeature ${itemFeatureId} não encontrado`);
        if (featureOptionId && !await FeatureOption.findByPk(featureOptionId, { transaction })) throw new Error(`FeatureOption ${featureOptionId} não encontrado`);
        if (!await User.findByPk(userId, { transaction })) throw new Error(`User ${userId} não encontrado`);
        if (!movementLogEntityId) throw new Error('movementLogEntityId é obrigatório');

        // Cria BoxItem
        const boxItem = await BoxItem.create({
          id: uuidv4(),
          boxId,
          orderItemId,
          itemId,
          itemFeatureId: itemFeatureId || null,
          featureOptionId: featureOptionId || null,
          quantity: quantity || 1,
          userId
        }, { transaction });

        // Cria MovementLogEntityItem
        await MovementLogEntityItem.create({
          id: uuidv4(),
          movementLogEntityId,
          entity: 'caixa',
          entityId: boxItem.id,
          quantity: boxItem.quantity
        }, { transaction });

        createdItems.push(boxItem);
      }

      // Atualiza qtdTotal do box
      const boxIds = [...new Set(items.map(i => i.boxId))];
      for (const id of boxIds) {
        const boxItems = await BoxItem.findAll({ where: { boxId: id }, transaction });
        const totalQty = boxItems.reduce((sum, bi) => sum + bi.quantity, 0);
        await Box.update({ qtdTotal: totalQty }, { where: { id }, transaction });
      }

      await transaction.commit();
      return res.status(201).json({ success: true, data: createdItems });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar BoxItems em batch:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Atualiza múltiplos BoxItems
  static async updateBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const updates = req.body; // [{ id, quantity, userId, movementLogEntityId, ... }]
      const updatedItems = [];
      const boxIds = new Set();

      for (const data of updates) {
        const { id, movementLogEntityId, ...fields } = data;
        const boxItem = await BoxItem.findByPk(id, { transaction });
        if (!boxItem) throw new Error(`BoxItem ${id} não encontrado`);
        if (!movementLogEntityId) throw new Error('movementLogEntityId é obrigatório');

        const oldQuantity = boxItem.quantity;
        await boxItem.update(fields, { transaction });
        updatedItems.push(boxItem);
        boxIds.add(boxItem.boxId);

        // Cria MovementLogEntityItem
        await MovementLogEntityItem.create({
          id: uuidv4(),
          movementLogEntityId,
          entity: 'caixa',
          entityId: boxItem.id,
          quantity: boxItem.quantity - oldQuantity
        }, { transaction });
      }

      // Atualiza qtdTotal de cada box
      for (const boxId of boxIds) {
        const boxItems = await BoxItem.findAll({ where: { boxId }, transaction });
        const totalQty = boxItems.reduce((sum, bi) => sum + bi.quantity, 0);
        await Box.update({ qtdTotal: totalQty }, { where: { id: boxId }, transaction });
      }

      await transaction.commit();
      return res.status(200).json({ success: true, data: updatedItems });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao atualizar BoxItems em batch:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Deleta múltiplos BoxItems
  static async deleteBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { ids, movementLogEntityId } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: 'Nenhum ID enviado para exclusão' });
      if (!movementLogEntityId) throw new Error('movementLogEntityId é obrigatório');

      const boxItems = await BoxItem.findAll({ where: { id: ids }, transaction });
      if (boxItems.length !== ids.length) return res.status(404).json({ success: false, message: 'Um ou mais BoxItems não encontrados' });

      const boxIds = [...new Set(boxItems.map(bi => bi.boxId))];

      for (const bi of boxItems) {
        await MovementLogEntityItem.create({
          id: uuidv4(),
          movementLogEntityId,
          entity: 'caixa',
          entityId: bi.id,
          quantity: -bi.quantity
        }, { transaction });
      }

      await BoxItem.destroy({ where: { id: ids }, transaction });

      for (const boxId of boxIds) {
        const remainingItems = await BoxItem.findAll({ where: { boxId }, transaction });
        const totalQty = remainingItems.reduce((sum, bi) => sum + bi.quantity, 0);
        await Box.update({ qtdTotal: totalQty }, { where: { id: boxId }, transaction });
      }

      await transaction.commit();
      return res.status(200).json({ success: true, message: `${ids.length} BoxItems removidos com sucesso` });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao deletar BoxItems em batch:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Lista todos os BoxItems
  static async getAll(req, res) {
    try {
      const items = await BoxItem.findAll({
        include: [
          { model: Box, as: 'box' },
          { model: OrderItem, as: 'orderItem' },
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' },
          { model: User, as: 'user' }
        ],
        order: [['createdAt', 'DESC']]
      });
      return res.json({ success: true, data: items });
    } catch (error) {
      console.error('Erro ao listar BoxItems:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Busca por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const item = await BoxItem.findByPk(id, {
        include: [
          { model: Box, as: 'box' },
          { model: OrderItem, as: 'orderItem' },
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' },
          { model: User, as: 'user' }
        ]
      });
      if (!item) return res.status(404).json({ success: false, message: 'BoxItem não encontrado' });
      return res.json({ success: true, data: item });
    } catch (error) {
      console.error('Erro ao buscar BoxItem por ID:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Filtros
  static async getByOrderItem(req, res) {
    return this._filter('orderItemId', req.params.orderItemId, res);
  }

  static async getByBox(req, res) {
    return this._filter('boxId', req.params.boxId, res);
  }

  static async getByItem(req, res) {
    return this._filter('itemId', req.params.itemId, res);
  }

  static async getByFeatureItem(req, res) {
    return this._filter('itemFeatureId', req.params.itemFeatureId, res);
  }

  static async getByFeatureOption(req, res) {
    return this._filter('featureOptionId', req.params.featureOptionId, res);
  }

  static async getByUser(req, res) {
    return this._filter('userId', req.params.userId, res);
  }

  static async getByDate(req, res) {
    try {
      const { date } = req.params; // YYYY-MM-DD
      const items = await BoxItem.findAll({
        where: sequelize.where(sequelize.fn('DATE', sequelize.col('createdAt')), date),
        include: [
          { model: Box, as: 'box' },
          { model: OrderItem, as: 'orderItem' },
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' },
          { model: User, as: 'user' }
        ]
      });
      return res.json({ success: true, data: items });
    } catch (error) {
      console.error('Erro ao buscar BoxItems por data:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Função interna para filtros
  static async _filter(field, value, res) {
    try {
      const items = await BoxItem.findAll({
        where: { [field]: value },
        include: [
          { model: Box, as: 'box' },
          { model: OrderItem, as: 'orderItem' },
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' },
          { model: User, as: 'user' }
        ]
      });
      return res.json({ success: true, data: items });
    } catch (error) {
      console.error(`Erro ao filtrar BoxItems por ${field}:`, error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

}

export default BoxItemController;
