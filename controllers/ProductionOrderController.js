// controllers/ProductionOrderController.js
import { v4 as uuidv4 } from 'uuid'
import { Op } from 'sequelize'
import sequelize from '../config/database.js'
import {
  ProductionOrder,
  ProductionOrderItem,
  Item,
  ItemFeature,
  FeatureOption,
  Project,
  Customer,
  Order
} from '../models/index.js'
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js'
import { generateReferralId } from '../utils/globals/generateReferralId.js'

class ProductionOrderController {
  // 🔒 Filtro de acesso por empresa/filial (via projeto)
  static projectAccessFilter(req) {
    const { companyId, branchId } = req.context || {}
    return {
      companyId,
      ...(branchId ? { branchId } : {})
    }
  }


  // 🧾 Criar OP
 // 🧾 Criar OP
static async create(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const {
      projectId,
      supplierId,
      mainCustomerId,
      type,
      plannedQuantity,
      issueDate,
      closeDate
    } = req.body;

    // 🔍 Verifica se o projeto existe
    const project = await Project.findByPk(projectId);
    if (!project) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Projeto não encontrado' });
    }

    // 🔍 Valida fornecedor
    if (supplierId) {
      const supplier = await Customer.findByPk(supplierId);
      if (!supplier) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Fornecedor não encontrado' });
      }
    }

    // 🔍 Valida cliente principal
    if (mainCustomerId) {
      const mainCustomer = await Customer.findByPk(mainCustomerId);
      if (!mainCustomer) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Cliente principal não encontrado' });
      }
    }

    // ✅ companyId e branchId vêm do projeto
    const companyId = project.companyId;
    const branchId = project.branchId ?? null;

    // 🔢 Gera referralId único
    const referralId = await generateReferralId({
      model: ProductionOrder, // Corrigido: antes usava DeliveryNote
      transaction,
      companyId,
      branchId,
    });

    // 🏗️ Cria a ordem de produção
    const order = await ProductionOrder.create({
      id: uuidv4(),
      projectId,
      supplierId,
      mainCustomerId,
      type: type || 'Normal',
      plannedQuantity: plannedQuantity || 0,
      issueDate: issueDate || new Date().toISOString().split('T')[0],
      closeDate: closeDate || null,
      referralId,
    }, { transaction });

    await transaction.commit();
    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao criar O.P.:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}



  // 📦 Buscar todas as OPs com paginação e filtros
  static async getAll(req, res) {
    try {
      const { projectId, supplierId, mainCustomerId, type, term, fields } = req.query
      const where = {}


      if (projectId) where.projectId = projectId
      if (supplierId) where.supplierId = supplierId
      if (mainCustomerId) where.mainCustomerId = mainCustomerId
      if (type) where.type = type


      // 🔍 Filtro de pesquisa textual
      if (term && fields) {
        const searchFields = fields.split(',')
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${term}%` }
        }))
      }


      const result = await buildQueryOptions(req, ProductionOrder, {
        where,
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: ProductionOrderController.projectAccessFilter(req)
          },
          { model: Customer, as: 'supplier', attributes: ['id', 'name'] },
          { model: Customer, as: 'mainCustomer', attributes: ['id', 'name'] },
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
        order: [['issueDate', 'DESC']],
        distinct: true,
      })


      res.json({ success: true, ...result })
    } catch (error) {
      console.error('Erro ao buscar O.P.:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }


  // 🔍 Buscar por ID
  static async getById(req, res) {
    try {
      const { id } = req.params


      const order = await ProductionOrder.findOne({
        where: { id },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: ProductionOrderController.projectAccessFilter(req)
          },
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
      })


      if (!order) {
        return res.status(404).json({ success: false, message: 'O.P. não encontrada' })
      }


      res.json({ success: true, data: order })
    } catch (error) {
      console.error('Erro ao buscar O.P.:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }


  // 📁 Buscar por projeto (com paginação)
  static async getByProject(req, res) {
    try {
      const { id } = req.params


      const result = await buildQueryOptions(req, ProductionOrder, {
        where: { projectId: id },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: ProductionOrderController.projectAccessFilter(req)
          },
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
      })


      res.json({ success: true, ...result })
    } catch (error) {
      console.error('Erro ao buscar O.P. por projeto:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }


  // 🏢 Buscar por fornecedor (com paginação)
  static async getBySupplier(req, res) {
    try {
      const { id } = req.params


      const result = await buildQueryOptions(req, ProductionOrder, {
        where: { supplierId: id },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: ProductionOrderController.projectAccessFilter(req)
          },
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
      })


      res.json({ success: true, ...result })
    } catch (error) {
      console.error('Erro ao buscar O.P. por fornecedor:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }


  // 👤 Buscar por cliente (com paginação)
  static async getByCustomer(req, res) {
    try {
      const { id } = req.params


      const result = await buildQueryOptions(req, ProductionOrder, {
        where: { mainCustomerId: id },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: ProductionOrderController.projectAccessFilter(req)
          },
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
      })


      res.json({ success: true, ...result })
    } catch (error) {
      console.error('Erro ao buscar O.P. por cliente:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }


  // 📋 Buscar por pedido (com paginação)
  static async getByOrder(req, res) {
    try {
      const { id } = req.params


      const result = await buildQueryOptions(req, ProductionOrder, {
        where: { orderId: id },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: ProductionOrderController.projectAccessFilter(req)
          },
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
      })


      res.json({ success: true, ...result })
    } catch (error) {
      console.error('Erro ao buscar O.P. por pedido:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }


  // ✏️ Atualizar OP
  static async update(req, res) {
    try {
      const { id } = req.params
      const updates = req.body
      const order = await ProductionOrder.findByPk(id)
      if (!order) return res.status(404).json({ success: false, message: 'O.P. não encontrada' })


      await order.update(updates)
      res.json({ success: true, data: order })
    } catch (error) {
      console.error('Erro ao atualizar O.P.:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }


  // 🔧 Atualização parcial (PATCH)
  static async patch(req, res) {
    try {
      const { id } = req.params
      const updates = req.body


      const order = await ProductionOrder.findByPk(id)
      if (!order) return res.status(404).json({ success: false, message: 'O.P. não encontrada' })


      await order.update(updates)
      res.json({ success: true, data: order })
    } catch (error) {
      console.error('Erro ao atualizar O.P.:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }


  // 🗑️ Deletar OP
  static async delete(req, res) {
    try {
      const { id } = req.params
      const order = await ProductionOrder.findByPk(id)
      if (!order) return res.status(404).json({ success: false, message: 'O.P. não encontrada' })


      await order.destroy()
      res.json({ success: true, message: 'O.P. removida com sucesso' })
    } catch (error) {
      console.error('Erro ao deletar O.P.:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }
}


export default ProductionOrderController