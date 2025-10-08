import { sequelize, MovementLogEntity, User, Account } from '../models/index.js';
import { Op } from 'sequelize';

class MovementLogEntityController {
  // Criar uma movimentação
static async create(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { status, method, entity, entityId, userId } = req.body;

    // Validação básica
    if (!status || !method || !entity || !entityId || !userId) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
    }

    let movementData = {
      status,
      method,
      entity,
      entityId,
      date: new Date(),
    };

    // Tenta achar um User com o ID enviado
    const user = await User.findByPk(userId);
    if (user) {
      movementData.userId = userId; // grava na coluna userId
    } else {
      // Se não for user, tenta achar Account
      const account = await Account.findByPk(userId);
      if (account) {
        movementData.accountId = userId; // grava na coluna accountId
      } else {
        // Nenhum dos dois
        return res.status(400).json({ error: 'O ID informado não corresponde a um User ou Account válido' });
      }
    }

    // Cria o movimento
    const movement = await MovementLogEntity.create(movementData, { transaction });
    await transaction.commit();

    return res.status(201).json(movement);
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ error: error.message });
  }
}



  // Buscar todos
  static async getAll(req, res) {
    try {
      const movements = await MovementLogEntity.findAll();
      return res.json(movements);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Buscar por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const movement = await MovementLogEntity.findByPk(id);
      if (!movement) return res.status(404).json({ error: 'Movimentação não encontrada' });
      return res.json(movement);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Buscar por Status
  static async getByStatus(req, res) {
    try {
      const { status } = req.params;
      const movements = await MovementLogEntity.findAll({ where: { status } });
      return res.json(movements);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Buscar por Method
  static async getByMethod(req, res) {
    try {
      const { method } = req.params;
      const movements = await MovementLogEntity.findAll({ where: { method } });
      return res.json(movements);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }


 // Buscar por User ou Account
static async getByUser(req, res) {
  try {
    const { userId } = req.query;

    // Determinar accountId a partir do contexto do backend (ex: usuário logado)
    const accountId = req.user?.accountId || null;

    if (!userId && !accountId) {
      return res.status(400).json({ error: 'Não foi possível determinar userId ou accountId' });
    }

    // Monta a condição com OR
    const whereClause = {
      [Op.or]: []
    };

    if (userId) whereClause[Op.or].push({ userId });
    if (accountId) whereClause[Op.or].push({ accountId });

    const movements = await MovementLogEntity.findAll({ where: whereClause });
    return res.json(movements);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}


  // Buscar por Data (intervalo)
  static async getByDate(req, res) {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        return res.status(400).json({ error: 'É necessário informar start e end (YYYY-MM-DD)' });
      }

      const movements = await MovementLogEntity.findAll({
        where: {
          date: {
            [Op.between]: [new Date(start), new Date(end)],
          },
        },
      });

      return res.json(movements);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Buscar por Entidade (ex: "fatura", "romaneio")
  static async getByEntity(req, res) {
    try {
      const { entity } = req.params;
      const movements = await MovementLogEntity.findAll({ where: { entity } });
      return res.json(movements);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Buscar por ID da Entidade (ex: todos logs de uma fatura específica)
  static async getByEntityId(req, res) {
    try {
      const { entityId } = req.params;
      const movements = await MovementLogEntity.findAll({ where: { entityId } });
      return res.json(movements);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Pegar último status de uma entidade
  static async getLastStatus(req, res) {
    try {
      const { entity, entityId } = req.query;
      if (!entity || !entityId) {
        return res.status(400).json({ error: 'É necessário informar entity e entityId' });
      }

      const lastMovement = await MovementLogEntity.findOne({
        where: { entity, entityId },
        order: [['date', 'DESC']],
      });

      if (!lastMovement) {
        return res.status(404).json({ error: 'Nenhuma movimentação encontrada para essa entidade' });
      }

      return res.json({ status: lastMovement.status, method: lastMovement.method, date: lastMovement.date });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export default MovementLogEntityController;
