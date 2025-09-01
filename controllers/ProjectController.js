import { Project, Company, Branch, Customer, ProductionOrder, sequelize } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

class ProjectController {
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { companyId, branchId, customerId, totalQuantity, name, deliveryDate } = req.body;
      let branch = null;

      // Validar empresa
      if (!branchId) {
      const company = await Company.findByPk(companyId);
      if (!company || !company.active) {
        return res.status(400).json({ success: false, message: 'Empresa inválida ou inativa' });
      }
    }

      // Validar filial
      
      if (branchId) {
        branch = await Branch.findByPk(branchId);
        if (!branch || !branch.active) {
          return res.status(400).json({ success: false, message: 'Filial inválida ou inativa' });
        }
      }

      // Validar cliente (opcional)
      let customer = null;
      if (customerId) {
        customer = await Customer.findByPk(customerId);
        if (!customer) {
          return res.status(400).json({ success: false, message: 'Cliente não encontrado' });
        }
      }

      const projectId = uuidv4();

      const project = await Project.create({
        id: projectId,
        name,
        deliveryDate,
        companyId,
        branchId: branchId || null,
        customerId: customerId || null,
        totalQuantity: totalQuantity || 0
      }, { transaction });


      await transaction.commit();
      return res.status(201).json({ success: true, data: project });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar projeto:', error);
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

      const { active } = req.query;
      const where = {};
      if (active !== undefined) where.active = active === 'true';

      const { count, rows } = await Project.findAndCountAll({
        where,
        include: [
          { model: Company, as: 'company' },
          { model: Branch, as: 'branch' },
          { model: Customer, as: 'customer' }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          projects: rows,
          pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
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
      const project = await Project.findByPk(id, {
        include: [
          { model: Company, as: 'company' },
          { model: Branch, as: 'branch' },
          { model: Customer, as: 'customer' }
        ]
      });

      if (!project) {
        return res.status(404).json({ success: false, message: 'Projeto não encontrado' });
      }

      res.json({ success: true, data: project });
    } catch (error) {
      console.error('Erro ao buscar projeto:', error);
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

      const project = await Project.findByPk(id);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Projeto não encontrado' });
      }

      await project.update(updates);
      res.json({ success: true, data: project });
    } catch (error) {
      console.error('Erro ao atualizar projeto:', error);
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
      const project = await Project.findByPk(id);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Projeto não encontrado' });
      }

      const productionOrder = await ProductionOrder.findOne({where: { projectId: id }})
      if (productionOrder) {
        
          return res.status(404).json({ success: false, message: 'Projeto não pode ser apagado, pois possui uma ordem de produção!' });
      }

      await project.destroy();
      res.json({ success: true, message: 'Projeto removido com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar projeto:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}

export default ProjectController;
