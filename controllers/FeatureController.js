import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import {
  Branch,
  Company,
  Feature,
  MovementItem,
  StockItem,
  BoxItem,
  StockAdditionalItem,
  ItemFeature,
  ItemFeatureOption,
  FeatureOption,
  ProductionOrderItemAdditionalFeatureOption,
  OrderItemAdditionalFeatureOption,
} from '../models/index.js';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';
import sequelize from '../config/database.js';
import { generateReferralId } from '../utils/globals/generateReferralId.js';

class FeatureController {
  // 🧾 Criar característica
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { name, options } = req.body;
      const { companyId, branchId } = req.context;

      const exists = await Feature.findOne({ where: { name, companyId, branchId } });
      if (exists) {
        return res.status(400).json({ success: false, message: 'Característica já existe.' });
      }

       const company = await Company.findOne({ where: { id: companyId } });
      
            const referralId = await generateReferralId({
              model: Feature,
              transaction,
              companyId: company.id,
            });

      const feature = await Feature.create({
        name,
        referralId,
        options,
        companyId,
        branchId
      });

      return res.status(201).json({ success: true, data: feature });
    } catch (error) {
      console.error('Erro ao criar característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao criar característica.', error: error.message });
    }
  }

  // 🔒 Filtro de acesso por empresa/filial
  static accessFilter(req) {
    const { companyId, branchId } = req.context || {};
    return {
      companyId,
      ...(branchId ? { branchId } : {})
    };
  }

  // 📦 Buscar todas as características (com filtros, search e paginação)
  static async getAll(req, res) {
    try {
      const { term, fields } = req.query;

      const where = FeatureController.accessFilter(req);

      if (term && fields) {
        const searchFields = fields.split(',');
        where[Op.or] = searchFields.map(field => ({
          [field]: { [Op.iLike]: `%${term}%` }
        }));
      }

      const result = await buildQueryOptions(req, Feature, { where });

      return res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar características:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar características.', error: error.message });
    }
  }

  // 🔍 Buscar por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const feature = await buildQueryOptions(req, Feature, {
        where: { id, ...FeatureController.accessFilter(req) }
      });

      if (!feature || feature.data.length === 0) {
        return res.status(404).json({ success: false, message: 'Característica não encontrada.' });
      }

      return res.json({ success: true, data: feature.data[0] });
    } catch (error) {
      console.error('Erro ao buscar característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar característica.', error: error.message });
    }
  }

  // 🔄 Atualizar característica
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { name, options } = req.body;

      const feature = await Feature.findOne({
        where: { id, ...FeatureController.accessFilter(req) }
      });

      if (!feature) return res.status(404).json({ success: false, message: 'Característica não encontrada.' });

      await feature.update({ name, options });
      return res.json({ success: true, data: feature });
    } catch (error) {
      console.error('Erro ao atualizar característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar característica.', error: error.message });
    }
  }

  // ❌ Deletar característica
 

static async delete(req, res) {
  try {
    const { id } = req.params;

    const feature = await Feature.findOne({
      where: { id, ...FeatureController.accessFilter(req) },
      include: [
        { model: ItemFeature, as: 'itemFeatures' },
        { model: FeatureOption, as: 'options', include: [
          { model: ItemFeatureOption, as: 'itemFeatureOptions' },
          { model: OrderItemAdditionalFeatureOption, as: 'additionalOptions' },
          { model: ProductionOrderItemAdditionalFeatureOption, as: 'additionalOptionsByOption' },
          { model: MovementItem, as: 'featureOptions' },
          { model: StockItem, as: 'stockItems' },
          { model: StockAdditionalItem, as: 'additionalStockItems' },
          { model: BoxItem, as: 'boxItems' }
        ]}
      ]
    });

    if (!feature) 
      return res.status(404).json({ success: false, message: 'Característica não encontrada.' });

    const registrosVinculados = [];

    if (feature.itemFeatures.length > 0) registrosVinculados.push(`Itens de característica: ${feature.itemFeatures.length}`);
    
    feature.options.forEach(option => {
      if (option.itemFeatureOptions.length > 0) registrosVinculados.push(`Opções de item de característica: ${option.itemFeatureOptions.length}`);
      if (option.additionalOptions.length > 0) registrosVinculados.push(`Opções adicionais de pedido: ${option.additionalOptions.length}`);
      if (option.additionalOptionsByOption.length > 0) registrosVinculados.push(`Opções adicionais de ordem de produção: ${option.additionalOptionsByOption.length}`);
      if (option.featureOptions.length > 0) registrosVinculados.push(`Itens de movimentação: ${option.featureOptions.length}`);
      if (option.stockItems.length > 0) registrosVinculados.push(`Itens de estoque: ${option.stockItems.length}`);
      if (option.additionalStockItems.length > 0) registrosVinculados.push(`Itens adicionais de estoque: ${option.additionalStockItems.length}`);
      if (option.boxItems.length > 0) registrosVinculados.push(`Itens de caixa: ${option.boxItems.length}`);
    });

    if (registrosVinculados.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: `Não é possível deletar. Esta característica está vinculada aos seguintes registros: ${registrosVinculados.join(', ')}.`
      });
    }

    await feature.destroy();
    return res.json({ success: true, message: 'Característica deletada com sucesso.' });

  } catch (error) {
    console.error('Erro ao deletar característica:', error);
    return res.status(500).json({ success: false, message: 'Erro ao deletar característica.', error: error.message });
  }
}


}

export default FeatureController;
