import { v4 as uuidv4 } from 'uuid';
import { sequelize, Box, BoxItem, DeliveryNote, Project, Customer, Order, Package, User, MovementLogEntity } from '../models/index.js';

class BoxController {

  // Cria um novo Box
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { deliveryNoteId, projectId, customerId, orderId, packageId, userId } = req.body;

      // Validações
      const deliveryNote = await DeliveryNote.findByPk(deliveryNoteId);
      if (!deliveryNote) return res.status(400).json({ success: false, message: 'Delivery Note não encontrada' });

      const project = await Project.findByPk(projectId);
      if (!project) return res.status(400).json({ success: false, message: 'Projeto não encontrado' });

      const customer = await Customer.findByPk(customerId);
      if (!customer) return res.status(400).json({ success: false, message: 'Cliente não encontrado' });

      const order = await Order.findByPk(orderId);
      if (!order) return res.status(400).json({ success: false, message: 'Pedido não encontrado' });

      const packageObj = await Package.findByPk(packageId);
      if (!packageObj) return res.status(400).json({ success: false, message: 'Embalagem não encontrada' });

      const user = await User.findByPk(userId);
      if (!user) return res.status(400).json({ success: false, message: 'Usuário não encontrado' });

      // Cria o Box
      const box = await Box.create({
        id: uuidv4(),
        deliveryNoteId,
        projectId,
        customerId,
        orderId,
        packageId,
        userId,
        qtdTotal: 0 // inicial, será atualizado depois
      }, { transaction });

      // Cria log de movimentação
      await MovementLogEntity.create({
        id: uuidv4(),
        entity: 'caixa',
        entityId: box.id,
        method: 'criação',
        status: 'aberto',
        userId
      }, { transaction });

      // Atualiza qtdTotal baseado nos BoxItems (se houver)
      const boxItems = await BoxItem.findAll({ where: { boxId: box.id }, transaction });
      const totalQty = boxItems.reduce((sum, item) => sum + item.quantity, 0);
      await box.update({ qtdTotal: totalQty }, { transaction });

      await transaction.commit();
      return res.status(201).json({ success: true, data: box });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar Box:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Atualiza um Box existente
  static async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const updates = req.body;

      const box = await Box.findByPk(id);
      if (!box) return res.status(404).json({ success: false, message: 'Box não encontrado' });

      // Validações opcionais
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

      if (updates.userId && !await User.findByPk(updates.userId))
        return res.status(400).json({ success: false, message: 'Usuário não encontrado' });

      // Atualiza o Box
      await box.update(updates, { transaction });

      // Cria log de movimentação
      await MovementLogEntity.create({
        id: uuidv4(),
        entity: 'caixa',
        entityId: box.id,
        method: 'edição',
        status: 'aberto',
        userId: updates.userId || box.userId
      }, { transaction });

      // Atualiza qtdTotal
      const boxItems = await BoxItem.findAll({ where: { boxId: box.id }, transaction });
      const totalQty = boxItems.reduce((sum, item) => sum + item.quantity, 0);
      await box.update({ qtdTotal: totalQty }, { transaction });

      await transaction.commit();
      return res.status(200).json({ success: true, data: box });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao atualizar Box:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Deleta um Box
  static async delete(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const box = await Box.findByPk(id);
      if (!box) return res.status(404).json({ success: false, message: 'Box não encontrado' });

      // Cria log de movimentação
      await MovementLogEntity.create({
        id: uuidv4(),
        entity: 'caixa',
        entityId: box.id,
        method: 'remoção',
        status: 'aberto',
        userId: box.userId
      }, { transaction });

      await box.destroy({ transaction });
      await transaction.commit();
      return res.status(200).json({ success: true, message: 'Box removido com sucesso' });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao deletar Box:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Lista todos os Boxes
  static async getAll(req, res) {
    try {
      const boxes = await Box.findAll({
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
          { model: User, as: 'user' }
        ],
        order: [['createdAt', 'DESC']]
      });
      return res.json({ success: true, data: boxes });
    } catch (error) {
      console.error('Erro ao listar Boxes:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Busca Box por ID
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
          { model: User, as: 'user' }
        ]
      });
      if (!box) return res.status(404).json({ success: false, message: 'Box não encontrado' });
      return res.json({ success: true, data: box });
    } catch (error) {
      console.error('Erro ao buscar Box por ID:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Filtros
  static async getByDeliveryNote(req, res) {
    return this._filterByField('deliveryNoteId', req.params.deliveryNoteId, res);
  }

  static async getByProject(req, res) {
    return this._filterByField('projectId', req.params.projectId, res);
  }

  static async getByCustomer(req, res) {
    return this._filterByField('customerId', req.params.customerId, res);
  }

  static async getByOrder(req, res) {
    return this._filterByField('orderId', req.params.orderId, res);
  }

  static async getByPackage(req, res) {
    return this._filterByField('packageId', req.params.packageId, res);
  }

  static async getByUser(req, res) {
    return this._filterByField('userId', req.params.userId, res);
  }

  static async getByDate(req, res) {
    try {
      const { date } = req.params; // formato: YYYY-MM-DD
      const boxes = await Box.findAll({
        where: sequelize.where(sequelize.fn('DATE', sequelize.col('createdAt')), date),
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
          { model: User, as: 'user' }
        ]
      });
      return res.json({ success: true, data: boxes });
    } catch (error) {
      console.error('Erro ao buscar Boxes por data:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Função interna para evitar repetição
  static async _filterByField(field, value, res) {
    try {
      const boxes = await Box.findAll({
        where: { [field]: value },
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
          { model: User, as: 'user' }
        ]
      });
      return res.json({ success: true, data: boxes });
    } catch (error) {
      console.error(`Erro ao filtrar Boxes por ${field}:`, error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

}

export default BoxController;
