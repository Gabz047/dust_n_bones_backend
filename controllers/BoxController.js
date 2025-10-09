import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { 
  sequelize, 
  Box, 
  BoxItem, 
  DeliveryNote, 
  Project, 
  Customer, 
  Order, 
  Package, 
  User, 
  MovementLogEntity, 
  StockItem, 
  Item, 
  Account 
} from '../models/index.js';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';

class BoxController {

  // 🔒 Filtro de acesso por empresa/filial
  static projectAccessFilter(req) {
    const { companyId, branchId } = req.context || {};
    return {
      companyId,
      ...(branchId ? { branchId } : {})
    };
  }

  // Helper para adicionar o último log em uma lista de boxes
  static async attachLastLog(boxes) {
    if (!boxes.length) return [];

    const boxIds = boxes.map(b => b.id);

    const logs = await MovementLogEntity.findAll({
      where: { entity: 'caixa', entityId: boxIds },
      order: [['entityId', 'ASC'], ['createdAt', 'DESC']]
    });

    const lastLogsMap = {};
    logs.forEach(log => {
      if (!lastLogsMap[log.entityId]) lastLogsMap[log.entityId] = log;
    });

    const boxesWithData = await Promise.all(boxes.map(async (box) => {
      const boxItems = await BoxItem.findAll({
        where: { boxId: box.id },
        include: [{ model: Item, as: 'item' }]
      });

      const totalWeight = boxItems.reduce((sum, bi) => sum + (bi.quantity * (bi.item?.weight || 0)), 0);

      return {
        ...box.toJSON(),
        lastMovementLog: lastLogsMap[box.id] || null,
        totalWeight
      };
    }));

    return boxesWithData;
  }

  // 🧾 Criar box
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { deliveryNoteId, projectId, customerId, orderId, packageId, userId } = req.body;

      if (deliveryNoteId != null && !await DeliveryNote.findByPk(deliveryNoteId, { transaction }))
        return res.status(400).json({ success: false, message: 'Delivery Note não encontrada' });
      if (!await Project.findByPk(projectId, { transaction }))
        return res.status(400).json({ success: false, message: 'Projeto não encontrado' });
      if (!await Customer.findByPk(customerId, { transaction }))
        return res.status(400).json({ success: false, message: 'Cliente não encontrado' });
      if (!await Order.findByPk(orderId, { transaction }))
        return res.status(400).json({ success: false, message: 'Pedido não encontrado' });
      if (!await Package.findByPk(packageId, { transaction }))
        return res.status(400).json({ success: false, message: 'Embalagem não encontrada' });

      const box = await Box.create({
        deliveryNoteId,
        projectId,
        customerId,
        orderId,
        packageId,
        qtdTotal: 0
      }, { transaction });

      let logUserId = null;
      let logAccountId = null;

