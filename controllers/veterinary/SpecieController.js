import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { Bone, Specie, sequelize } from '../../models/index.js';
import { buildQueryOptions } from '../../utils/filters/buildQueryOptions.js';

class SpecieController {
  // 🧬 Criar nova espécie
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { name, description } = req.body;

      if (!name)
        return res.status(400).json({ success: false, message: 'Nome é obrigatório.' });

      const specie = await Specie.create(
        {
          id: uuidv4(),
          name,
          description,
          active: true,
        },
        { transaction }
      );

      await transaction.commit();
      return res.status(201).json({ success: true, data: specie });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar espécie:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }

  // ✏️ Atualizar espécie
  static async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const updates = req.body;

      const specie = await Specie.findByPk(id, { transaction });
      if (!specie)
        return res.status(404).json({ success: false, message: 'Espécie não encontrada.' });

      await specie.update(updates, { transaction });
      await transaction.commit();

      return res.status(200).json({ success: true, data: specie });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao atualizar espécie:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }

  // 🗑️ Deletar espécie (bloqueia se houver bones)
  static async delete(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;

      const specie = await Specie.findByPk(id, { transaction });
      if (!specie)
        return res.status(404).json({ success: false, message: 'Espécie não encontrada.' });

      // 🚫 Verifica se há ossos vinculados
      const boneCount = await Bone.count({ where: { specieId: id }, transaction });
      if (boneCount > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Não é possível deletar uma espécie que possui ossos vinculados.',
        });
      }

      await specie.destroy({ transaction });
      await transaction.commit();

      return res.status(200).json({ success: true, message: 'Espécie removida com sucesso.' });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao deletar espécie:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }

  // 📋 Listar espécies com filtros, paginação e ordenação
  static async getAll(req, res) {
    try {
      const { term, fields, orderBy, active } = req.query;
      const where = {};

      // 🔍 Filtro textual
      if (term && fields) {
        const searchFields = fields.split(',');
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${term}%` },
        }));
      }

      // 🔘 Filtro por ativo
      if (active !== undefined) {
        where.active = active === 'true';
      }

      // ↕️ Ordenação customizada
      let order = [['createdAt', 'DESC']];
      switch (orderBy) {
        case 'name_asc':
          order = [['name', 'ASC']];
          break;
        case 'name_desc':
          order = [['name', 'DESC']];
          break;
        case 'qtd_desc':
          order = [['totalQuantity', 'DESC']];
          break;
        case 'qtd_asc':
          order = [['totalQuantity', 'ASC']];
          break;
      }

      // 📦 Paginação + include com buildQueryOptions
      const result = await buildQueryOptions(req, Specie, {
        where,
        include: [
          {
            model: Bone,
            as: 'bones',
            attributes: ['id', 'name', 'quantity'],
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
      console.error('Erro ao listar espécies:', error);
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

      const specie = await Specie.findByPk(id, {
        include: [
          {
            model: Bone,
            as: 'bones',
            attributes: ['id', 'name', 'quantity', 'description'],
          },
        ],
      });

      if (!specie)
        return res.status(404).json({ success: false, message: 'Espécie não encontrada.' });

      return res.json({ success: true, data: specie });
    } catch (error) {
      console.error('Erro ao buscar espécie:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }
}

export default SpecieController;
