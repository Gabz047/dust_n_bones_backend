// controllers/MovementController.js
import { v4 as uuidv4 } from 'uuid'
import { Op } from 'sequelize'
import sequelize from '../config/database.js'
import {
  Movement,
  User,
  Account,
  Item,
  ItemFeature,
  Feature,
  ProductionOrder,
  Project
} from '../models/index.js'
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js'

class MovementController {
  // 🧾 Criar movimentação
  static async create(req, res) {
    const transaction = await sequelize.transaction()
    try {
      const { itemId, itemFeatureId, productionOrderId, userId, observation, movementType } = req.body

      if (!itemId || !itemFeatureId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: itemId, itemFeatureId, userId'
        })
      }

      // 🔍 Verifica se o ID pertence a User ou Account
      const user = await User.findByPk(userId)
      const account = user ? null : await Account.findByPk(userId)

      if (!user && !account) {
        await transaction.rollback()
        return res.status(400).json({
          success: false,
          message: 'O ID informado não corresponde a um User ou Account válido'
        })
      }

      const movementData = {
        id: uuidv4(),
        itemId,
        itemFeatureId,
        productionOrderId: productionOrderId || null,
        observation: observation || null,
        movementType: movementType || 'manual',
        date: new Date(),
        ...(user ? { userId } : { accountId: userId })
      }

      const movement = await Movement.create(movementData, { transaction })
      await transaction.commit()

      res.status(201).json({ success: true, data: movement })
    } catch (error) {
      await transaction.rollback()
      console.error('Erro ao criar movimentação:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }

  // 🔒 Filtro de acesso por empresa/filial
  static itemAccessFilter(req) {
    const { companyId, branchId } = req.context || {}
    return {
      companyId,
      ...(branchId ? { branchId } : {})
    }
  }

  // 📦 Buscar todas as movimentações
  static async getAll(req, res) {
    try {
      const { userId, accountId, productionOrderId, itemId, itemFeatureId } = req.query
      const where = {}

      if (userId) where.userId = userId
      if (accountId) where.accountId = accountId
      if (productionOrderId) where.productionOrderId = productionOrderId
      if (itemId) where.itemId = itemId
      if (itemFeatureId) where.itemFeatureId = itemFeatureId

      const result = await buildQueryOptions(req, Movement, {
        where,
        include: [
          {
            model: Item,
            as: 'item',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: MovementController.itemAccessFilter(req)
          },
          {
            model: ItemFeature,
            as: 'itemFeature',
            include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }]
          },
          {
            model: ProductionOrder,
            as: 'productionOrder',
            include: [{ model: Project, as: 'project', attributes: ['id', 'name'] }]
          },
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: Account, as: 'account', attributes: ['id', 'username', 'email'] }
        ]
      })

      res.json({ success: true, ...result })
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }

  // 🔍 Buscar por ID
  static async getById(req, res) {
    try {
      const { id } = req.params

      const movement = await Movement.findByPk(id, {
        include: [
          {
            model: Item,
            as: 'item',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: MovementController.itemAccessFilter(req)
          },
          {
            model: ItemFeature,
            as: 'itemFeature',
            include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }]
          },
          {
            model: ProductionOrder,
            as: 'productionOrder',
            include: [{ model: Project, as: 'project', attributes: ['id', 'name'] }]
          },
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: Account, as: 'account', attributes: ['id', 'username', 'email'] }
        ]
      })

      if (!movement)
        return res.status(404).json({ success: false, message: 'Movimentação não encontrada' })

      res.json({ success: true, data: movement })
    } catch (error) {
      console.error('Erro ao buscar movimentação por ID:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }

// 🔁 Buscar por tipo (entrada/saída/manual) com search
static async getByMovementType(req, res) {
  try {
    const { type } = req.params
    const { term, fields } = req.query

    // Base do filtro
    const where = { movementType: type }

    // 🔍 Filtro de pesquisa textual
    if (term && fields) {
      const searchFields = fields.split(',')
      where[Op.or] = searchFields.map((field) => ({
        [field]: { [Op.iLike]: `%${term}%` } // Postgres case-insensitive LIKE
      }))
    }

    const result = await buildQueryOptions(req, Movement, {
      where,
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'companyId', 'branchId'],
          where: MovementController.itemAccessFilter(req)
        },
        {
          model: ItemFeature,
          as: 'itemFeature',
          include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }]
        },
        { model: ProductionOrder, as: 'productionOrder', include: [
          {
            model: Project,
            as: 'project',
            attributes: ['name']
          }
        ] },
        { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
        { model: Account, as: 'account', attributes: ['id', 'username', 'email'] }
      ]
    })

    res.json({ success: true, ...result })
  } catch (error) {
    console.error('Erro ao buscar movimentações por tipo:', error)
    res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
  }
}

  // 🔗 Buscar por item/feature
  static async getByItemFeature(req, res) {
    try {
      const { itemId, itemFeatureId } = req.params

      const result = await buildQueryOptions(req, Movement, {
        where: { itemId, itemFeatureId },
        include: [
          {
            model: Item,
            as: 'item',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: MovementController.itemAccessFilter(req)
          },
          {
            model: ItemFeature,
            as: 'itemFeature',
            include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }]
          },
          { model: ProductionOrder, as: 'productionOrder' },
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: Account, as: 'account', attributes: ['id', 'username', 'email'] }
        ]
      })

      res.json({ success: true, ...result })
    } catch (error) {
      console.error('Erro ao buscar movimentações por item/feature:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }

  // 🏭 Buscar por ordem de produção
  static async getByProductionOrder(req, res) {
    try {
      const { productionOrderId } = req.params

      const result = await buildQueryOptions(req, Movement, {
        where: { productionOrderId },
        include: [
          {
            model: Item,
            as: 'item',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: MovementController.itemAccessFilter(req)
          },
          {
            model: ItemFeature,
            as: 'itemFeature',
            include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }]
          },
          {
            model: ProductionOrder,
            as: 'productionOrder',
            include: [{ model: Project, as: 'project' }]
          },
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: Account, as: 'account', attributes: ['id', 'username', 'email'] }
        ]
      })

      res.json({ success: true, ...result })
    } catch (error) {
      console.error('Erro ao buscar movimentações por ordem de produção:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }

  // 👤 Buscar por usuário
  static async getByUser(req, res) {
    try {
      const { userId } = req.params

      const result = await buildQueryOptions(req, Movement, {
        where: { userId },
        include: [
          {
            model: Item,
            as: 'item',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: MovementController.itemAccessFilter(req)
          },
          {
            model: ItemFeature,
            as: 'itemFeature',
            include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }]
          },
          { model: ProductionOrder, as: 'productionOrder' },
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: Account, as: 'account', attributes: ['id', 'username', 'email'] }
        ]
      })

      res.json({ success: true, ...result })
    } catch (error) {
      console.error('Erro ao buscar movimentações por usuário:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }
}

export default MovementController
