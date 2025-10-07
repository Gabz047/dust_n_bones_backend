import ItemFeatureOption from '../models/ItemFeatureOption.js';
import ItemFeature from '../models/ItemFeature.js';
import Feature from '../models/Features.js';
import { v4 as uuidv4 } from 'uuid';
import FeatureOption from '../models/FeatureOption.js';
import { Op } from 'sequelize';

export default {
    // Criar ItemFeatureOption
    async create(req, res) {
        try {
                        console.log('Criando 🗑️')

            const { itemFeatureId, featureOptionId } = req.body;

            if (!itemFeatureId || !featureOptionId) {
                return res.status(400).json({ success: false, message: 'itemFeatureId e featureOptionId são obrigatórios.' });
            }

            const itemFeatureOption = await ItemFeatureOption.create({
                id: uuidv4(),
                itemFeatureId,
                featureOptionId
            });

            return res.status(201).json({ success: true, data: itemFeatureOption });
        } catch (error) {
            console.error('Erro ao criar ItemFeatureOption:', error);
            return res.status(500).json({ success: false, message: 'Erro ao criar ItemFeatureOption.' });
        }
    },

    async getByItemFeatures(req, res) {
  try {
    let itemFeatureIds = req.body.itemFeatureIds || req.query.itemFeatureIds;

    if (!itemFeatureIds || (Array.isArray(itemFeatureIds) && itemFeatureIds.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'É necessário enviar um array de itemFeatureIds.'
      });
    }

    itemFeatureIds = itemFeatureIds.map(id => id)

    const itemFeatureOptions = await ItemFeatureOption.findAll({
      where: { itemFeatureId:  itemFeatureIds },
      include: [
        {
          model: ItemFeature,
          as: 'itemFeature',
          include: [
            {
              model: Feature,
              as: 'feature',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: FeatureOption,
          as: 'featureOption',
          attributes: ['id', 'name']
        }
      ],
      // Ordena pelo nome da Feature associada
      order: [[{ model: ItemFeature, as: 'itemFeature' }, { model: Feature, as: 'feature' }, 'name', 'ASC']]
    });

    if (!itemFeatureOptions.length) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum registro encontrado para os IDs informados.'
      });
    }

    return res.json({ success: true, data: itemFeatureOptions });

  } catch (error) {
    console.error('Erro ao buscar ItemFeatureOptions por múltiplos itemFeatureIds:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar ItemFeatureOptions por múltiplos itemFeatureIds.'
    });
  }
},


    // Buscar por ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const itemFeatureOption = await ItemFeatureOption.findByPk(id);
            if (!itemFeatureOption) return res.status(404).json({ success: false, message: 'ItemFeatureOption não encontrada.' });

            return res.json({ success: true, data: itemFeatureOption });
        } catch (error) {
            console.error('Erro ao buscar ItemFeatureOption:', error);
            return res.status(500).json({ success: false, message: 'Erro ao buscar ItemFeatureOption.' });
        }
    },

    // Buscar todas
    async getAll(req, res) {
        try {
            const itemFeatureOptions = await ItemFeatureOption.findAll();
            return res.json({ success: true, data: itemFeatureOptions });
        } catch (error) {
            console.error('Erro ao buscar ItemFeatureOptions:', error);
            return res.status(500).json({ success: false, message: 'Erro ao buscar ItemFeatureOptions.' });
        }
    },

    // Buscar por itemFeatureId
    async getByItemFeature(req, res) {
        try {
            const { itemFeatureId } = req.params;
            const itemFeatureOptions = await ItemFeatureOption.findAll({
                where: { itemFeatureId },
                include: [
                    {
                        model: ItemFeature,
                        as: 'itemFeature',
                        include: [
                            {
                                model: Feature,
                                as: 'feature',
                                attributes: ['name']
                            },
                        ]
                    },
                    {
                        model: FeatureOption,
                        as: 'featureOption',
                        attributes: ['name']
                    }
                ]
            });

            return res.json({ success: true, data: itemFeatureOptions });
        } catch (error) {
            console.error('Erro ao buscar por itemFeatureId:', error);
            return res.status(500).json({ success: false, message: 'Erro ao buscar ItemFeatureOptions por itemFeatureId.' });
        }
    },

    // Buscar por featureOptionId
    async getByFeatureOption(req, res) {
        try {
            const { featureOptionId } = req.params;
            const itemFeatureOptions = await ItemFeatureOption.findAll({ where: { featureOptionId } });
            return res.json({ success: true, data: itemFeatureOptions });
        } catch (error) {
            console.error('Erro ao buscar por featureOptionId:', error);
            return res.status(500).json({ success: false, message: 'Erro ao buscar ItemFeatureOptions por featureOptionId.' });
        }
    },

    // Atualizar
    async update(req, res) {
        try {
            console.log('Atualizando 🗑️')

            const { id } = req.params;
            const { itemFeatureId, featureOptionId } = req.body;

            const itemFeatureOption = await ItemFeatureOption.findByPk(id);
            if (!itemFeatureOption) return res.status(404).json({ success: false, message: 'ItemFeatureOption não encontrada.' });

            await itemFeatureOption.update({ itemFeatureId, featureOptionId });
            return res.json({ success: true, data: itemFeatureOption });
        } catch (error) {
            console.error('Erro ao atualizar ItemFeatureOption:', error);
            return res.status(500).json({ success: false, message: 'Erro ao atualizar ItemFeatureOption.' });
        }
    },

    // Deletar
    async delete(req, res) {
        try {
            console.log('deletando 🗑️')
            const { id } = req.params;
            
            const itemFeatureOption = await ItemFeatureOption.findByPk(id);
            if (!itemFeatureOption) return res.status(404).json({ success: false, message: 'ItemFeatureOption não encontrada.' });

            await itemFeatureOption.destroy();
            return res.json({ success: true, message: 'ItemFeatureOption deletada com sucesso.' });
        } catch (error) {
            console.error('Erro ao deletar ItemFeatureOption:', error);
            return res.status(500).json({ success: false, message: 'Erro ao deletar ItemFeatureOption.' });
        }
    }
};
