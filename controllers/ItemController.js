import Item from '../models/Item.js';
import Company from '../models/Company.js';
import Branch from '../models/Branch.js';

export default {
  // Criar um item
  async create(req, res) {
    try {
      let {
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
        genre,
      } = req.body;

      // --- Lógica de defaults ---
      if (!businessItemType || businessItemType === 'Outro') {
        genre = null;
      } else if (!genre) {
        genre = 'Unissex';
      }

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
          genre,
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
          genre,
        });
      }

      // Adiciona displayName
      const formattedItem = {
        ...item.toJSON(),
        displayName: genre ? `${name} - ${genre}` : name
      };

      return res.status(201).json({ success: true, data: formattedItem });
    } catch (error) {
      console.error('Erro ao criar item:', error);
      return res.status(500).json({ success: false, message: 'Erro ao criar item.' });
    }
  },

  // Atualizar item por id
  async update(req, res) {
    try {
      const { id } = req.params;
      let {
        name,
        description,
        itemType,
        measurementUnit,
        minStock,
        maxStock,
        price,
        weight,
        businessItemType,
        genre,
      } = req.body;

      const item = await Item.findByPk(id);
      if (!item) return res.status(404).json({ success: false, message: 'Item não encontrado.' });

      // --- Lógica de defaults ---
      if (!businessItemType || businessItemType === 'Outro') {
        genre = null;
      } else if (!genre) {
        genre = 'Unissex';
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
        genre,
      });

      const formattedItem = {
        ...item.toJSON(),
        displayName: genre ? `${name} - ${genre}` : name
      };

      return res.json({ success: true, data: formattedItem });
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar item.' });
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

      const formattedItems = items.map(item => ({
        ...item.toJSON(),
        displayName: item.genre ? `${item.name} - ${item.genre}` : item.name
      }));

      return res.json({ success: true, data: formattedItems });
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

      if (!item) return res.status(404).json({ success: false, message: 'Item não encontrado.' });

      const formattedItem = {
        ...item.toJSON(),
        displayName: item.genre ? `${item.name} - ${item.genre}` : item.name
      };

      return res.json({ success: true, data: formattedItem });
    } catch (error) {
      console.error('Erro ao buscar item:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar item.' });
    }
  },

  // Deletar item por id
  async delete(req, res) {
    try {
      const { id } = req.params;

      const item = await Item.findByPk(id);
      if (!item) return res.status(404).json({ success: false, message: 'Item não encontrado.' });

      await item.destroy();
      return res.json({ success: true, message: 'Item deletado com sucesso.' });
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      return res.status(500).json({ success: false, message: 'Erro ao deletar item.' });
    }
  }
};
