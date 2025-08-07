import Item from '../models/Item.js';
import ItemFeature from '../models/ItemFeature.js';
import Company from '../models/Company.js';
import Branch from '../models/Branch.js';

export default {
  // Criar um item
  async create(req, res) {
    try {
      const data = req.body;

      const item = await Item.create(data);
      return res.status(201).json({ success: true, data: item });
    } catch (error) {
      console.error('Erro ao criar item:', error);
      return res.status(500).json({ success: false, message: 'Erro ao criar item.' });
    }
  },

  // Buscar todos os itens com relacionamentos
  async getAll(req, res) {
    try {
      const items = await Item.findAll({
        include: [
          { model: ItemFeature, as: 'features' },
          { model: Company, as: 'company' },
          { model: Branch, as: 'branch' },
        ],
        order: [['createdAt', 'DESC']],
      });

      return res.json({ success: true, data: items });
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar itens.' });
    }
  },

  // Buscar item por id com relacionamentos
  async getById(req, res) {
    try {
      const { id } = req.params;
      const item = await Item.findByPk(id, {
        include: [
          { model: ItemFeature, as: 'features' },
          { model: Company, as: 'company' },
          { model: Branch, as: 'branch' },
        ],
      });

      if (!item) {
        return res.status(404).json({ success: false, message: 'Item não encontrado.' });
      }

      return res.json({ success: true, data: item });
    } catch (error) {
      console.error('Erro ao buscar item:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar item.' });
    }
  },

  // Atualizar item por id
  async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const item = await Item.findByPk(id);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item não encontrado.' });
      }

      await item.update(data);
      return res.json({ success: true, data: item });
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar item.' });
    }
  },

  // Deletar item por id
  async delete(req, res) {
    try {
      const { id } = req.params;

      const item = await Item.findByPk(id);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item não encontrado.' });
      }

      await item.destroy();
      return res.json({ success: true, message: 'Item deletado com sucesso.' });
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      return res.status(500).json({ success: false, message: 'Erro ao deletar item.' });
    }
  }
};
