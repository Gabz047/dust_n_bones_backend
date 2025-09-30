import { v4 as uuidv4 } from 'uuid';
import { sequelize, BoxItem, Box, OrderItem, Item, ItemFeature, FeatureOption, User, MovementLogEntityItem, MovementLogEntity, Stock, StockItem, Feature } from '../models/index.js';

class BoxItemController {

  // ===== CRIAR MÚLTIPLOS BOXITEMS =====
  static async createBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const items = req.body;
      const createdItems = [];
      const boxIdsSet = new Set();

      for (const data of items) {
        const { boxId, orderItemId, itemId, itemFeatureId, featureOptionId, quantity = 1, userId } = data;

        if (!boxId || !orderItemId || !itemId || !userId || !featureOptionId) {
          throw new Error('Campos obrigatórios ausentes');
        }

        const [box, orderItem, item, featureOption, user] = await Promise.all([
          Box.findByPk(boxId, { transaction }),
          OrderItem.findByPk(orderItemId, { transaction }),
          Item.findByPk(itemId, { transaction }),
          FeatureOption.findByPk(featureOptionId, { transaction }),
          User.findByPk(userId, { transaction })
        ]);

        if (!box) throw new Error(`Box ${boxId} não encontrado`);
        if (!orderItem) throw new Error(`OrderItem ${orderItemId} não encontrado`);
        if (!item) throw new Error(`Item ${itemId} não encontrado`);
        if (!featureOption) throw new Error(`FeatureOption ${featureOptionId} não encontrado`);
        if (!user) throw new Error(`User ${userId} não encontrado`);

        // Stock e StockItem
        let stock = await Stock.findOne({ where: { itemId }, transaction });
        if (!stock) stock = await Stock.create({ id: uuidv4(), itemId, quantity: 0 }, { transaction });

        let stockItem = await StockItem.findOne({ where: { itemId, itemFeatureId, featureOptionId }, transaction });
        if (!stockItem) {
          stockItem = await StockItem.create({ id: uuidv4(), stockId: stock.id, itemId, itemFeatureId, featureOptionId, quantity: 0 }, { transaction });
        }

        if (quantity > stockItem.quantity) throw new Error(`Estoque insuficiente para ${item.name} (${featureOption.name})`);

        // Criar BoxItem
        const boxItem = await BoxItem.create({
          id: uuidv4(),
          boxId,
          orderItemId,
          itemId,
          itemFeatureId: itemFeatureId || null,
          featureOptionId,
          quantity,
          userId
        }, { transaction });

        await stockItem.update({ quantity: stockItem.quantity - quantity }, { transaction });

        const movementLog = await MovementLogEntity.findOne({
          where: { entity: 'caixa', entityId: boxId },
          order: [['createdAt', 'DESC']],
          transaction
        });
        if (movementLog) {
          await MovementLogEntityItem.create({
            id: uuidv4(),
            movementLogEntityId: movementLog.id,
            entity: 'caixa',
            entityId: boxItem.id,
            quantity
          }, { transaction });
        }

        createdItems.push(boxItem);
        boxIdsSet.add(boxId);
      }

      for (const boxId of boxIdsSet) {
        const totalQty = await BoxItem.sum('quantity', { where: { boxId }, transaction });
        await Box.update({ totalQuantity: totalQty }, { where: { id: boxId }, transaction });
      }

      await transaction.commit();

      // Adicionar remainingQuantity considerando todas as caixas do pedido
      const result = [];
      for (const boxItem of createdItems) {
        const orderItem = await OrderItem.findByPk(boxItem.orderItemId);
        const sumAllBoxes = await BoxItem.sum('quantity', {
          where: { orderItemId: boxItem.orderItemId, featureOptionId: boxItem.featureOptionId }
        });
        result.push({ ...boxItem.toJSON(), remainingQuantity: orderItem.quantity - sumAllBoxes });
      }

      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar BoxItems:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===== ATUALIZAR MÚLTIPLOS BOXITEMS =====
  static async updateBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const updates = req.body;
      const updatedItems = [];
      const boxIdsSet = new Set();

