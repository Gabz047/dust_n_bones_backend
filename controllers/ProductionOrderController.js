import { sequelize, ProductionOrder, ProductionOrderItem, Item, ItemFeature, FeatureOption, Project, Customer, Order } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

class ProductionOrderController {
  // Criar OP
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { projectId, supplierId, mainCustomerId, type, plannedQuantity, issueDate, closeDate } = req.body;

      const project = await Project.findByPk(projectId);
      if (!project) return res.status(400).json({ success: false, message: 'Projeto não encontrado' });

      if (supplierId) {
        const supplier = await Customer.findByPk(supplierId);
        if (!supplier) return res.status(400).json({ success: false, message: 'Fornecedor não encontrado' });
      }

      if (mainCustomerId) {
        const mainCustomer = await Customer.findByPk(mainCustomerId);
        if (!mainCustomer) return res.status(400).json({ success: false, message: 'Cliente principal não encontrado' });
      }

      const lastOrder = await ProductionOrder.findOne({
        order: [['referralId', 'DESC']],
        transaction
      });

      const referralId = lastOrder ? lastOrder.referralId + 1 : 1;

      const order = await ProductionOrder.create({
        id: uuidv4(),
        projectId,
        supplierId,
        mainCustomerId,
        type: type || 'Normal',
        plannedQuantity: plannedQuantity || 0,
        issueDate: issueDate || new Date().toISOString().split("T")[0],
        closeDate: closeDate || null,
        referralId
      }, { transaction });

      await transaction.commit();
      return res.status(201).json({ success: true, data: order });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar O.P.:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // GET: Buscar OP por projeto (filtra pelo company/branch do projeto)
  static async getByProject(req, res) {
    try {
      const { id } = req.params;
      const { companyId, branchId } = req.context;

      const orders = await ProductionOrder.findAll({
        where: { projectId: id },
        include: [
          { model: Project, as: 'project', where: { companyId, ...(branchId ? { branchId } : {}) } },
          { model: Customer, as: 'supplier' },
          { model: Customer, as: 'mainCustomer' },
          {
            model: ProductionOrderItem,
            as: 'items',
            include: [
              { model: Item, as: 'item' },
              { model: ItemFeature, as: 'itemFeature' },
              { model: FeatureOption, as: 'featureOption' }
            ]
          }
        ],
        order: [['issueDate', 'DESC']]
      });

      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('Erro ao buscar O.P. por projeto:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // GET: Buscar OP por fornecedor (filtra pelo company/branch do projeto)
  static async getBySupplier(req, res) {
    try {
      const { id } = req.params;
      const { companyId, branchId } = req.context;

      const orders = await ProductionOrder.findAll({
        where: { supplierId: id },
        include: [
          { model: Project, as: 'project', where: { companyId, ...(branchId ? { branchId } : {}) } },
          { model: Customer, as: 'supplier' },
          { model: Customer, as: 'mainCustomer' },
          { model: Order, as: 'order' },
          {
            model: ProductionOrderItem,
            as: 'items',
            include: [
              { model: Item, as: 'item' },
              { model: ItemFeature, as: 'itemFeature' },
              { model: FeatureOption, as: 'featureOption' }
            ]
          }
        ],
        order: [['issueDate', 'DESC']]
      });

      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('Erro ao buscar O.P. por fornecedor:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // GET: Buscar OP por cliente principal (filtra pelo company/branch do projeto)
  static async getByCustomer(req, res) {
    try {
      const { id } = req.params;
      const { companyId, branchId } = req.context;

      const orders = await ProductionOrder.findAll({
        where: { mainCustomerId: id },
        include: [
          { model: Project, as: 'project', where: { companyId, ...(branchId ? { branchId } : {}) } },
          { model: Customer, as: 'supplier' },
          { model: Customer, as: 'mainCustomer' },
          { model: Order, as: 'order' },
          {
            model: ProductionOrderItem,
            as: 'items',
            include: [
              { model: Item, as: 'item' },
              { model: ItemFeature, as: 'itemFeature' },
              { model: FeatureOption, as: 'featureOption' }
            ]
          }
        ],
        order: [['issueDate', 'DESC']]
      });

      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('Erro ao buscar O.P. por cliente:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // GET: Buscar todas OPs com filtros (filtra pelo company/branch do projeto)
  static async getAll(req, res) {
    try {
      const { projectId, supplierId, mainCustomerId, type } = req.query;
      const { companyId, branchId } = req.context;

      const where = {
        ...(projectId ? { projectId } : {}),
        ...(supplierId ? { supplierId } : {}),
        ...(mainCustomerId ? { mainCustomerId } : {}),
        ...(type ? { type } : {})
      };

      const orders = await ProductionOrder.findAll({
        where,
        include: [
          { model: Project, as: 'project', where: { companyId, ...(branchId ? { branchId } : {}) } },
          { model: Customer, as: 'supplier' },
          { model: Customer, as: 'mainCustomer' },
          {
            model: ProductionOrderItem,
            as: 'items',
            include: [
              { model: Item, as: 'item' },
              { model: ItemFeature, as: 'itemFeature' },
              { model: FeatureOption, as: 'featureOption' }
            ]
          }
        ],
        order: [['issueDate', 'DESC']]
      });

      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('Erro ao buscar O.P.:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // GET: Buscar OP por ID (filtra pelo company/branch do projeto)
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const { companyId, branchId } = req.context;

      const order = await ProductionOrder.findOne({
        where: { id },
        include: [
          { model: Project, as: 'project', where: { companyId, ...(branchId ? { branchId } : {}) } },
          { model: Customer, as: 'supplier' },
          { model: Customer, as: 'mainCustomer' },
          {
            model: ProductionOrderItem,
            as: 'items',
            include: [
              { model: Item, as: 'item' },
              { model: ItemFeature, as: 'itemFeature' },
              { model: FeatureOption, as: 'featureOption' }
            ]
          }
        ]
      });

      if (!order) return res.status(404).json({ success: false, message: 'O.P. não encontrada' });
      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Erro ao buscar O.P.:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // PUT, PATCH e DELETE permanecem iguais
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const order = await ProductionOrder.findByPk(id);
      if (!order) return res.status(404).json({ success: false, message: 'O.P. não encontrada' });

      await order.update(updates);
      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Erro ao atualizar O.P.:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const order = await ProductionOrder.findByPk(id);
      if (!order) return res.status(404).json({ success: false, message: 'O.P. não encontrada' });

      await order.destroy();
      res.json({ success: true, message: 'O.P. removida com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar O.P.:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async patch(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const order = await ProductionOrder.findByPk(id);
      if (!order) return res.status(404).json({ success: false, message: 'O.P. não encontrada' });

      await order.update(updates);
      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Erro ao atualizar O.P.:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }
}

export default ProductionOrderController;
