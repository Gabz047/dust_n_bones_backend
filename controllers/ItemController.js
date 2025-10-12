import Item from '../models/Item.js';
import Company from '../models/Company.js';
import Branch from '../models/Branch.js';
import sequelize from '../config/database.js';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';
import { generateReferralId } from '../utils/globals/generateReferralId.js';
import { Op } from 'sequelize';
// Helper para gerar o name com gênero
function buildItemName(name, businessItemType, genre) {
  name = name.replace(/\s-\s.*$/, '');
  if (!businessItemType || businessItemType === 'Outro') return name;
  return `${name} - ${genre || 'Unissex'}`;
}

// Filtro de acesso por empresa/filial
function itemAccessFilter(req) {
  const { companyId, branchId } = req.context || {};
  return {
    companyId,
    ...(branchId ? { branchId } : {}),
  };
}

export default {
  // Criar item
  async create(req, res) {
      const transaction = await sequelize.transaction();
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

      name = buildItemName(name, businessItemType, genre);

        // ✅ GERA REFERRAL AUTOMÁTICO
            const company = await Company.findOne({ where: { id: companyId } });
            const branch = branchId ? await Branch.findOne({ where: { id: branchId } }) : null;
      
            const companyRef = company?.referralId;
            const branchRef = branch?.referralId ?? null;
      
            const referralId = await generateReferralId({
              model: Item,
              transaction,
              companyId: companyRef,
              branchId: branchRef,
            });
      

      const itemData = {
        name,
        referralId,
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

      // Usa o nome atual se não foi enviado um novo
      name = name || item.name;

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

  // Buscar todos os itens com filtros, search e paginação
  async getAll(req, res) {
    try {
      const { term, fields, page, limit } = req.query;

      const where = itemAccessFilter(req);

      // Filtro de pesquisa textual
      if (term && fields) {
        const searchFields = fields.split(',');
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${term}%` },
        }));
      }

      const result = await buildQueryOptions(req, Item, {
        where,
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name'] },
          { model: Branch, as: 'branch', attributes: ['id', 'name'] },
        ],
        order: [['createdAt', 'DESC']],
      });

      return res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar itens.' });
    }
  },

  // Buscar item por ID com filtro de contexto
  async getById(req, res) {
    try {
      const { id } = req.params;

      const where = { id, ...itemAccessFilter(req) };

      const result = await buildQueryOptions(req, Item, {
        where,
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name'] },
          { model: Branch, as: 'branch', attributes: ['id', 'name'] },
        ],
      });

      if (!result.data || result.data.length === 0)
        return res.status(404).json({ success: false, message: 'Item não encontrado.' });

      return res.json({ success: true, ...result });
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