      for (const data of updates) {
        const { id, quantity, ...fields } = data;
        const boxItem = await BoxItem.findByPk(id, { transaction });
        if (!boxItem) throw new Error(`BoxItem ${id} não encontrado`);

        const stockItem = await StockItem.findOne({
          where: { itemId: boxItem.itemId, itemFeatureId: boxItem.itemFeatureId, featureOptionId: boxItem.featureOptionId },
          transaction
        });
        if (!stockItem) throw new Error(`StockItem não encontrado para o BoxItem ${id}`);

        const delta = quantity - boxItem.quantity;
        if (delta > 0 && delta > stockItem.quantity) throw new Error(`Estoque insuficiente para aumentar BoxItem ${id}`);

        await boxItem.update({ quantity, ...fields }, { transaction });
        await stockItem.update({ quantity: stockItem.quantity - delta }, { transaction });

        const movementLog = await MovementLogEntity.findOne({
          where: { entity: 'caixa', entityId: boxItem.boxId },
          order: [['createdAt', 'DESC']],
          transaction
        });
        if (movementLog) {
          await MovementLogEntityItem.create({
            id: uuidv4(),
            movementLogEntityId: movementLog.id,
            entity: 'caixa',
            entityId: boxItem.id,
            quantity: delta
          }, { transaction });
        }

        updatedItems.push(boxItem);
        boxIdsSet.add(boxItem.boxId);
      }

      for (const boxId of boxIdsSet) {
        const totalQty = await BoxItem.sum('quantity', { where: { boxId }, transaction });
        await Box.update({ totalQuantity: totalQty }, { where: { id: boxId }, transaction });
      }

      await transaction.commit();

