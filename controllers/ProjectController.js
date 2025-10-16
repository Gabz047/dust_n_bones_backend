// controllers/ProjectController.js
import { v4 as uuidv4 } from 'uuid'
import { Op } from 'sequelize'
import { Project, Company, Branch, Customer, ProductionOrder, User, Account, MovementLogEntity, Order, ProjectItem, Box, DeliveryNote, Invoice, Expedition, sequelize } from '../models/index.js'
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js'
import { generateReferralId } from '../utils/globals/generateReferralId.js'
import { resolveCompanyId, userAccessFilter } from '../utils/globals/requestHelpers.js'
class ProjectController {
   static async create(req, res) {
  try {
    const { branchId, customerId, totalQuantity, name, deliveryDate, userId } = req.body

    // 🔸 Resolve companyId
    const resolvedCompanyId = resolveCompanyId(req)
    if (!resolvedCompanyId) return res.status(400).json({ success: false, message: 'Não foi possível determinar a empresa.' })

    // ✅ Validar empresa
    const company = await Company.findByPk(resolvedCompanyId)
    if (!company || !company.active) return res.status(400).json({ success: false, message: 'Empresa inválida ou inativa' })

    // ✅ Validar filial
    let branch = null
    if (branchId) {
      branch = await Branch.findByPk(branchId)
      if (!branch || !branch.active) return res.status(400).json({ success: false, message: 'Filial inválida ou inativa' })
    }

    // ✅ Validar cliente
    let customer = null
    if (customerId) {
      customer = await Customer.findByPk(customerId)
      if (!customer) return res.status(400).json({ success: false, message: 'Cliente não encontrado' })
    }

    // ✅ Validar usuário/conta
    const user = await User.findByPk(userId)
    let account = null
    if (!user) account = await Account.findByPk(userId)
    if (!user && !account) return res.status(400).json({ success: false, message: 'ID inválido de usuário ou conta' })

    // 🔹 Transação apenas para criação
    const transaction = await sequelize.transaction()
    try {
      const projectId = uuidv4()
      const referralId = await generateReferralId({ model: Project, transaction, companyId: resolvedCompanyId })

      const project = await Project.create({
        id: projectId,
        name,
        referralId,
        deliveryDate,
        companyId: resolvedCompanyId,
        branchId: branchId || null,
        customerId: customerId || null,
        totalQuantity: totalQuantity || 0
      }, { transaction })

      const MreferralId = await generateReferralId({ model: MovementLogEntity, transaction, companyId: resolvedCompanyId })

      const movementData = {
        method: 'criação',
        entity: 'projeto',
        entityId: project.id,
        status: 'aberto',
        companyId: resolvedCompanyId,
        branchId: branchId || null,
        referralId: MreferralId,
        userId: user?.id || undefined,
        accountId: account?.id || undefined
      }

      await MovementLogEntity.create(movementData, { transaction })
      await transaction.commit()
      return res.status(201).json({ success: true, data: project })

    } catch (error) {
      await transaction.rollback()
      console.error('Erro ao criar projeto (transação):', error)
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }

  } catch (error) {
    console.error('Erro ao criar projeto:', error)
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
  }
}



  // 🔒 Filtro de acesso por empresa/filial
static contextFilter(req) {
  const companyId = req.context?.companyId || req.user?.companyId
  if (!companyId) return { companyId: null } // segurança: não retorna projetos de outras empresas

  const branchId = req.context?.branchId || req.user?.branchId || null

  return branchId
    ? { companyId, branchId }
    : { companyId } // pega todos da empresa, independente da branch
}

  // ...


   static async getAll(req, res) {
   try {
    const { term, fields, active, customerId } = req.query

    // 1️⃣ Filtro de acesso
    const baseWhere = await userAccessFilter(req)

    // 2️⃣ Filtros adicionais
    if (active !== undefined) baseWhere.active = active === 'true'
    if (customerId) baseWhere.customerId = customerId

    // 3️⃣ Campos de texto vs UUID
    const textFields = ['name', 'referralId']               // campos de texto
    const uuidFields = ['branchId', 'referralId'] // campos UUID

    if (term && fields) {
      const searchFields = fields.split(',')
      baseWhere[Op.or] = []

      for (const f of searchFields) {
        if (textFields.includes(f)) {
          baseWhere[Op.or].push({ [f]: { [Op.iLike]: `%${term}%` } })
        } else if (uuidFields.includes(f)) {
          // Verifica se o termo é um UUID válido (simples regex)
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term)) {
            baseWhere[Op.or].push({ [f]: term })
          }
        }
      }
    }

