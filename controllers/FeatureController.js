import Feature from '../models/Features.js';
import { v4 as uuidv4 } from 'uuid';
export default {
  // Criar característica do item
  async create(req, res) {
    try {
      const { name, options } = req.body;

      // Verifica se já existe característica com mesmo nome 
      const exists = await Feature.findOne({ where: { name } });
      if (exists) {
        return res.status(400).json({ success: false, message: 'Característica já existe.' });
      }

      const feature = await Feature.create({ id: uuidv4(), name, options });
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

      const feature = await Feature.findByPk(id);
      if (!feature) return res.status(404).json({ success: false, message: 'Característica não encontrada.' });

      return res.json({ success: true, data: feature });
    } catch (error) {
      console.error('Erro ao buscar característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar característica.' });
    }
  },

  // Atualizar característica
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, options } = req.body;

      const feature = await Feature.findByPk(id);
      if (!feature) return res.status(404).json({ success: false, message: 'Característica não encontrada.' });

      // Se quiser, pode validar se o name já existe para o mesmo item antes de atualizar aqui

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

      const feature = await Feature.findByPk(id);
      if (!feature) return res.status(404).json({ success: false, message: 'Característica não encontrada.' });

      await feature.destroy();
      return res.json({ success: true, message: 'Característica deletada com sucesso.' });
    } catch (error) {
      console.error('Erro ao deletar característica:', error);
      return res.status(500).json({ success: false, message: 'Erro ao deletar característica.' });
    }
  }
};
