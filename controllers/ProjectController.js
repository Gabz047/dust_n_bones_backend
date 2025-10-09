// controllers/ProjectController.js
import { v4 as uuidv4 } from 'uuid'
import { Op } from 'sequelize'
import { Project, Company, Branch, Customer, ProductionOrder, sequelize } from '../models/index.js'
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js'

class ProjectController {
  static async create(req, res) {
    const transaction = await sequelize.transaction()
    try {
      const { companyId, branchId, customerId, totalQuantity, name, deliveryDate } = req.body
      let branch = null

      // Validar empresa
      if (!branchId) {
        const company = await Company.findByPk(companyId)
        if (!company || !company.active) {
          return res.status(400).json({ success: false, message: 'Empresa inválida ou inativa' })
        }
      }

      // Validar filial
      if (branchId) {
        branch = await Branch.findByPk(branchId)
        if (!branch || !branch.active) {
          return res.status(400).json({ success: false, message: 'Filial inválida ou inativa' })
        }
      }

      // Validar cliente (opcional)
      let customer = null
      if (customerId) {
        customer = await Customer.findByPk(customerId)
        if (!customer) {
          return res.status(400).json({ success: false, message: 'Cliente não encontrado' })
        }
      }

      const projectId = uuidv4()

      const project = await Project.create({
        id: projectId,
        name,
        deliveryDate,
        companyId,
        branchId: branchId || null,
        customerId: customerId || null,
        totalQuantity: totalQuantity || 0
      }, { transaction })

      await transaction.commit()
      return res.status(201).json({ success: true, data: project })
    } catch (error) {
      await transaction.rollback()
      console.error('Erro ao criar projeto:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      })
    }
  }

  // 🔒 Filtro de acesso por empresa/filial
  static contextFilter(req) {
    const { companyId, branchId } = req.context || {}
    return {
      companyId,
      ...(branchId ? { branchId } : {})
    }
  }

  // 📦 Buscar todos os projetos (com paginação via buildQueryOptions)
  static async getAll(req, res) {
    try {
      const { active, customerId, term, fields } = req.query
      const where = {}

      if (active !== undefined) where.active = active === 'true'
      if (customerId) where.customerId = customerId

      // 🔍 Filtro de pesquisa textual
      if (term && fields) {
        const searchFields = fields.split(',')
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${term}%` }
        }))
      }

      // Aplicar filtro de contexto
      Object.assign(where, ProjectController.contextFilter(req))

      const result = await buildQueryOptions(req, Project, {
        where,
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name'] },
          { model: Branch, as: 'branch', attributes: ['id', 'name'] },
          { model: Customer, as: 'customer', attributes: ['id', 'name'] }
        ]
      })

      res.json({ success: true, ...result })
    } catch (error) {
      console.error('Erro ao buscar projetos:', error)
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      })
    }
  }

  // 🔍 Buscar projeto por ID
  static async getById(req, res) {
    try {
      const { id } = req.params

      const project = await Project.findOne({
        where: {
          id,
          ...ProjectController.contextFilter(req)
        },
        include: [
          { model: Company, as: 'company' },
          { model: Branch, as: 'branch' },
          { model: Customer, as: 'customer' }
        ]
      })

      if (!project) {
        return res.status(404).json({ success: false, message: 'Projeto não encontrado' })
      }

      res.json({ success: true, data: project })
    } catch (error) {
      console.error('Erro ao buscar projeto:', error)
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      })
    }
  }

  // 🔄 Atualizar projeto
  static async update(req, res) {
    try {
      const { id } = req.params
      const updates = req.body

      const project = await Project.findOne({
        where: {
          id,
          ...ProjectController.contextFilter(req)
        }
      })

      if (!project) {
        return res.status(404).json({ success: false, message: 'Projeto não encontrado' })
      }

      await project.update(updates)
      res.json({ success: true, data: project })
    } catch (error) {
      console.error('Erro ao atualizar projeto:', error)
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      })
    }
  }

  // 🗑️ Deletar projeto
  static async delete(req, res) {
    try {
      const { id } = req.params

      const project = await Project.findOne({
        where: {
          id,
          ...ProjectController.contextFilter(req)
        }
      })

      if (!project) {
        return res.status(404).json({ success: false, message: 'Projeto não encontrado' })
      }

      const productionOrder = await ProductionOrder.findOne({ where: { projectId: id } })
      if (productionOrder) {
        return res.status(400).json({
          success: false,
          message: 'Projeto não pode ser apagado, pois possui uma ordem de produção!'
        })
      }

      await project.destroy()
      res.json({ success: true, message: 'Projeto removido com sucesso' })
    } catch (error) {
      console.error('Erro ao deletar projeto:', error)
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      })
    }
  }

  // 👤 Buscar projetos por cliente
  static async getByCustomer(req, res) {
    try {
      const { customerId } = req.params

      const result = await buildQueryOptions(req, Project, {
        where: {
          customerId,
          ...ProjectController.contextFilter(req)
        },
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name'] },
          { model: Branch, as: 'branch', attributes: ['id', 'name'] },
          { model: Customer, as: 'customer', attributes: ['id', 'name'] }
        ]
      })

      res.json({ success: true, ...result })
    } catch (error) {
      console.error('Erro ao buscar projetos por cliente:', error)
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      })
    }
  }
}

export default ProjectController