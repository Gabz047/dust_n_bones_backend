import Item from '../models/Item.js';
import Company from '../models/Company.js';
import Branch from '../models/Branch.js';

// Helper para gerar o name com gênero
function buildItemName(name, businessItemType, genre) {
  // Remove qualquer sufixo existente " - <algo>"
  name = name.replace(/\s-\s.*$/, '');

  // Se businessItemType for Outro ou vazio, retorna só o nome
  if (!businessItemType || businessItemType === 'Outro') {
    return name;
  }

  // Se houver gênero, adiciona ao nome
  return `${name} - ${genre || 'Unissex'}`;
}

export default {
  // Criar item
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

      if (!businessItemType || businessItemType === 'Outro') {
        genre = null;
      } else if (!genre) {
        genre = 'Unissex';
      }

      console.log(price)

      name = buildItemName(name, businessItemType, genre);

      const itemData = {
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
      };

      const item = branchId
        ? await Item.create({ branchId, ...itemData })
        : await Item.create({ companyId, ...itemData });

      return res.status(201).json({ success: true, data: item });
    } catch (error) {
      console.error('Erro ao criar item:', error);
      return res.status(500).json({ success: false, message: 'Erro ao criar item.' });
    }
  },

  // Atualizar item
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

      console.log(price)

      if (!businessItemType || businessItemType === 'Outro') {
        genre = null;
      } else if (!genre) {
        genre = 'Unissex';
      }

      name = buildItemName(name, businessItemType, genre);

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

      return res.json({ success: true, data: item });
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar item.' });
    }
  },

  // Buscar todos os itens
  async getAll(req, res) {
    try {
      const items = await Item.findAll({
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name'] },
          { model: Branch, as: 'branch', attributes: ['id', 'name'] },
        ],
        order: [['createdAt', 'DESC']],
      });

      return res.json({ success: true, data: items });
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar itens.' });
    }
  },

  // Buscar item por ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const item = await Item.findByPk(id, {
        include: [
          { model: Company, as: 'company' },
          { model: Branch, as: 'branch' },
        ],
      });

      if (!item) return res.status(404).json({ success: false, message: 'Item não encontrado.' });

      return res.json({ success: true, data: item });
    } catch (error) {
      console.error('Erro ao buscar item:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar item.' });
    }
  },

  // Deletar item
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
  },
};
