import Item from '../models/Item.js';
import Company from '../models/Company.js';
import Branch from '../models/Branch.js';

export default {
  // Criar um item
  async create(req, res) {
    try {
      const {
        companyId,
        branchId,
        name,
        description,
        itemType,
        measurementUnit,
        minStock,
        maxStock,
        price,
        weight,
        businessItemType,
      } = req.body;

      let item;

      if (branchId) {
      item = await Item.create({
        branchId,
        name,
        description,
        itemType,
        measurementUnit,
        minStock,
        maxStock,
        price,
        weight,
        businessItemType,
      });
    } else if (companyId) {
      item = await Item.create({
        companyId,
        name,
        description,
        itemType,
        measurementUnit,
        minStock,
        maxStock,
        price,
        weight,
        businessItemType,
      });
    }

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
          { model: Company, as: 'company', attributes: ['id', 'name'] },
          { model: Branch, as: 'branch', attributes: ['id', 'name'] }
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
          { model: Company, as: 'company' },
          { model: Branch, as: 'branch' }
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
      const {
        name,
        description,
        itemType,
        measurementUnit,
        minStock,
        maxStock,
        price,
        weight,
        businessItemType,
      } = req.body;

      const item = await Item.findByPk(id);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item não encontrado.' });
      }

      await item.update({
        name,
        description,
        itemType,
        measurementUnit,
        minStock,
        maxStock,
        price,
        weight,
        businessItemType,
      });

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
