import { Order, Project, Customer, ProductionOrder, sequelize } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

class OrderController {
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { projectId, customerId, status, totalQuantity, deliveryDate } = req.body;

      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(400).json({ success: false, message: 'Projeto não encontrado' });
      }

      const customer = await Customer.findByPk(customerId);
      if (!customer) {
        return res.status(400).json({ success: false, message: 'Cliente não encontrado' });
      }

      const customerAlreadyInOrder = await Order.findOne({ where: { customerId: customerId, projectId: projectId } })
      if (customerAlreadyInOrder) {
        return res.status(400).json({ success: false, message: 'Cliente já cadastrado em um pedido deste projeto' })
      }

      const lastOrder = await Order.findOne({
        order: [['referralId', 'DESC']],
        transaction
      });

      // Incrementar ou começar do 1
    const referralId = lastOrder ? lastOrder.referralId + 1 : 1;
    
      const orderId = uuidv4();
      const order = await Order.create({
        id: orderId,
        deliveryDate,
        projectId,
        customerId,
        status: status || 'pendente',
        totalQuantity: totalQuantity || 0,
        referralId,
      }, { transaction });

      

      await transaction.commit();
      return res.status(201).json({ success: true, data: order });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar pedido:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  static async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { status } = req.query;
      const where = {};
      if (status) where.status = status;

      const { count, rows } = await Order.findAndCountAll({
        where,
        include: [
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          orders: rows,
          pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const order = await Order.findByPk(id, {
        include: [
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' }
        ]
      });

      if (!order) {
        return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
      }

      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  static async getOrderByProject(req, res) {
    try {
      const { id } = req.params;
      const project = await Project.findByPk(id);

      if (!project) {
        return res.status(404).json({ success: false, message: 'Projeto não encontrado' });
      }

      const order = await Order.findAll({
        where: {projectId: project.id},
        include: [
          {model: Project, as: 'project'},
          {model: Customer, as: 'customer'}
        ]
      })

      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  static async getOrderByCustomer(req, res) {
    try {
      const { id } = req.params;
      const customer = await Customer.findByPk(id);

      if (!customer) {
        return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
      }

      res.json({ success: true, data: customer });
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const order = await Order.findByPk(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
      }

      await order.update(updates);
      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const order = await Order.findByPk(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
      }

      const productionOrder = await ProductionOrder.findOne({where: { projectId: order.projectId }})
      if (productionOrder) {
        
          return res.status(404).json({ success: false, message: 'Pedido não pode ser apagado, pois o projeto possui uma ordem de produção!' });
      }

      await order.destroy(); // Exclusão definitiva
      res.json({ success: true, message: 'Pedido removido com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}

export default OrderController;