      const result = [];
      for (const boxItem of updatedItems) {
        const orderItem = await OrderItem.findByPk(boxItem.orderItemId);
        const sumAllBoxes = await BoxItem.sum('quantity', {
          where: { orderItemId: boxItem.orderItemId, featureOptionId: boxItem.featureOptionId }
        });
        result.push({ ...boxItem.toJSON(), remainingQuantity: orderItem.quantity - sumAllBoxes });
      }

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao atualizar BoxItems:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===== DELETAR MÚLTIPLOS BOXITEMS =====
  static async deleteBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ success: false, message: 'Nenhum ID enviado para exclusão' });

      const boxItems = await BoxItem.findAll({ where: { id: ids }, transaction });
      if (boxItems.length !== ids.length) return res.status(404).json({ success: false, message: 'Um ou mais BoxItems não encontrados' });

      const boxIdsSet = new Set();
      for (const bi of boxItems) {
        const stockItem = await StockItem.findOne({ where: { itemId: bi.itemId, itemFeatureId: bi.itemFeatureId, featureOptionId: bi.featureOptionId }, transaction });
        if (stockItem) await stockItem.update({ quantity: stockItem.quantity + bi.quantity }, { transaction });

        const movementLog = await MovementLogEntity.findOne({ where: { entity: 'caixa', entityId: bi.boxId }, order: [['createdAt', 'DESC']], transaction });
        if (movementLog) {
          await MovementLogEntityItem.create({ id: uuidv4(), movementLogEntityId: movementLog.id, entity: 'caixa', entityId: bi.id, quantity: -bi.quantity }, { transaction });
        }

        boxIdsSet.add(bi.boxId);
      }

      await BoxItem.destroy({ where: { id: ids }, transaction });

      for (const boxId of boxIdsSet) {
        const totalQty = await BoxItem.sum('quantity', { where: { boxId }, transaction });
        await Box.update({ totalQuantity: totalQty }, { where: { id: boxId }, transaction });
      }

      // Retornar remainingQuantity atualizado considerando todas as caixas
      const result = [];
      for (const bi of boxItems) {
        const orderItem = await OrderItem.findByPk(bi.orderItemId);
        const sumAllBoxes = await BoxItem.sum('quantity', {
          where: { orderItemId: bi.orderItemId, featureOptionId: bi.featureOptionId }
        });
        result.push({ ...bi.toJSON(), remainingQuantity: orderItem.quantity - sumAllBoxes });
      }

      await transaction.commit();
      return res.status(200).json({ success: true, message: `${ids.length} BoxItems removidos com sucesso`, data: result });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao deletar BoxItems:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===== LISTAR TODOS =====
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

      const result = [];
      for (const boxItem of items) {
        const orderItem = await OrderItem.findByPk(boxItem.orderItemId);
        const sumAllBoxes = await BoxItem.sum('quantity', {
          where: { orderItemId: boxItem.orderItemId, featureOptionId: boxItem.featureOptionId }
        });
        result.push({ ...boxItem.toJSON(), remainingQuantity: orderItem.quantity - sumAllBoxes });
      }

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Erro ao listar BoxItems:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===== GET POR ID =====
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const boxItem = await BoxItem.findByPk(id, {
        include: [
          { model: Box, as: 'box' },
          { model: OrderItem, as: 'orderItem' },
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' },
          { model: User, as: 'user' }
        ]
      });

      if (!boxItem) return res.status(404).json({ success: false, message: 'BoxItem não encontrado' });

      const orderItem = await OrderItem.findByPk(boxItem.orderItemId);
      const sumAllBoxes = await BoxItem.sum('quantity', {
        where: { orderItemId: boxItem.orderItemId, featureOptionId: boxItem.featureOptionId }
      });

      return res.json({ success: true, data: { ...boxItem.toJSON(), remainingQuantity: orderItem.quantity - sumAllBoxes } });
    } catch (error) {
      console.error('Erro ao buscar BoxItem por ID:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===== FILTROS SIMPLES =====
static async getByBox(req, res) {
  try {
    const { boxId } = req.params;

    const items = await BoxItem.findAll({
      where: { boxId },
      attributes: ['id', 'quantity', 'featureOptionId', 'orderItemId'], // apenas o necessário do BoxItem
      include: [
        {
          model: OrderItem,
          as: 'orderItem',
          attributes: ['id', 'quantity'], // só o que importa
          include: [
            {
              model: Item,
              as: 'item',
              attributes: ['id', 'weight', 'price', 'name'], // PSE/weight, price e nome
            },
            {
              model: ItemFeature,
              as: 'itemFeature',
              attributes: ['id', 'featureId'],
              include: [
                {
                  model: Feature,
                  as: 'feature',
                  attributes: ['id', 'name'], // nome da feature
                },
              ],
            },
            {
              model: FeatureOption,
              as: 'featureOption',
              attributes: ['id', 'name'], // nome da opção
            },
            {
              model: BoxItem,
              as: 'boxItems', // para somar quantidade em outras caixas
              attributes: ['quantity', 'featureOptionId'],
            },
          ],
        },
      ],
    });

    const result = items.map((boxItem) => {
      const orderItem = boxItem.orderItem;

      const sumAllBoxes = orderItem?.boxItems
        ?.filter(bi => bi.featureOptionId === boxItem.featureOptionId)
        .reduce((acc, bi) => acc + (bi.quantity || 0), 0) || 0;
      console.log(boxItem.orderItem.item)
      return {
        id: boxItem.id,
        quantity: boxItem.quantity,
        featureOptionId: boxItem.featureOptionId,
        orderItemId: boxItem.orderItemId,
        orderItemQuantity: boxItem.orderItem.quantity,
        remainingQuantity: orderItem ? orderItem.quantity - sumAllBoxes : 0,
        weight: orderItem?.item?.weight || 0,
        price: orderItem?.item?.price || 0,
        itemName: orderItem?.item?.name || 'N/A',
        featureName: orderItem?.itemFeature?.feature?.name || 'N/A',
        featureOptionName: orderItem?.featureOption?.name || 'N/A',
      };
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Erro ao buscar BoxItems por boxId:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}



  // ===== Outros filtros similares =====
  // getByOrderItem, getByItem, getByFeatureItem, getByFeatureOption, getByUser, getByDate
  // Todos seguem a mesma lógica: somar todos os BoxItems do mesmo orderItemId + featureOptionId

  static async getByOrderItem(req, res) {
    try {
      const { orderItemId } = req.params;

      // Busca o OrderItem uma única vez
      const orderItem = await OrderItem.findByPk(orderItemId, {
        attributes: ['id', 'quantity']
      });
      if (!orderItem) {
        return res.status(404).json({ success: false, message: 'OrderItem não encontrado' });
      }

      // Busca todos os BoxItems do OrderItem em uma única consulta
      const items = await BoxItem.findAll({
        where: { orderItemId },
        order: [['createdAt', 'DESC']],
        raw: true // retorna objetos simples
      });

      if (!items.length) {
        return res.json({ success: true, data: [] });
      }

      // Calcula a soma por featureOptionId em uma única consulta agrupada
      const sums = await BoxItem.findAll({
        where: { orderItemId },
        attributes: [
          'featureOptionId',
          [sequelize.fn('SUM', sequelize.col('quantity')), 'sumQty']
        ],
        group: ['featureOptionId'],
        raw: true
      });

      const sumMap = Object.fromEntries(
        sums.map(s => [String(s.featureOptionId), Number(s.sumQty)])
      );

      // Monta o resultado no mesmo formato, adicionando remainingQuantity
      const result = items.map(row => ({
        ...row,
        remainingQuantity: orderItem.quantity - (sumMap[String(row.featureOptionId)] || 0)
      }));

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Erro ao buscar BoxItems por orderItemId:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getByItem(req, res) {
    try {
      const { itemId } = req.params;
      const items = await BoxItem.findAll({ where: { itemId } });

      const result = [];
      for (const boxItem of items) {
        const orderItem = await OrderItem.findByPk(boxItem.orderItemId);
        const sumAllBoxes = await BoxItem.sum('quantity', {
          where: { orderItemId: boxItem.orderItemId, featureOptionId: boxItem.featureOptionId }
        });
        result.push({ ...boxItem.toJSON(), remainingQuantity: orderItem.quantity - sumAllBoxes });
      }

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Erro ao buscar BoxItems por itemId:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getByFeatureItem(req, res) {
    try {
      const { itemFeatureId } = req.params;
      const items = await BoxItem.findAll({ where: { itemFeatureId } });

      const result = [];
      for (const boxItem of items) {
        const orderItem = await OrderItem.findByPk(boxItem.orderItemId);
        const sumAllBoxes = await BoxItem.sum('quantity', {
          where: { orderItemId: boxItem.orderItemId, featureOptionId: boxItem.featureOptionId }
        });
        result.push({ ...boxItem.toJSON(), remainingQuantity: orderItem.quantity - sumAllBoxes });
      }

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Erro ao buscar BoxItems por itemFeatureId:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getByFeatureOption(req, res) {
    try {
      const { featureOptionId } = req.params;
      const items = await BoxItem.findAll({ where: { featureOptionId } });

      const result = [];
      for (const boxItem of items) {
        const orderItem = await OrderItem.findByPk(boxItem.orderItemId);
        const sumAllBoxes = await BoxItem.sum('quantity', {
          where: { orderItemId: boxItem.orderItemId, featureOptionId: boxItem.featureOptionId }
        });
        result.push({ ...boxItem.toJSON(), remainingQuantity: orderItem.quantity - sumAllBoxes });
      }

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Erro ao buscar BoxItems por featureOptionId:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getByUser(req, res) {
    try {
      const { userId } = req.params;
      const items = await BoxItem.findAll({ where: { userId } });

      const result = [];
      for (const boxItem of items) {
        const orderItem = await OrderItem.findByPk(boxItem.orderItemId);
        const sumAllBoxes = await BoxItem.sum('quantity', {
          where: { orderItemId: boxItem.orderItemId, featureOptionId: boxItem.featureOptionId }
        });
        result.push({ ...boxItem.toJSON(), remainingQuantity: orderItem.quantity - sumAllBoxes });
      }

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Erro ao buscar BoxItems por userId:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getByDate(req, res) {
    try {
      const { date } = req.params;
      const items = await BoxItem.findAll({
        where: sequelize.where(sequelize.fn('DATE', sequelize.col('createdAt')), date)
      });

      const result = [];
      for (const boxItem of items) {
        const orderItem = await OrderItem.findByPk(boxItem.orderItemId);
        const sumAllBoxes = await BoxItem.sum('quantity', {
          where: { orderItemId: boxItem.orderItemId, featureOptionId: boxItem.featureOptionId }
        });
        result.push({ ...boxItem.toJSON(), remainingQuantity: orderItem.quantity - sumAllBoxes });
      }

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Erro ao buscar BoxItems por data:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

}

export default BoxItemController;
