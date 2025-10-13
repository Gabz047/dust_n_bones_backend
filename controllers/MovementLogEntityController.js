import { sequelize, MovementLogEntity, User, Account, Company, Branch, Invoice, Box, DeliveryNote, Expedition, InvoiceItem, Movement, Project } from '../models/index.js';
import { Op } from 'sequelize';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';
import { generateReferralId } from '../utils/globals/generateReferralId.js';

// Mapeamento de entity => Sequelize Model
const entityModelMap = {
  fatura: Invoice,
  caixa: Box,
  romaneio: DeliveryNote,
  expedição: Expedition,
  projeto: Project,
  movimentacao: Movement,
};

class MovementLogEntityController {
  // 🔒 Filtro de acesso por empresa/filial
static accessFilter(req) {
  const { companyId, branchId } = req.context || {};
  const filter = {};
  if (companyId) filter.companyId = companyId;
  if (branchId) filter.branchId = branchId;
  return filter;
}

  // ✅ Criar uma movimentação
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { status, method, entity, entityId, userId } = req.body;
      const { companyId, branchId } = req.context

      // Validação básica
      if (!status || !method || !entity || !entityId || !userId) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false,
          message: 'Campos obrigatórios: status, method, entity, entityId, userId' 
        });
      }

      const company = await Company.findOne({ where: { id: companyId } });
            const branch = branchId ? await Branch.findOne({ where: { id: branchId } }) : null;
      
            const companyRef = company?.referralId;
            const branchRef = branch?.referralId ?? null;
      
            const referralId = await generateReferralId({
              model: MovementLogEntity,
              transaction,
              companyId: companyRef,
              branchId: branchRef,
            });

      let movementData = {
        status,
        method,
        entity,
        entityId,
        companyId: companyId || req.context?.companyId,
        branchId: branchId || req.context?.branchId || null,
        date: new Date(),
        referralId,
      };

      // Tenta achar um User com o ID enviado
      const user = await User.findByPk(userId, { transaction });
      if (user) {
        movementData.userId = userId;
      } else {
        // Se não for user, tenta achar Account
        const account = await Account.findByPk(userId, { transaction });
        if (account) {
          movementData.accountId = userId;
        } else {
          await transaction.rollback();
          return res.status(400).json({ 
            success: false,
            message: 'O ID informado não corresponde a um User ou Account válido' 
          });
        }
      }

      // Cria o movimento
      const movement = await MovementLogEntity.create(movementData, { transaction });
      await transaction.commit();

      return res.status(201).json({ success: true, data: movement });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar log de movimentação:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor', 
        error: error.message 
      });
    }
  }

  // 📦 Buscar todos com paginação e filtros
  static async getAll(req, res) {
    console.log('Access filter:', MovementLogEntityController.accessFilter(req));
    try {
      const { status, method, entity, entityId, userId, accountId, term, fields } = req.query;
      const where = { ...MovementLogEntityController.accessFilter(req) };

      if (term && fields) {
              const searchFields = fields.split(',');
              where[Op.or] = searchFields.map((field) => ({
                [field]: { [Op.iLike]: `%${term}%` },
              }));
            }

      if (status) where.status = status;
      if (method) where.method = method;
      if (entity) where.entity = entity;
      if (entityId) where.entityId = entityId;
      if (userId) where.userId = userId;
      if (accountId) where.accountId = accountId;

      const result = await buildQueryOptions(req, MovementLogEntity, {
        where,
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: Account, as: 'account', attributes: ['id', 'username', 'email'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar logs de movimentação:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor', 
        error: error.message 
      });
    }
  }

  // 🔍 Buscar por ID
static async getById(req, res) {
  try {
    const { id } = req.params;

    // Busca o log
    const movement = await MovementLogEntity.findOne({
      where: { 
        id,
        ...MovementLogEntityController.accessFilter(req)
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
        { model: Account, as: 'account', attributes: ['id', 'username', 'email'] }
      ]
    });

    if (!movement) {
      return res.status(404).json({ 
        success: false, 
        message: 'Log de movimentação não encontrado' 
      });
    }

    const { entity, entityId } = movement;

    // Resolve o registro da entidade relacionada
    let entityRecord = null;
    const Model = entityModelMap[entity];
    if (Model) {
      entityRecord = await Model.findByPk(entityId);
    }
    console.log('EIIIIII-========', entityRecord, entityId, entity)
    res.json({ 
      success: true, 
      data: {
        ...movement.toJSON(),
        entityRecord, // null se não encontrado ou não mapeado
      }
    });

  } catch (error) {
    console.error('Erro ao buscar log com entityId:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor', 
      error: error.message 
    });
  }
}

  // 📊 Buscar por Status
  static async getByStatus(req, res) {
    try {
      const { status } = req.params;
      const { term, fields } = req.query;

      const where = { 
        status,
        ...MovementLogEntityController.accessFilter(req)
      };

      // 🔍 Filtro de pesquisa textual
      if (term && fields) {
        const searchFields = fields.split(',');
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${term}%` }
        }));
      }

      const result = await buildQueryOptions(req, MovementLogEntity, {
        where,
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: Account, as: 'account', attributes: ['id', 'username', 'email'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar por status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor', 
        error: error.message 
      });
    }
  }

  // 🔧 Buscar por Method
  static async getByMethod(req, res) {
    try {
      const { method } = req.params;

      const result = await buildQueryOptions(req, MovementLogEntity, {
        where: { 
          method,
          ...MovementLogEntityController.accessFilter(req)
        },
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: Account, as: 'account', attributes: ['id', 'username', 'email'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar por método:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor', 
        error: error.message 
      });
    }
  }

  // 👤 Buscar por User ou Account
  static async getByUser(req, res) {
    try {
      const { userId } = req.params;

      const whereClause = {
        [Op.or]: [{ userId }, { accountId: userId }],
        ...MovementLogEntityController.accessFilter(req)
      };

      const result = await buildQueryOptions(req, MovementLogEntity, {
        where: whereClause,
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: Account, as: 'account', attributes: ['id', 'username', 'email'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar por usuário:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor', 
        error: error.message 
      });
    }
  }

  // 📅 Buscar por Data (intervalo)
  static async getByDate(req, res) {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        return res.status(400).json({ 
          success: false,
          message: 'É necessário informar start e end (YYYY-MM-DD)' 
        });
      }

      const result = await buildQueryOptions(req, MovementLogEntity, {
        where: {
          date: {
            [Op.between]: [new Date(start), new Date(end)],
          },
          ...MovementLogEntityController.accessFilter(req)
        },
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: Account, as: 'account', attributes: ['id', 'username', 'email'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar por data:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor', 
        error: error.message 
      });
    }
  }

  // 📋 Buscar por Entidade (ex: "fatura", "romaneio")
  static async getByEntity(req, res) {
    try {
      const { entity } = req.params;

      const result = await buildQueryOptions(req, MovementLogEntity, {
        where: { 
          entity,
          ...MovementLogEntityController.accessFilter(req)
        },
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: Account, as: 'account', attributes: ['id', 'username', 'email'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar por entidade:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor', 
        error: error.message 
      });
    }
  }

  // 🔗 Buscar por ID da Entidade (ex: todos logs de uma fatura específica)
  static async getByEntityId(req, res) {
    try {
      const { entityId } = req.params;

      const result = await buildQueryOptions(req, MovementLogEntity, {
        where: { 
          entityId,
          ...MovementLogEntityController.accessFilter(req)
        },
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: Account, as: 'account', attributes: ['id', 'username', 'email'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar por entityId:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor', 
        error: error.message 
      });
    }
  }

  // 🎯 Pegar último status de uma entidade
  static async getLastStatus(req, res) {
    try {
      const { entity, entityId } = req.query;
      if (!entity || !entityId) {
        return res.status(400).json({ 
          success: false,
          message: 'É necessário informar entity e entityId' 
        });
      }

      const lastMovement = await MovementLogEntity.findOne({
        where: { 
          entity, 
          entityId,
          ...MovementLogEntityController.accessFilter(req)
        },
        order: [['date', 'DESC']],
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: Account, as: 'account', attributes: ['id', 'username', 'email'] }
        ]
      });

      if (!lastMovement) {
        return res.status(404).json({ 
          success: false,
          message: 'Nenhuma movimentação encontrada para essa entidade' 
        });
      }

      res.json({ 
        success: true, 
        data: {
          status: lastMovement.status, 
          method: lastMovement.method, 
          date: lastMovement.date,
          user: lastMovement.user || lastMovement.account
        }
      });
    } catch (error) {
      console.error('Erro ao buscar último status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor', 
        error: error.message 
      });
    }
  }
}

export default MovementLogEntityController;