      if (userId) {
        const user = await User.findByPk(userId, { transaction });
        if (user) logUserId = userId;
        else {
          const account = await Account.findByPk(userId, { transaction });
          if (account) logAccountId = userId;
          else {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'O ID informado não corresponde a um User ou Account válido' });
          }
        }
      }

      const movementData = {
        entity: 'caixa',
        entityId: box.id,
        method: 'criação',
        status: 'aberto',
        userId: logUserId,
        accountId: logAccountId
      };

      const lastLog = await MovementLogEntity.create(movementData, { transaction });

      const boxItems = await BoxItem.findAll({ where: { boxId: box.id }, include: [{ model: Item, as: 'item' }], transaction });
      const totalQty = boxItems.reduce((sum, bi) => sum + (bi.quantity || 0), 0);
      await box.update({ qtdTotal: totalQty }, { transaction });

      await transaction.commit();
      return res.status(201).json({ success: true, data: { ...box.toJSON(), lastMovementLog: lastLog } });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar Box:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // ✏️ Atualizar box
  static async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const updates = req.body;

      const box = await Box.findByPk(id);
      if (!box) return res.status(404).json({ success: false, message: 'Box não encontrado' });

      if (updates.deliveryNoteId && !await DeliveryNote.findByPk(updates.deliveryNoteId))
        return res.status(400).json({ success: false, message: 'Delivery Note não encontrada' });
      if (updates.projectId && !await Project.findByPk(updates.projectId))
        return res.status(400).json({ success: false, message: 'Projeto não encontrado' });
      if (updates.customerId && !await Customer.findByPk(updates.customerId))
        return res.status(400).json({ success: false, message: 'Cliente não encontrado' });
      if (updates.orderId && !await Order.findByPk(updates.orderId))
        return res.status(400).json({ success: false, message: 'Pedido não encontrado' });
      if (updates.packageId && !await Package.findByPk(updates.packageId))
        return res.status(400).json({ success: false, message: 'Embalagem não encontrada' });

      await box.update(updates, { transaction });

      let movementData = {
        entity: 'caixa',
        entityId: box.id,
        method: 'edição',
        status: 'aberto'
      };

      const logUserId = updates.userId;

      const user = await User.findByPk(logUserId);
      if (user) {
        movementData.userId = logUserId;
      } else {
        const account = await Account.findByPk(logUserId);
        if (account) {
          movementData.accountId = logUserId;
        } else {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'O ID informado não corresponde a um User ou Account válido' });
        }
      }

      const lastLog = await MovementLogEntity.create(movementData, { transaction });

      const boxItems = await BoxItem.findAll({ where: { boxId: box.id }, transaction });
      const totalQty = boxItems.reduce((sum, item) => sum + item.quantity, 0);
      await box.update({ qtdTotal: totalQty }, { transaction });

      await transaction.commit();
      return res.status(200).json({ success: true, data: { ...box.toJSON(), lastMovementLog: lastLog } });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao atualizar Box:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 🗑️ Deletar box
  static async delete(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id, userId } = req.body;

      const box = await Box.findByPk(id);
      if (!box) return res.status(404).json({ success: false, message: 'Box não encontrado' });

      const boxItems = await BoxItem.findAll({ where: { boxId: id }, transaction });
      for (const bi of boxItems) {
        const stockItem = await StockItem.findOne({
          where: {
            itemId: bi.itemId,
            itemFeatureId: bi.itemFeatureId,
            featureOptionId: bi.featureOptionId
          },
          transaction
        });
        if (stockItem) await stockItem.update({ quantity: stockItem.quantity + bi.quantity }, { transaction });
      }

      let movementData = {
        entity: 'caixa',
        entityId: box.id,
        method: 'remoção',
        status: 'aberto'
      };

      const user = await User.findByPk(userId);
      if (user) {
        movementData.userId = userId;
      } else {
        const account = await Account.findByPk(userId);
        if (account) {
          movementData.accountId = userId;
        } else {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'O ID informado não corresponde a um User ou Account válido' });
        }
      }

      const lastLog = await MovementLogEntity.create(movementData, { transaction });
      await BoxItem.destroy({ where: { boxId: id }, transaction });
      await box.destroy({ transaction });

      await transaction.commit();
      return res.status(200).json({ success: true, message: 'Box removido com sucesso', lastMovementLog: lastLog });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao deletar Box:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 📦 Buscar todos os boxes (com paginação)
