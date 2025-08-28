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

      const orderItem = await OrderItem.create({
        id: uuidv4(),
        orderId,
        itemId,
        itemFeatureId: itemFeatureId || null,
        featureOptionId,
        quantity: quantity || 1
      }, { transaction });

      await transaction.commit();
      return res.status(201).json({ success: true, data: orderItem });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar item do pedido:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async createBatch(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const items = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum item enviado para criação em lote'
        });
      }

      // Validação de todos os itens antes de criar
      for (const item of items) {
        const { orderId, itemId, itemFeatureId, featureOptionId } = item;

        const order = await Order.findByPk(orderId);
        if (!order) throw new Error(`Pedido ${orderId} não encontrado`);

        const product = await Item.findByPk(itemId);
        if (!product) throw new Error(`Item ${itemId} não encontrado`);

        if (itemFeatureId) {
          const feature = await ItemFeature.findByPk(itemFeatureId);
          if (!feature) throw new Error(`Característica ${itemFeatureId} não encontrada`);
        }

        const option = await FeatureOption.findByPk(featureOptionId);
        if (!option) throw new Error(`Opção ${featureOptionId} não encontrada`);
      }

      // Monta lista já com UUIDs
      const itemsWithIds = items.map((item) => ({
        id: uuidv4(),
        orderId: item.orderId,
        itemId: item.itemId,
        itemFeatureId: item.itemFeatureId || null,
        featureOptionId: item.featureOptionId,
        quantity: item.quantity || 1
      }));

      // Cria tudo de uma vez
      const createdItems = await OrderItem.bulkCreate(itemsWithIds, { transaction });

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: `${createdItems.length} itens criados com sucesso`,
        data: createdItems
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar itens do pedido em lote:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  static async updateBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const updates = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum item enviado para atualização em lote'
        });
      }

      const updatedItems = [];

      for (const item of updates) {
        const { id, ...fields } = item;

        // Verifica se o ID foi enviado
        if (!id) throw new Error('ID do item é obrigatório para atualização');

        // Busca o registro
        const existing = await OrderItem.findByPk(id, { transaction });
        if (!existing) throw new Error(`Item com ID ${id} não encontrado`);

        // Atualiza os campos
        await existing.update(fields, { transaction });
        updatedItems.push(existing);
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
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  static async deleteBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum ID enviado para exclusão em lote',
        });
      }

      // Verifica se todos os IDs existem antes de deletar
      const existingItems = await OrderItem.findAll({
        where: { id: ids },
        transaction,
      });

      if (existingItems.length !== ids.length) {
        return res.status(404).json({
          success: false,
          message: 'Um ou mais IDs não foram encontrados para exclusão',
        });
      }

      // Deleta todos os registros
      await OrderItem.destroy({
        where: { id: ids },
        transaction,
      });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: `${ids.length} itens deletados com sucesso`,
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao deletar itens do pedido em lote:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
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

  static async getByProject(req, res) {
    try {
      const { id } = req.params;

      // Busca todos os OrderItems cujo pedido pertence ao projeto
      const orderItems = await OrderItem.findAll({
        include: [
          {
            model: Order,
            as: 'order',
            where: { projectId: id },
            attributes: ['id', 'projectId']
          },
          { model: Item, as: 'item', attributes: ['id', 'name'] },
          { model: ItemFeature, as: 'itemFeature' },
          { model: FeatureOption, as: 'featureOption' }
        ],
        raw: true,
        nest: true,
      });

      // Retorna o array de orderItems completos
      console.log(orderItems)
      const data = orderItems.map(oi => ({
        id: oi.id,
        itemId: oi.itemId,
        itemName: oi.item?.name,
        quantity: oi.quantity,
        featureName: oi.featureOption?.name,
        itemFeatureId: oi.itemFeature?.id
      }));

      return res.json({ success: true, data });
    } catch (error) {
      console.error('Erro ao buscar itens por projeto:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
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
