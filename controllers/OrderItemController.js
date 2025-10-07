import {
  OrderItem,
  Order,
  Item,
  ItemFeature,
  FeatureOption,
  sequelize,
  Project,
  ProductionOrder,
  User
} from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import ProductionOrderStatus from '../models/ProductionOrderStatus.js';
import { Op } from 'sequelize';
class OrderItemController {

  // Cria um único item de pedido
 // dentro do OrderItemController
static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { orderId, itemId, itemFeatureId, featureOptionId, quantity } = req.body;

      // validações básicas
      const order = await Order.findByPk(orderId);
      if (!order) return res.status(400).json({ success: false, message: 'Pedido não encontrado' });

      const item = await Item.findByPk(itemId);
      if (!item) return res.status(400).json({ success: false, message: 'Item não encontrado' });

      if (itemFeatureId) {
        const feature = await ItemFeature.findByPk(itemFeatureId);
        if (!feature) return res.status(400).json({ success: false, message: 'Característica do item não encontrada' });
      }

      if (featureOptionId) {
        const option = await FeatureOption.findByPk(featureOptionId);
        if (!option) return res.status(400).json({ success: false, message: 'Opção de característica não encontrada' });
      }

      // 🔍 Verifica se já existe um item igual no pedido (mesma combinação base)
      const existingItem = await OrderItem.findOne({
        where: { orderId, itemId, itemFeatureId: itemFeatureId || null, featureOptionId: featureOptionId || null },
        transaction
      });

      let orderItem;
      if (existingItem) {
        // já existe → só soma quantidade
        await existingItem.update({ quantity: existingItem.quantity + (quantity || 1) }, { transaction });
        orderItem = existingItem;
      } else {
        // não existe → cria novo
        orderItem = await OrderItem.create({
          id: uuidv4(),
          orderId,
          itemId,
          itemFeatureId: itemFeatureId || null,
          featureOptionId: featureOptionId || null,
          quantity: quantity || 1
        }, { transaction });
      }

      await transaction.commit();
      return res.status(201).json({ success: true, data: orderItem });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar item do pedido:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Cria múltiplos itens de pedido
  static async createBatch(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const items = req.body; 
    const createdItems = [];

    // 1️⃣ Buscar todos os itens já existentes de uma vez
    const existingItems = await OrderItem.findAll({
      where: {
        [Op.or]: items.map(i => ({
          orderId: i.orderId,
          itemId: i.itemId,
          itemFeatureId: i.itemFeatureId || null,
          featureOptionId: i.featureOptionId || null
        }))
      },
      transaction
    });

    // 2️⃣ Map para acesso rápido
    const existingMap = new Map();
    for (const ei of existingItems) {
      const key = `${ei.orderId}-${ei.itemId}-${ei.itemFeatureId || ''}-${ei.featureOptionId || ''}`;
      existingMap.set(key, ei);
    }

    // 3️⃣ Separar itens novos e atualizar quantidade dos existentes
    const itemsToInsert = [];

    for (const i of items) {
      const key = `${i.orderId}-${i.itemId}-${i.itemFeatureId || ''}-${i.featureOptionId || ''}`;
      const existing = existingMap.get(key);

      if (existing) {
        // soma quantidade
        existing.quantity += i.quantity || 1;
        await existing.save({ transaction });
        createdItems.push(existing);
      } else {
        itemsToInsert.push({
          id: uuidv4(),
          orderId: i.orderId,
          itemId: i.itemId,
          itemFeatureId: i.itemFeatureId || null,
          featureOptionId: i.featureOptionId || null,
          quantity: i.quantity || 1
        });
      }
    }

    // 4️⃣ Bulk create dos novos itens
    if (itemsToInsert.length) {
      const newItems = await OrderItem.bulkCreate(itemsToInsert, { transaction });
      createdItems.push(...newItems);
    }

    await transaction.commit();
    return res.status(201).json({ success: true, data: createdItems });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro no createBatch de itens do pedido:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}



// Atualiza múltiplos itens
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

