import { sequelize, MovementLogEntityItem } from '../models/index.js';
import { Op } from 'sequelize';

class MovementLogEntityItemController {
  // Criar em batch (vários itens de uma vez)
  static async createBatch(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { items } = req.body;

      if (!Array.isArray(items) || !items.length) {
        return res.status(400).json({ error: 'É necessário enviar um array de items' });
      }

      const createdItems = await MovementLogEntityItem.bulkCreate(
        items.map(item => ({
          movementLogEntityId: item.movementLogEntityId,
          entity: item.entity,
          entityId: item.entityId,
          quantity: item.quantity || 1,
          date: new Date(),
        })),
        { transaction }
      );

      await transaction.commit();
      return res.status(201).json(createdItems);
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  // Buscar todos
  static async getAll(req, res) {
    try {
      const items = await MovementLogEntityItem.findAll();
      return res.json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Buscar por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const item = await MovementLogEntityItem.findByPk(id);
      if (!item) return res.status(404).json({ error: 'Item não encontrado' });
      return res.json(item);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Buscar por MovementLogEntity
  static async getByMovementLogEntity(req, res) {
    try {
      const { movementLogEntityId } = req.params;
      const items = await MovementLogEntityItem.findAll({ where: { movementLogEntityId } });
      return res.json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Buscar por entidade (romaneio, fatura, caixa, expedição)
  static async getByEntity(req, res) {
    try {
      const { entity } = req.params;
      const items = await MovementLogEntityItem.findAll({ where: { entity } });
      return res.json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Buscar por entityId (ex: todos itens vinculados a uma fatura específica)
  static async getByEntityId(req, res) {
    try {
      const { entityId } = req.params;
      const items = await MovementLogEntityItem.findAll({ where: { entityId } });
      return res.json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Buscar por intervalo de datas
  static async getByDate(req, res) {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        return res.status(400).json({ error: 'É necessário informar start e end (YYYY-MM-DD)' });
      }

      const items = await MovementLogEntityItem.findAll({
        where: {
          date: {
            [Op.between]: [new Date(start), new Date(end)],
          },
        },
      });

      return res.json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export default MovementLogEntityItemController;
