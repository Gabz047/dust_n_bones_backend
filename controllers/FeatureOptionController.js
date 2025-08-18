import FeatureOption from '../models/FeatureOption.js';
import Feature from '../models/Features.js';

export default {
  // Criar opção de característica
  async create(req, res) {
    try {
      const { featureId, name } = req.body;

      // Verifica se a feature existe
      const feature = await Feature.findByPk(featureId);
      if (!feature) {
        return res.status(400).json({ success: false, message: 'Característica não encontrada' });
      }

      const featureOption = await FeatureOption.create({ featureId, name });

      return res.status(201).json({ success: true, data: featureOption });
    } catch (error) {
      console.error('Erro ao criar opção de característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao criar opção de característica.' });
    }
  },

  // Buscar todas as opções de característica
  async getAll(req, res) {
    try {
      const options = await FeatureOption.findAll({
        include: [{ model: Feature, as: 'feature' }],
        order: [['createdAt', 'DESC']]
      });

      return res.json({ success: true, data: options });
    } catch (error) {
      console.error('Erro ao buscar opções de característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar opções de característica.' });
    }
  },

  // Buscar opção de característica por ID
  async getById(req, res) {
    try {
      const { id } = req.params;

      const option = await FeatureOption.findByPk(id, {
        include: [{ model: Feature, as: 'feature' }]
      });

      if (!option) {
        return res.status(404).json({ success: false, message: 'Opção de característica não encontrada.' });
      }

      return res.json({ success: true, data: option });
    } catch (error) {
      console.error('Erro ao buscar opção de característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar opção de característica.' });
    }
  },

  // Buscar todas as opções de uma feature específica
  async getByFeatureId(req, res) {
    try {
      const { id } = req.params;
      console.log('id:', id);
      const feature = await Feature.findByPk(id);
      if (!feature) {
        return res.status(404).json({ success: false, message: 'Característica não encontrada.' });
      }

      const options = await FeatureOption.findAll({
        where: { featureId: id },
      });

      return res.json({ success: true, data: options });
    } catch (error) {
      console.error('Erro ao buscar opções da característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar opções da característica.' });
    }
  },

  // Atualizar opção de característica por ID
  async update(req, res) {
    try {
      const { id } = req.params;
      const { featureId, name } = req.body;

      const option = await FeatureOption.findByPk(id);
      if (!option) {
        return res.status(404).json({ success: false, message: 'Opção de característica não encontrada.' });
      }

      if (featureId) {
        const featureExists = await Feature.findByPk(featureId);
        if (!featureExists) {
          return res.status(400).json({ success: false, message: 'Característica não encontrada.' });
        }
        option.featureId = featureId;
      }

      if (name) option.name = name;

      await option.save();

      return res.json({ success: true, data: option });
    } catch (error) {
      console.error('Erro ao atualizar opção de característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar opção de característica.' });
    }
  },

  // Deletar opção de característica por ID
  async delete(req, res) {
    try {
      const { id } = req.params;

      const option = await FeatureOption.findByPk(id);
      if (!option) {
        return res.status(404).json({ success: false, message: 'Opção de característica não encontrada.' });
      }

      await option.destroy();

      return res.json({ success: true, message: 'Opção de característica removida com sucesso.' });
    } catch (error) {
      console.error('Erro ao deletar opção de característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao deletar opção de característica.' });
    }
  }
};