      const existing = await OrderItem.findByPk(id, { transaction });
      if (!existing) throw new Error(`Item com ID ${id} não encontrado`);

      // Busca o pedido com o projeto e a ordem de produção
      const order = await Order.findByPk(existing.orderId, {
        include: [
          {
            model: Project,
            as: 'project',
            include: [
              {
                model: ProductionOrder,
                as: 'productionOrder',
                include: [{ model: ProductionOrderStatus, as: 'status' }]
              }
            ]
          }
        ],
        transaction
      });

      const productionOrder = order?.project?.productionOrder;
      console.log(productionOrder)
      if (productionOrder) {
        // pega o último status pela data mais recente
      const lastStatus = productionOrder.status?.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )[0];

        if (lastStatus?.status === 'Finalizada') {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Não é possível atualizar o item ${id}: a ordem de produção já está finalizada.`
          });
        }
      }

      await existing.update(fields, { transaction });
      updatedItems.push(existing);
    }

    await transaction.commit();
    return res.status(200).json({ success: true, message: `${updatedItems.length} itens atualizados com sucesso`, data: updatedItems });

  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao atualizar itens do pedido em lote:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}


  // Deleta múltiplos itens
  static async deleteBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Nenhum ID enviado para exclusão em lote' });
      }

      const itemsWithProjects = await OrderItem.findAll({
        where: { id: ids },
        include: [
          {
            model: Order,
            as: 'order',
            include: [
              {
                model: Project,
                as: 'project',
                include: [{ model: ProductionOrder, as: 'productionOrder' }]
              }
            ]
          }
        ],
        transaction
      });

      if (itemsWithProjects.length !== ids.length) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Um ou mais IDs não foram encontrados para exclusão' });
      }

      const hasProductionOrder = itemsWithProjects.some(item => item.order?.project?.productionOrder);
      if (hasProductionOrder) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Não é possível deletar: um ou mais itens pertencem a projetos com ordem de produção ativa.'
        });
      }

      await OrderItem.destroy({ where: { id: ids }, transaction });
      await transaction.commit();
      return res.status(200).json({ success: true, message: `${ids.length} itens deletados com sucesso` });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao deletar itens do pedido em lote:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Consultas simples
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

  static async getByProject(req, res) {
    try {
      const { id } = req.params;
      const rows = await OrderItem.findAll({
        include: [
          { model: Order, as: 'order', where: { projectId: id } },
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' }
        ]
      });
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Erro ao buscar itens por projeto:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getByOrder(req, res) {
    try {
      const { id } = req.params;
      const rows = await OrderItem.findAll({
        where: { orderId: id },
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

  static async getByOrderIds(req, res) {
    console.log('================================================ORDER IDS===================================', req.body, req.query);
    try {
      let orderIds = req.body.orderIds || req.query.orderIds;

      if (!orderIds || (Array.isArray(orderIds) && orderIds.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'É necessário enviar um array de orderIds.',
        });
      }

      orderIds = orderIds.map(id => id);

      const orderItems = await OrderItem.findAll({
        where: { orderId:  orderIds  },
        include: [
          { model: Order, as: 'order' },
          { model: Item, as: 'item' },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' },
        ],
        order: [['createdAt', 'DESC']],
      });

      if (!orderItems.length) {
        return res.status(404).json({
          success: false,
          message: 'Nenhum OrderItem encontrado para os orderIds informados.',
        });
      }

      return res.json({ success: true, data: orderItems });
    } catch (error) {
      console.error('Erro ao buscar OrderItems por múltiplos orderIds:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor',
      });
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

      const existing = await OrderItem.findByPk(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Registro não encontrado' });
      }

      await existing.update(updates);
      res.json({ success: true, data: existing });

    } catch (error) {
      console.error('Erro ao atualizar item de pedido:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const existing = await OrderItem.findByPk(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Registro não encontrado' });
      }

      await existing.destroy();
      res.json({ success: true, message: 'Registro removido com sucesso' });

    } catch (error) {
      console.error('Erro ao deletar item de pedido:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

}

export default OrderItemController;