static async getAll(req, res) {
  try {
    const { projectId, customerId, orderId, deliveryNoteId, term, fields } = req.query
    const where = {}

    if (projectId) where.projectId = projectId
    if (customerId) where.customerId = customerId
    if (orderId) where.orderId = orderId
    if (deliveryNoteId) where.deliveryNoteId = deliveryNoteId

    // 🔍 Filtro de pesquisa textual
    if (term && fields) {
      const searchFields = fields.split(',')
      where[Op.or] = searchFields.map((field) => ({
        [field]: { [Op.iLike]: `%${term}%` }
      }))
    }

    const result = await buildQueryOptions(req, Box, {
      where,
      include: [
        { model: DeliveryNote, as: 'deliveryNote' },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'companyId', 'branchId'],
          where: BoxController.projectAccessFilter(req)
        },
        { model: Customer, as: 'customer', attributes: ['id', 'name'] },
        { model: Order, as: 'order', attributes: ['id', 'referralId'] },
        { model: Package, as: 'package', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      distinct: true
    })

    // 📜 Anexa o último log a cada box
    const boxesWithLog = await BoxController.attachLastLog(result.data)
    result.data = boxesWithLog

    res.json({ success: true, ...result })
  } catch (error) {
    console.error('Erro ao buscar boxes:', error)
    res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
  }
}

  // 🔍 Buscar por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const box = await Box.findByPk(id, {
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
        ]
      });
      if (!box) return res.status(404).json({ success: false, message: 'Box não encontrado' });

      const lastLog = await MovementLogEntity.findOne({
        where: { entity: 'caixa', entityId: box.id },
        order: [['createdAt', 'DESC']]
      });

      return res.json({ success: true, data: { ...box.toJSON(), lastMovementLog: lastLog } });
    } catch (error) {
      console.error('Erro ao buscar Box por ID:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 🔗 Buscar por projeto
  static async getByProject(req, res) {
    try {
      const { projectId } = req.params;

      const result = await buildQueryOptions(req, Box, {
        where: { projectId },
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          {
            model: Project,
            as: 'project',
            where: { id: projectId, ...BoxController.projectAccessFilter(req) }
          },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
        ]
      });

      const boxesWithLog = await BoxController.attachLastLog(result.data);
      result.data = boxesWithLog;

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar boxes por projeto:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 👤 Buscar por cliente
  static async getByCustomer(req, res) {
    try {
      const { customerId } = req.params;

      const result = await buildQueryOptions(req, Box, {
        where: { customerId },
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          {
            model: Project,
            as: 'project',
            where: BoxController.projectAccessFilter(req)
          },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
        ]
      });

      const boxesWithLog = await BoxController.attachLastLog(result.data);
      result.data = boxesWithLog;

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar boxes por cliente:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 📋 Buscar por pedido
  static async getByOrder(req, res) {
    try {
      const { orderId } = req.params;

      const result = await buildQueryOptions(req, Box, {
        where: { orderId },
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          {
            model: Project,
            as: 'project',
            where: BoxController.projectAccessFilter(req)
          },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
        ]
      });

      const boxesWithLog = await BoxController.attachLastLog(result.data);
      result.data = boxesWithLog;

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar boxes por pedido:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 📋 Buscar por múltiplos pedidos
  static async getByOrderIds(req, res) {
    try {
      let orderIds = req.body.orderIds || req.query.orderIds;
      if (!orderIds || (Array.isArray(orderIds) && orderIds.length === 0))
        return res.status(400).json({ success: false, message: 'É necessário enviar um array de orderIds.' });

      orderIds = orderIds.map(id => id);

      const result = await buildQueryOptions(req, Box, {
        where: { orderId: orderIds },
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
        ]
      });

      if (!result.data.length) return res.status(404).json({ success: false, message: 'Nenhum Box encontrado para os orderIds fornecidos.' });

      const boxesWithLog = await BoxController.attachLastLog(result.data);
      result.data = boxesWithLog;

      return res.json({ success: true, ...result });

    } catch (error) {
      console.error('Erro ao buscar Boxes por múltiplos orderIds:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

   static async getByDeliveryNote(req, res) {
    try {
      const { deliveryNoteId } = req.params;
      const boxes = await Box.findAll({
        where: { deliveryNoteId },
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
         
        ]
      });
      const boxesWithLastLog = await BoxController.attachLastLog(boxes);
      return res.json({ success: true, data: boxesWithLastLog });
    } catch (error) {
      console.error('Erro ao buscar Boxes por deliveryNoteId:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }


  static async getByPackage(req, res) {
    try {
      const { packageId } = req.params;
      const boxes = await Box.findAll({
        where: { packageId },
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
         
        ]
      });
      const boxesWithLastLog = await BoxController.attachLastLog(boxes);
      return res.json({ success: true, data: boxesWithLastLog });
    } catch (error) {
      console.error('Erro ao buscar Boxes por packageId:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }


  static async getByUser(req, res) {
    try {
      const { userId } = req.params;
      const boxes = await Box.findAll({
        where: { userId },
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
         
        ]
      });
      const boxesWithLastLog = await BoxController.attachLastLog(boxes);
      return res.json({ success: true, data: boxesWithLastLog });
    } catch (error) {
      console.error('Erro ao buscar Boxes por userId:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }


   static async getByDate(req, res) {
    try {
      const { date } = req.params;
      const { companyId, branchId } = req.context;


      const boxes = await Box.findAll({
        where: sequelize.where(sequelize.fn('DATE', sequelize.col('Box.createdAt')), date),
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          {
            model: Project,
            as: 'project',
            where: { companyId: companyId, branchId: branchId }
          },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
       
        ]
      });


      const boxesWithLastLog = await BoxController.attachLastLog(boxes);
      return res.json({ success: true, data: boxesWithLastLog });
    } catch (error) {
      console.error('Erro ao buscar Boxes por data:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

}

export default BoxController;