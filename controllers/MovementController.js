// controllers/MovementController.js
import { Movement, User, Item, ItemFeature, Feature, ProductionOrder, Project } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.js';

class MovementController {
  // Criar movimentação pai
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { itemId, itemFeatureId, productionOrderId, userId, observation, movementType } = req.body;

      if (!itemId || !itemFeatureId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: itemId, itemFeatureId, userId'
        });
      }

      const movement = await Movement.create({
        id: uuidv4(),
        itemId,
        itemFeatureId,
        productionOrderId: productionOrderId || null,
        userId,
        observation: observation || null,
        movementType: movementType || 'manual',
        date: new Date()
      }, { transaction });

      await transaction.commit();
      res.status(201).json({ success: true, data: movement });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar movimentação:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { userId, productionOrderId, itemId, itemFeatureId } = req.query;
      const where = {};
      if (userId) where.userId = userId;
      if (productionOrderId) where.productionOrderId = productionOrderId;
      if (itemId) where.itemId = itemId;
      if (itemFeatureId) where.itemFeatureId = itemFeatureId;

      const { count, rows } = await Movement.findAndCountAll({
        where,
        include: [
          { model: Item, as: 'item', attributes: ['id', 'name'] },
          { model: ItemFeature, as: 'itemFeature', include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }] },
          { model: ProductionOrder, as: 'productionOrder' },
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          movements: rows,
          pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const movement = await Movement.findByPk(id, {
        include: [
          { model: Item, as: 'item', attributes: ['id', 'name'] },
          { model: ItemFeature, as: 'itemFeature', include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }] },
          { model: ProductionOrder, as: 'productionOrder',
            include: [{
              model: Project,
              as: 'project',
              attributes: ['id', 'name']
            }] },
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] }
        ]
      });

      if (!movement) return res.status(404).json({ success: false, message: 'Movimentação não encontrada' });
      res.json({ success: true, data: movement });
    } catch (error) {
      console.error('Erro ao buscar movimentação por ID:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getByMovementType(req, res) {
    try {
      const { type } = req.params;
      const movements = await Movement.findAll({
        where: { movementType: type },
        include: [
          { model: Item, as: 'item', attributes: ['id', 'name'] },
          { model: ItemFeature, as: 'itemFeature', include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }] },
          { model: ProductionOrder, as: 'productionOrder' },
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, data: movements });
    } catch (error) {
      console.error('Erro ao buscar movimentações por tipo:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getByItemFeature(req, res) {
    try {
      const { itemId, itemFeatureId } = req.params;
      const movements = await Movement.findAll({
        where: { itemId, itemFeatureId },
        include: [
          { model: Item, as: 'item', attributes: ['id', 'name'] },
          { model: ItemFeature, as: 'itemFeature', include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }] },
          { model: ProductionOrder, as: 'productionOrder' },
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, data: movements });
    } catch (error) {
      console.error('Erro ao buscar movimentações por item/feature:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getByProductionOrder(req, res) {
    try {
      const { productionOrderId } = req.params;
      const movements = await Movement.findAll({
        where: { productionOrderId },
        include: [
          { model: Item, as: 'item', attributes: ['id', 'name'] },
          { model: ItemFeature, as: 'itemFeature', include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }] },
          { model: ProductionOrder, as: 'productionOrder',
            include: [{
              model: Project,
              as: 'project'
            }]
           },
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, data: movements });
    } catch (error) {
      console.error('Erro ao buscar movimentações por ordem de produção:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getByUser(req, res) {
    try {
      const { userId } = req.params;
      const movements = await Movement.findAll({
        where: { userId },
        include: [
          { model: Item, as: 'item', attributes: ['id', 'name'] },
          { model: ItemFeature, as: 'itemFeature', include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }] },
          { model: ProductionOrder, as: 'productionOrder' },
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, data: movements });
    } catch (error) {
      console.error('Erro ao buscar movimentações por usuário:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }
}

export default MovementController;
