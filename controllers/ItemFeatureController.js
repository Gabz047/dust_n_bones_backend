import { Item, Feature, ItemFeature } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

export default {
  // Criar associação item-característica
  async create(req, res) {
    try {
      const { itemId, featureId } = req.body;

      const item = await Item.findByPk(itemId);
      if (!item) return res.status(400).json({ success: false, message: 'Item não encontrado.' });

      const feature = await Feature.findByPk(featureId);
      if (!feature) return res.status(400).json({ success: false, message: 'Característica não encontrada.' });

      const existing = await ItemFeature.findOne({ where: { itemId, featureId } });
      if (existing) return res.status(400).json({ success: false, message: 'Item já possui essa característica.' });

      const itemFeature = await ItemFeature.create({ id: uuidv4(), itemId, featureId });

      return res.status(201).json({ success: true, data: itemFeature });
    } catch (error) {
      console.error('Erro ao criar associação item-característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao criar associação item-característica.' });
    }
  },

  // Buscar todas as associações item-característica
  async getAll(req, res) {
    try {
      const associations = await ItemFeature.findAll({
        include: [
          { model: Item, as: 'item', attributes: ['id', 'name'] },
          { model: Feature, as: 'feature', attributes: ['id', 'name'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.json({ success: true, data: associations });
    } catch (error) {
      console.error('Erro ao buscar associações item-característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar associações item-característica.' });
    }
  },

  // Buscar associação pelo ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const association = await ItemFeature.findByPk(id, {
        include: [
          { model: Item, as: 'item', attributes: ['id', 'name'] },
          { model: Feature, as: 'feature', attributes: ['id', 'name'] }
        ]
      });

      if (!association) return res.status(404).json({ success: false, message: 'Associação não encontrada.' });

      return res.json({ success: true, data: association });
    } catch (error) {
      console.error('Erro ao buscar associação item-característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar associação item-característica.' });
    }
  },

  // Buscar todas as associações de um item específico
  async getByItemId(req, res) {
    try {
      const { itemId } = req.params;

      const item = await Item.findByPk(itemId);
      if (!item) return res.status(404).json({ success: false, message: 'Item não encontrado.' });

      const associations = await ItemFeature.findAll({
        where: { itemId },
        include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }],
        order: [['createdAt', 'DESC']]
      });

      return res.json({ success: true, data: associations });
    } catch (error) {
      console.error('Erro ao buscar associações por item:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar associações por item.' });
    }
  },

  // Atualizar associação
  async update(req, res) {
    try {
      const { id } = req.params;
      const { featureId } = req.body;

      const association = await ItemFeature.findByPk(id);
      if (!association) return res.status(404).json({ success: false, message: 'Associação não encontrada.' });

      if (featureId && featureId !== association.featureId) {
        const featureExists = await Feature.findByPk(featureId);
        if (!featureExists) return res.status(400).json({ success: false, message: 'Característica não encontrada.' });

        const alreadyExists = await ItemFeature.findOne({ where: { itemId: association.itemId, featureId } });
        if (alreadyExists) return res.status(400).json({ success: false, message: 'Item já possui essa característica.' });

        association.featureId = featureId;
      }

      await association.save();
      return res.json({ success: true, data: association });
    } catch (error) {
      console.error('Erro ao atualizar associação item-característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar associação item-característica.' });
    }
  },

  // Deletar associação
  async delete(req, res) {
    try {
      const { id } = req.params;

      const association = await ItemFeature.findByPk(id);
      if (!association) return res.status(404).json({ success: false, message: 'Associação não encontrada.' });

      await association.destroy();
      return res.json({ success: true, message: 'Associação deletada com sucesso.' });
    } catch (error) {
      console.error('Erro ao deletar associação item-característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao deletar associação item-característica.' });
    }
  }
};
