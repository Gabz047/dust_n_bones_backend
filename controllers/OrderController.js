import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import {
  Order,
  Project,
  Customer,
  ProductionOrder,
  OrderItem,
  Item,
  FeatureOption,
  OrderItemAdditionalFeatureOption,
  ItemFeature,
  Feature,
  DeliveryNote,
  Company,
  Branch,
  User,
  Account,
  MovementLogEntity,
  sequelize
} from '../models/index.js';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';
import { generateReferralId } from '../utils/globals/generateReferralId.js';
import { resolveCompanyId, userAccessFilter } from '../utils/globals/requestHelpers.js';

class OrderController {
  // 🔒 Filtro de acesso por empresa/filial através do projeto
 static async contextFilter(req) {
  const base = await userAccessFilter(req);

  // Se vier companyId ou branchId, mapeia para a associação 'project'
  const projectFilter = {};
  if (base.companyId) projectFilter['$project.company_id$'] = base.companyId;
  if (base.branchId) projectFilter['$project.branch_id$'] = base.branchId;

  return projectFilter;
}

  // 📝 Criar pedido
  static async create(req, res) {
    try {
      const { projectId, customerId, status, totalQuantity, deliveryDate, userId } = req.body;
  
      // 🔹 Resolve companyId via req
      const resolvedCompanyId = resolveCompanyId(req);
      if (!resolvedCompanyId) {
        return res.status(400).json({ success: false, message: 'Não foi possível determinar a empresa.' });
      }

      // ✅ Validar projeto
      const project = await Project.findByPk(projectId);
      if (!project) return res.status(400).json({ success: false, message: 'Projeto não encontrado' });

      if (project.companyId !== resolvedCompanyId) {
        return res.status(403).json({ success: false, message: 'Projeto não pertence à empresa do usuário' });
      }

      // ✅ Validar cliente
      const customer = await Customer.findByPk(customerId);
      if (!customer) return res.status(400).json({ success: false, message: 'Cliente não encontrado' });

      // ✅ Verificar se cliente já tem pedido neste projeto
      const customerAlreadyInOrder = await Order.findOne({ where: { customerId, projectId } });
      if (customerAlreadyInOrder) {
        return res.status(400).json({
          success: false,
          message: 'Cliente já cadastrado em um pedido deste projeto'
        });
      }

      // ✅ Validar usuário/conta
      const user = await User.findByPk(userId);
      let account = null;
      if (!user) account = await Account.findByPk(userId);
      if (!user && !account) {
        return res.status(400).json({ success: false, message: 'ID inválido de usuário ou conta' });
      }

      // 🔹 Transação
      const transaction = await sequelize.transaction();
      try {
        const orderId = uuidv4();
        const referralId = await generateReferralId({
          model: Order,
          transaction,
          companyId: project.companyId // 🔸 vem do projeto
        });

        const order = await Order.create({
          id: orderId,
          deliveryDate,
          projectId,
          customerId,
          status: status || 'pendente',
          totalQuantity: totalQuantity || 0,
          referralId
        }, { transaction });

        // 📋 Criar log de movimento
        const MreferralId = await generateReferralId({
          model: MovementLogEntity,
          transaction,
          companyId: project.companyId
        });

        await MovementLogEntity.create({
          method: 'criação',
          entity: 'pedido',
          entityId: order.id,
          status: 'aberto',
          companyId: project.companyId,
          branchId: project.branchId || null,
          referralId: MreferralId,
          userId: user?.id || undefined,
          accountId: account?.id || undefined
        }, { transaction });

        await transaction.commit();
        return res.status(201).json({ success: true, data: order });

      } catch (error) {
        await transaction.rollback();
        console.error('Erro ao criar pedido (transação):', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
      }

    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }


  // 📋 Buscar todos os pedidos com paginação e filtros
   static async getAll(req, res) {
    try {
      const { term, fields, status, customerId, projectId } = req.query;
      const baseWhere = await OrderController.contextFilter(req);

      if (status) baseWhere.status = status;
      if (customerId) baseWhere.customerId = customerId;
      if (projectId) baseWhere.projectId = projectId;

      const textFields = ['status'];
      const uuidFields = ['customerId', 'projectId'];

      if (term && fields) {
        const searchFields = fields.split(',')
        baseWhere[Op.or] = searchFields.map(f => ({ [f]: { [Op.iLike]: `%${term}%` } }))
      }

      const result = await buildQueryOptions(req, Order, {
        where: baseWhere,
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'referralId', 'companyId', 'branchId'],
            include: [
              { model: Company, as: 'company', attributes: ['id', 'name'] },
              { model: Branch, as: 'branch', attributes: ['id', 'name'] }
            ]
          },
          { model: Customer, as: 'customer', attributes: ['id', 'name'] }
        ]
      });

      // 🧾 Último log
      const orderIds = result.data.map(o => o.id);
      const logs = await MovementLogEntity.findAll({
        where: { entity: 'pedido', entityId: { [Op.in]: orderIds } },
        attributes: ['entityId', 'status'],
        order: [['createdAt', 'DESC']]
      });

      const lastLogsMap = {};
      for (const log of logs) if (!lastLogsMap[log.entityId]) lastLogsMap[log.entityId] = log;

      const enrichedData = result.data.map(o => ({
        ...o.toJSON(),
        lastMovementLog: lastLogsMap[o.id]?.status ?? null
      }));

      res.json({ success: true, ...result, data: enrichedData });
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 🔍 Buscar pedido por ID
 
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const baseWhere = await OrderController.contextFilter(req);

      const order = await Order.findOne({
        where: { id, ...baseWhere },
        include: [
          {
            model: Project,
            as: 'project',
            include: [
              { model: Company, as: 'company', attributes: ['id', 'name'] },
              { model: Branch, as: 'branch', attributes: ['id', 'name'] }
            ]
          },
          { model: Customer, as: 'customer' },
          {
            model: DeliveryNote,
            as: 'deliveryNotes',
            attributes: ['id', 'orderId', 'referralId', 'invoiceId'],
            where: { invoiceId: null },
            required: false
          },
          {
            model: OrderItem,
            as: 'orderItems',
            include: [
              { model: Item, as: 'item' },
              { model: FeatureOption, as: 'featureOption' }
            ]
          },
          {
            model: OrderItemAdditionalFeatureOption,
            as: 'additionalOptions',
            include: [
              {
                model: ItemFeature,
                as: 'itemFeature',
                include: [{ model: Feature, as: 'feature', attributes: ['name'] }]
              },
              { model: FeatureOption, as: 'featureOption' },
              { model: Item, as: 'item' }
            ]
          }
        ]
      });

      if (!order) return res.status(404).json({ success: false, message: 'Pedido não encontrado' });

      const lastLog = await MovementLogEntity.findOne({
        where: { entity: 'pedido', entityId: id },
        order: [['createdAt', 'DESC']],
        attributes: ['status']
      });

      res.json({
        success: true,
        data: { ...order.toJSON(), lastMovementLog: lastLog?.status ?? null }
      });
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 📦 Buscar pedidos por projeto
  static async getOrderByProject(req, res) {
  try {
    const { id } = req.params;
    const baseWhere = await OrderController.contextFilter(req);

    const result = await buildQueryOptions(req, Order, {
      where: { projectId: id, ...baseWhere },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'referralId', 'companyId', 'branchId'],
          include: [
            { model: Company, as: 'company', attributes: ['id', 'name'] },
            { model: Branch, as: 'branch', attributes: ['id', 'name'] }
          ]
        },
        { model: Customer, as: 'customer' },
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            { model: Item, as: 'item' },
            { model: FeatureOption, as: 'featureOption' }
          ]
        },
        {
          model: DeliveryNote,
          as: 'deliveryNotes',
          attributes: ['id', 'referralId', 'createdAt', 'totalQuantity'],
          include: [
            { model: Customer, as: 'customer', attributes: ['id', 'name'] }
          ]
        }
      ]
    });

    // Buscar os últimos logs
    const orderIds = result.data.map(o => o.id);
    const logs = await MovementLogEntity.findAll({
      where: { entity: 'pedido', entityId: { [Op.in]: orderIds } },
      attributes: ['entityId', 'status'],
      order: [['createdAt', 'DESC']]
    });

    const lastLogsMap = {};
    for (const log of logs) {
      if (!lastLogsMap[log.entityId]) lastLogsMap[log.entityId] = log;
    }

    // Enriquecer os dados com último status de log
    const enrichedData = result.data.map(o => ({
      ...o.toJSON(),
      companyId: o.project?.companyId || null, // 🔸 sempre vem do projeto
      branchId: o.project?.branchId || null,   // 🔸 idem
      lastMovementLog: lastLogsMap[o.id]?.status ?? null
    }));

    res.json({ success: true, ...result, data: enrichedData });
  } catch (error) {
    console.error('Erro ao buscar pedidos do projeto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
}

  // 👤 Buscar pedidos por cliente
  static async getOrderByCustomer(req, res) {
    try {
      const { id } = req.params;
      const baseWhere = await OrderController.contextFilter(req);

      const result = await buildQueryOptions(req, Order, {
        where: { customerId: id, ...baseWhere },
        include: [
          {
            model: Project,
            as: 'project',
            include: [
              { model: Company, as: 'company', attributes: ['id', 'name'] },
              { model: Branch, as: 'branch', attributes: ['id', 'name'] }
            ]
          },
          { model: Customer, as: 'customer' },
          {
            model: OrderItem,
            as: 'orderItems',
            include: [
              { model: Item, as: 'item' },
              { model: FeatureOption, as: 'featureOption' }
            ]
          },
          {
            model: DeliveryNote,
            as: 'deliveryNotes',
            attributes: ['id', 'referralId', 'createdAt', 'totalQuantity'],
            include: [
              { model: Customer, as: 'customer', attributes: ['id', 'name'] }
            ]
          }
        ]
      });

      const orderIds = result.data.map(o => o.id);
      const logs = await MovementLogEntity.findAll({
        where: { entity: 'pedido', entityId: { [Op.in]: orderIds } },
        attributes: ['entityId', 'status'],
        order: [['createdAt', 'DESC']]
      });

      const lastLogsMap = {};
      for (const log of logs) {
        if (!lastLogsMap[log.entityId]) lastLogsMap[log.entityId] = log;
      }

      const enrichedData = result.data.map(o => ({
        ...o.toJSON(),
        lastMovementLog: lastLogsMap[o.id]?.status ?? null
      }));

      res.json({ success: true, ...result, data: enrichedData });
    } catch (error) {
      console.error('Erro ao buscar pedidos do cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // ✏️ Atualizar pedido
   static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const { userId } = updates;

      const user = await User.findByPk(userId);
      const account = user ? null : await Account.findByPk(userId);
      if (!user && !account)
        return res.status(400).json({ success: false, message: 'ID inválido de usuário ou conta' });

      const transaction = await sequelize.transaction();
      try {
        const baseWhere = await OrderController.contextFilter(req);
        const order = await Order.findOne({
          where: { id, ...baseWhere },
          include: [{ model: Project, as: 'project' }],
          transaction
        });

        if (!order) {
          await transaction.rollback();
          return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
        }

        await order.update(updates, { transaction });

        const referralId = await generateReferralId({
          model: MovementLogEntity,
          transaction,
          companyId: order.project.companyId
        });

        await MovementLogEntity.create({
          method: 'edição',
          entity: 'pedido',
          entityId: order.id,
          status: 'aberto',
          companyId: order.project.companyId,
          branchId: order.project.branchId || null,
          referralId,
          userId: user?.id || undefined,
          accountId: account?.id || undefined
        }, { transaction });

        await transaction.commit();
        return res.json({ success: true, data: order });
      } catch (error) {
        await transaction.rollback();
        console.error('Erro ao atualizar pedido (transação):', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
      }
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 🗑️ Deletar pedido
   static async delete(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const baseWhere = await OrderController.contextFilter(req);
      const order = await Order.findOne({
        where: { id, ...baseWhere },
        include: [{ model: Project, as: 'project' }],
        transaction
      });

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
      }

      const orderItem = await OrderItem.findOne({
        where: { orderId: order.id },
        transaction
      });

      if (orderItem) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Pedido não pode ser apagado, pois possui itens cadastrados nele!'
        });
      }

      await order.destroy({ transaction });

      const referralId = await generateReferralId({
        model: MovementLogEntity,
        transaction,
        companyId: order.project.companyId
      });

      const movementData = {
        method: 'remoção',
        entity: 'pedido',
        entityId: order.id,
        status: 'finalizado',
        companyId: order.project.companyId,
        branchId: order.project.branchId,
        referralId
      };

      const user = await User.findByPk(userId);
      if (user) movementData.userId = userId;
      else {
        const account = await Account.findByPk(userId);
        if (account) movementData.accountId = userId;
        else {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'ID inválido de usuário ou conta'
          });
        }
      }

      await MovementLogEntity.create(movementData, { transaction });
      await transaction.commit();
      res.json({ success: true, message: 'Pedido removido com sucesso' });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao deletar pedido:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

}

export default OrderController;