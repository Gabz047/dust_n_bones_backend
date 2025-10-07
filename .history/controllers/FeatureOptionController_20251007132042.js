import FeatureOption from '../models/FeatureOption.js';
import Feature from '../models/Features.js';
import sequelize from '../config/database.js';
export default {
  // Criar opção de característica
async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { featureId, options } = req.body; // options: array de nomes

      if (!featureId) {
        return res.status(400).json({ success: false, message: 'featureId não fornecido.' });
      }
      if (!Array.isArray(options) || !options.length) {
        return res.status(400).json({ success: false, message: 'Nenhuma opção fornecida.' });
      }

      // Verifica se a feature existe
      const feature = await Feature.findByPk(featureId, { transaction });
      if (!feature) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Característica não encontrada.' });
      }

      // Buscar opções já existentes para evitar duplicidade
      const existingOptions = await FeatureOption.findAll({
        where: { featureId, name: options },
        transaction
      });
      const existingNames = existingOptions.map(o => o.name);

      // Filtrar apenas as opções novas
      const newOptionsData = options
        .filter(name => !existingNames.includes(name))
        .map(name => ({ featureId, name }));

      if (!newOptionsData.length) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Nenhuma opção nova para criar (todas duplicadas).' });
      }

      // Criar todas as novas opções de uma vez
      const createdOptions = await FeatureOption.bulkCreate(newOptionsData, { transaction });

      await transaction.commit();

      return res.status(201).json({ success: true, data: createdOptions });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar opções de característica em batch:', error);
      return res.status(500).json({ success: false, message: 'Erro ao criar opções de característica.' });
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
