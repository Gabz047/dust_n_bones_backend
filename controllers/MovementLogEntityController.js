import { sequelize, MovementLogEntity } from '../models/index.js';
import { Op } from 'sequelize';

class MovementLogEntityController {
  // Criar uma movimentação
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { status, method, entity, entityId, userId } = req.body;

      if (!status || !method || !entity || !entityId || !userId) {
        return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
      }

      const movement = await MovementLogEntity.create({
        status,
        method,
        entity,
        entityId,
        userId,
        date: new Date(),
      }, { transaction });

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

  // Buscar por User
  static async getByUser(req, res) {
    try {
      const { userId } = req.params;
      const movements = await MovementLogEntity.findAll({ where: { userId } });
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
