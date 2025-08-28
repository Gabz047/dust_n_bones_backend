import { Status, User, Order, sequelize } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

class StatusController {
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { userId, orderId, status } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(400).json({ success: false, message: 'Usuário não encontrado' });
      }

      const order = await Order.findByPk(orderId);
      if (!order) {
        return res.status(400).json({ success: false, message: 'Pedido não encontrado' });
      }

      const statusId = uuidv4();
      const statusEntry = await Status.create({
        id: statusId,
        userId,
        orderId,
        status
      }, { transaction });

      await transaction.commit();
      return res.status(201).json({ success: true, data: statusEntry });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar status:', error);
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

      const { count, rows } = await Status.findAndCountAll({
        where,
        include: [
          { model: User, as: 'user' },
          { model: Order, as: 'order' }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          statuses: rows,
          pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar status:', error);
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
      const statusEntry = await Status.findByPk(id, {
        include: [
          { model: User, as: 'user' },
          { model: Order, as: 'order' }
        ]
      });

      if (!statusEntry) {
        return res.status(404).json({ success: false, message: 'Status não encontrado' });
      }

      res.json({ success: true, data: statusEntry });
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  static async getByUser(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      }

      const statuses = await Status.findAll({
        where: { userId },
        include: [{ model: Order, as: 'order' }],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, data: statuses });
    } catch (error) {
      console.error('Erro ao buscar status por usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  static async getByOrder(req, res) {
    try {
      const { orderId } = req.params;

      const order = await Order.findByPk(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
      }

      const statuses = await Status.findAll({
        where: { orderId },
        include: [{ model: User, as: 'user' }],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, data: statuses });
    } catch (error) {
      console.error('Erro ao buscar status por pedido:', error);
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

      const statusEntry = await Status.findByPk(id);
      if (!statusEntry) {
        return res.status(404).json({ success: false, message: 'Status não encontrado' });
      }

      await statusEntry.update(updates);
      res.json({ success: true, data: statusEntry });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
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
      const statusEntry = await Status.findByPk(id);
      if (!statusEntry) {
        return res.status(404).json({ success: false, message: 'Status não encontrado' });
      }

      await statusEntry.destroy();
      res.json({ success: true, message: 'Status removido com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar status:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}

export default StatusController;
