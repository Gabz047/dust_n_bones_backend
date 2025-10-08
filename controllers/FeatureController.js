import Feature from '../models/Features.js';
import { v4 as uuidv4 } from 'uuid';

export default {
  // Criar característica do item
  async create(req, res) {
    try {
      const { name, options } = req.body;
      const { companyId, branchId } = req.context;

      // Verifica se já existe característica com mesmo nome na mesma company/branch
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
      return res.status(500).json({ success: false, message: 'Erro ao criar característica.' });
    }
  },

  // Buscar característica pelo ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const { companyId, branchId } = req.context;

      const feature = await Feature.findOne({ where: { id, companyId, branchId } });
      if (!feature) return res.status(404).json({ success: false, message: 'Característica não encontrada.' });

      return res.json({ success: true, data: feature });
    } catch (error) {
      console.error('Erro ao buscar característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar característica.' });
    }
  },

  // Buscar todas as características (GET) filtrando por company/branch
  async getAll(req, res) {
    try {
      const { companyId, branchId } = req.context;

      const features = await Feature.findAll({ where: { companyId, branchId } });

      return res.json({ success: true, data: features });
    } catch (error) {
      console.error('Erro ao buscar características:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar características.' });
    }
  },

  // Atualizar característica
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, options } = req.body;
      const { companyId, branchId } = req.context;

      const feature = await Feature.findOne({ where: { id, companyId, branchId } });
      if (!feature) return res.status(404).json({ success: false, message: 'Característica não encontrada.' });

      await feature.update({ name, options });
      return res.json({ success: true, data: feature });
    } catch (error) {
      console.error('Erro ao atualizar característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar característica.' });
    }
  },

  // Deletar característica
  async delete(req, res) {
    try {
      const { id } = req.params;
      const { companyId, branchId } = req.context;

      const feature = await Feature.findOne({ where: { id, companyId, branchId } });
      if (!feature) return res.status(404).json({ success: false, message: 'Característica não encontrada.' });

      await feature.destroy();
      return res.json({ success: true, message: 'Característica deletada com sucesso.' });
    } catch (error) {
      console.error('Erro ao deletar característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao deletar característica.' });
    }
  }
};
