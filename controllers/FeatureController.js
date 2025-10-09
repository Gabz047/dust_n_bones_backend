import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import Feature from '../models/Features.js';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';

class FeatureController {
  // 🧾 Criar característica
  static async create(req, res) {
    try {
      const { name, options } = req.body;
      const { companyId, branchId } = req.context;

      const exists = await Feature.findOne({ where: { name, companyId, branchId } });
      if (exists) {
        return res.status(400).json({ success: false, message: 'Característica já existe.' });
      }

      const feature = await Feature.create({
        id: uuidv4(),
        name,
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
        where: { id, ...FeatureController.accessFilter(req) }
      });

      if (!feature) return res.status(404).json({ success: false, message: 'Característica não encontrada.' });

      await feature.destroy();
      return res.json({ success: true, message: 'Característica deletada com sucesso.' });
    } catch (error) {
      console.error('Erro ao deletar característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao deletar característica.', error: error.message });
    }
  }
}

export default FeatureController;