    // 4️⃣ Build query
    const result = await buildQueryOptions(req, Project, {
      where: baseWhere,
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] },
        { model: Customer, as: 'customer', attributes: ['id', 'name'] }
      ]
    })

    // 5️⃣ Enriquecer com último log
    const projectIds = result.data.map(p => p.id)
    const logs = await MovementLogEntity.findAll({
      where: { entity: 'projeto', entityId: { [Op.in]: projectIds } },
      attributes: ['entityId', 'status'],
      order: [['createdAt', 'DESC']]
    })

    const lastLogsMap = {}
    for (const log of logs) {
      if (!lastLogsMap[log.entityId]) lastLogsMap[log.entityId] = log
    }

    const enrichedData = result.data.map(p => ({
      ...p.toJSON(),
      lastMovementLog: lastLogsMap[p.id]?.status ?? null
    }))

    res.json({ success: true, ...result, data: enrichedData })
  } catch (error) {
    console.error('Erro ao buscar projetos:', error)
    res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
  }
  }

  // --------------------- GET BY ID ---------------------
  static async getById(req, res) {
    try {
      const { id } = req.params
      const where = { id, ...(await userAccessFilter(req)) }

      const project = await Project.findOne({
        where,
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name'] },
          { model: Branch, as: 'branch', attributes: ['id', 'name'] },
          { model: Customer, as: 'customer', attributes: ['id', 'name'] }
        ]
      })

      if (!project) return res.status(404).json({ success: false, message: 'Projeto não encontrado' })

      const lastLog = await MovementLogEntity.findOne({
        where: { entity: 'projeto', entityId: id },
        order: [['createdAt', 'DESC']],
        attributes: ['status']
      })

      res.json({
        success: true,
        data: { ...project.toJSON(), lastMovementLog: lastLog ? lastLog.status : null }
      })
    } catch (error) {
      console.error('Erro ao buscar projeto:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }


  static async getAllOpen(req, res) {
    try {
      const { customerId, term, fields } = req.query
      const where = {}

      if (customerId) where.customerId = customerId

      // 🔍 Filtro textual
      if (term && fields) {
        const searchFields = fields.split(',')
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${term}%` }
        }))
      }

      Object.assign(where, ProjectController.contextFilter(req))

      // 💡 Pega somente projetos cujo último log é 'aberto'
      where.id = {
        [Op.in]: sequelize.literal(`
    (
      SELECT "entity_id" FROM (
        SELECT DISTINCT ON ("entity_id") "entity_id", "status", "created_at"
        FROM "movement_log_entities"
        WHERE "entity" = 'projeto'
        ORDER BY "entity_id", "created_at" DESC
      ) AS last_logs
      WHERE last_logs."status" = 'aberto'
    )
  `)
      }

      // 📦 Buscar apenas projetos abertos
      const result = await buildQueryOptions(req, Project, {
        where,
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name'] },
          { model: Branch, as: 'branch', attributes: ['id', 'name'] },
          { model: Customer, as: 'customer', attributes: ['id', 'name'] }
        ]
      })

      // 🔁 Adicionar o último status para exibir
      const projectIds = result.data.map(p => p.id)
      const logs = await MovementLogEntity.findAll({
        where: { entity: 'projeto', entityId: { [Op.in]: projectIds } },
        attributes: ['entityId', 'status'],
        order: [['createdAt', 'DESC']]
      })

      const lastLogsMap = {}
      for (const log of logs) {
        if (!lastLogsMap[log.entityId]) lastLogsMap[log.entityId] = log
      }

      const enrichedData = result.data.map(p => ({
        ...p.toJSON(),
        lastMovementLog: lastLogsMap[p.id]?.status ?? null
      }))

      res.json({ success: true, ...result, data: enrichedData })
    } catch (error) {
      console.error('Erro ao buscar projetos abertos:', error)
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      })
    }
  }

 static async getAllWithoutInvoice(req, res) {
  try {
    const { customerId, term, fields } = req.query
    const where = {}

    if (customerId) where.customerId = customerId

    if (term && fields) {
      const searchFields = fields.split(',')
      where[Op.or] = searchFields.map((field) => ({
        [field]: { [Op.iLike]: `%${term}%` }
      }))
    }

    Object.assign(where, ProjectController.contextFilter(req))

    // ✅ Nova forma — evita travamento com sequelize.literal
    const usedProjectIds = await Invoice.findAll({
      attributes: ['projectId'],
      where: { projectId: { [Op.ne]: null } },
      raw: true
    })
    const usedIds = usedProjectIds.map(p => p.projectId)
    if (usedIds.length > 0) where.id = { [Op.notIn]: usedIds }

    const result = await buildQueryOptions(req, Project, {
      where,
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] },
        { model: Customer, as: 'customer', attributes: ['id', 'name'] }
      ]
    })

    const projectIds = result.data.map(p => p.id)
    const logs = await MovementLogEntity.findAll({
      where: { entity: 'projeto', entityId: { [Op.in]: projectIds } },
      attributes: ['entityId', 'status'],
      order: [['createdAt', 'DESC']]
    })

    const lastLogsMap = {}
    for (const log of logs) {
      if (!lastLogsMap[log.entityId]) lastLogsMap[log.entityId] = log
    }

    const enrichedData = result.data.map(p => ({
      ...p.toJSON(),
      lastMovementLog: lastLogsMap[p.id]?.status ?? null
    }))

    return res.status(200).json({ success: true, ...result, data: enrichedData })
  } catch (error) {
    console.error('Erro ao buscar projetos sem invoice:', error)
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    })
  }
}

static async update(req, res) {
  try {
    const { id } = req.params
    const updates = req.body
    const { userId } = updates

    // 🔸 Valida usuário/conta
    const user = await User.findByPk(userId)
    const account = user ? null : await Account.findByPk(userId)
    if (!user && !account) return res.status(400).json({ success: false, message: 'ID inválido de usuário ou conta' })

    // 🔹 Transação apenas para update
    const transaction = await sequelize.transaction()
    try {
      const where = { id, ...(await userAccessFilter(req)) }
      const project = await Project.findOne({ where, transaction })
      if (!project) {
        await transaction.rollback()
        return res.status(404).json({ success: false, message: 'Projeto não encontrado' })
      }

      await project.update(updates, { transaction })

      const companyId = resolveCompanyId(req, project.companyId)
      const referralId = await generateReferralId({ model: MovementLogEntity, transaction, companyId })

      const movementData = {
        method: 'edição',
        entity: 'projeto',
        entityId: project.id,
        status: 'aberto',
        companyId,
        branchId: project.branchId || null,
        referralId,
        userId: user?.id || undefined,
        accountId: account?.id || undefined
      }

      await MovementLogEntity.create(movementData, { transaction })
      await transaction.commit()
      return res.json({ success: true, data: project })

    } catch (error) {
      await transaction.rollback()
      console.error('Erro ao atualizar projeto (transação):', error)
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }

  } catch (error) {
    console.error('Erro ao atualizar projeto:', error)
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
  }
}


  // 🗑️ Deletar projeto
 static async delete(req, res) {
    const transaction = await sequelize.transaction()
    try {
      const { id } = req.params
      const { userId } = req.body

      const where = { id, ...(await userAccessFilter(req)) }
      const project = await Project.findOne({ where, transaction })
      if (!project) {
        await transaction.rollback()
        return res.status(404).json({ success: false, message: 'Projeto não encontrado' })
      }

      // 🔍 Checa relações
      const relations = [
        { model: ProductionOrder, name: 'ordem de produção' },
        { model: Order, name: 'pedido' },
        { model: Box, name: 'box' },
        { model: DeliveryNote, name: 'nota de entrega' },
        { model: Expedition, name: 'expedição' },
        { model: Invoice, name: 'invoice' }
      ]

      for (const rel of relations) {
        const exists = await rel.model.findOne({ where: { projectId: id }, transaction })
        if (exists) {
          await transaction.rollback()
          return res.status(400).json({
            success: false,
            message: `Projeto não pode ser removido: possui ${rel.name} vinculada.`
          })
        }
      }

      await project.destroy({ transaction })
      const referralId = await generateReferralId({
        model: MovementLogEntity,
        transaction,
        companyId: project.companyId
      })

      const movementData = {
        method: 'remoção',
        entity: 'projeto',
        entityId: project.id,
        status: 'finalizado',
        companyId: project.companyId,
        branchId: project.branchId,
        referralId
      }

      const user = await User.findByPk(userId)
      if (user) movementData.userId = userId
      else {
        const account = await Account.findByPk(userId)
        if (account) movementData.accountId = userId
        else {
          await transaction.rollback()
          return res.status(400).json({ success: false, message: 'ID inválido de usuário ou conta' })
        }
      }

      await MovementLogEntity.create(movementData, { transaction })
      await transaction.commit()
      res.json({ success: true, message: 'Projeto removido com sucesso' })
    } catch (error) {
      await transaction.rollback()
      console.error('Erro ao deletar projeto:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }

  // 👤 Buscar projetos por cliente com lastMovementLog
  static async getByCustomer(req, res) {
    try {
      const { customerId } = req.params

      const result = await buildQueryOptions(req, Project, {
        where: { customerId, ...ProjectController.contextFilter(req) },
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name'] },
          { model: Branch, as: 'branch', attributes: ['id', 'name'] },
          { model: Customer, as: 'customer', attributes: ['id', 'name'] }
        ]
      })

      const projectIds = result.data.map(p => p.id)
      const logs = await MovementLogEntity.findAll({
        where: { entity: 'projeto', entityId: { [Op.in]: projectIds } },
        attributes: ['entityId', 'status'],
        order: [['createdAt', 'DESC']]
      })

      const lastLogsMap = {}
      for (const log of logs) {
        if (!lastLogsMap[log.entityId]) lastLogsMap[log.entityId] = log
      }

      const enrichedData = result.data.map(p => ({
        ...p.toJSON(),
        lastMovementLog: lastLogsMap[p.id] ? lastLogsMap[p.id].status : null
      }))

      res.json({ success: true, ...result, data: enrichedData })
    } catch (error) {
      console.error('Erro ao buscar projetos por cliente:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }
}

export default ProjectController