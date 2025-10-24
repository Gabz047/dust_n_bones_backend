import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { Bone, Specie, sequelize } from '../../models/index.js';
import { buildQueryOptions } from '../../utils/filters/buildQueryOptions.js';

class BoneController {
  // 🦴 Criar novo osso
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { name, description, quantity, specieId } = req.body;

      if (!name)
        return res.status(400).json({ success: false, message: 'Nome é obrigatório.' });

      if (!specieId)
        return res.status(400).json({ success: false, message: 'É necessário informar a espécie.' });

      // Valida se a espécie existe
      const specie = await Specie.findByPk(specieId);
      if (!specie)
        return res.status(404).json({ success: false, message: 'Espécie não encontrada.' });

      const bone = await Bone.create(
        {
          id: uuidv4(),
          name,
          description,
          quantity: quantity || 0,
          specieId,
          active: true,
        },
        { transaction }
      );

      await transaction.commit();
      return res.status(201).json({ success: true, data: bone });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar osso:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }

  // ✏️ Atualizar osso
  static async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const updates = req.body;

      const bone = await Bone.findByPk(id, { transaction });
      if (!bone)
        return res.status(404).json({ success: false, message: 'Osso não encontrado.' });

      await bone.update(updates, { transaction });
      await transaction.commit();

      return res.status(200).json({ success: true, data: bone });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao atualizar osso:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }

  // 🗑️ Deletar osso
  static async delete(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;

      const bone = await Bone.findByPk(id, { transaction });
      if (!bone)
        return res.status(404).json({ success: false, message: 'Osso não encontrado.' });

      await bone.destroy({ transaction });
      await transaction.commit();

      return res.status(200).json({ success: true, message: 'Osso removido com sucesso.' });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao deletar osso:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }

  // 📋 Listar ossos com filtros, paginação e ordenação
  static async getAll(req, res) {
    try {
      const { term, fields, orderBy } = req.query;
      const where = {};

      // 🔍 Filtro de busca textual
      if (term && fields) {
        const searchFields = fields.split(',');
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${term}%` },
        }));
      }

      // ↕️ Ordenação customizada
      let order = [['createdAt', 'DESC']];
      switch (orderBy) {
        case 'qtd_desc':
          order = [['quantity', 'DESC']];
          break;
        case 'qtd_asc':
          order = [['quantity', 'ASC']];
          break;
        case 'name_asc':
          order = [['name', 'ASC']];
          break;
        case 'name_desc':
          order = [['name', 'DESC']];
          break;
      }

      // 📦 Paginação e include com buildQueryOptions
      const result = await buildQueryOptions(req, Bone, {
        where,
        include: [
          {
            model: Specie,
            as: 'specie',
            attributes: ['id', 'name', 'scientificName'],
          },
        ],
        order,
      });

      return res.json({
        success: true,
        count: result.count,
        pagination: result.pagination,
        data: result.data,
      });
    } catch (error) {
      console.error('Erro ao listar ossos:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }

  // 🔍 Buscar por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const bone = await Bone.findByPk(id, {
        include: [
          {
            model: Specie,
            as: 'specie',
            attributes: ['id', 'name', 'scientificName'],
          },
        ],
      });

      if (!bone)
        return res.status(404).json({ success: false, message: 'Osso não encontrado.' });

      return res.json({ success: true, data: bone });
    } catch (error) {
      console.error('Erro ao buscar osso:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }
}

export default BoneController;
