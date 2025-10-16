import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import Package from '../models/Package.js';
import { Box } from '../models/index.js';
import sequelize from '../config/database.js';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';
import Branch from '../models/Branch.js';
import Company from '../models/Company.js';
import { generateReferralId } from '../utils/globals/generateReferralId.js';
class PackageController {
  // 🔒 Filtro de acesso por empresa/filial
  static packageAccessFilter(req) {
    const { companyId, branchId } = req.context || {};
    return {
      companyId
    };
  }
  

  // 🧾 Criar embalagem
  static async create(req, res) {
     const transaction = await sequelize.transaction();
    try {
      const { name, type, material, width, height, length, weight } = req.body;
      const { companyId, branchId } = req.context;

      const company = await Company.findOne({ where: { id: companyId } });


      const referralId = await generateReferralId({
        model: Package,
        transaction,
        companyId: company.id,
      });
      const packageItem = await Package.create({
        id: uuidv4(),
        name,
        referralId,
        type,
        material,
        width,
        height,
        length,
        weight,
        companyId,
        branchId
      });

      return res.status(201).json({ success: true, data: packageItem });
    } catch (error) {
      console.error('Erro ao criar embalagem:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar embalagem',
        error: error.message
      });
    }
  }

  // 📦 Buscar todas as embalagens com paginação
  static async getAll(req, res) {
    try {
      const { term, fields } = req.query;
      const where = PackageController.packageAccessFilter(req);

      // 🔍 Filtro de pesquisa textual
      if (term && fields) {
        const searchFields = fields.split(',');
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${term}%` }
        }));
      }

      const result = await buildQueryOptions(req, Package, {
        where,
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar embalagens:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // 🔍 Buscar por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const where = { id, ...PackageController.packageAccessFilter(req) };

      const packageItem = await Package.findOne({ where });

      if (!packageItem) {
        return res.status(404).json({
          success: false,
          message: 'Embalagem não encontrada'
        });
      }

      res.json({ success: true, data: packageItem });
    } catch (error) {
      console.error('Erro ao buscar embalagem:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // ✏️ Atualizar embalagem
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const packageItem = await Package.findByPk(id);

      if (!packageItem) {
        return res.status(404).json({
          success: false,
          message: 'Embalagem não encontrada'
        });
      }

      await packageItem.update(updates);

      res.json({
        success: true,
        message: 'Embalagem atualizada com sucesso',
        data: packageItem
      });
    } catch (error) {
      console.error('Erro ao atualizar embalagem:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // 🗑️ Deletar embalagem
  static async delete(req, res) {
  try {
    const { id } = req.params;

    const packageItem = await Package.findByPk(id, {
      include: [
        { model: Box, as: 'boxes' } // Inclui as caixas relacionadas
      ]
    });

    if (!packageItem) {
      return res.status(404).json({
        success: false,
        message: 'Embalagem não encontrada'
      });
    }

    // Verifica se existe algum Box vinculado
    if (packageItem.boxes && packageItem.boxes.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível deletar a embalagem, existem caixas vinculadas a ela'
      });
    }

    await packageItem.destroy();

    res.json({
      success: true,
      message: 'Embalagem removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar embalagem:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
}
}

export default PackageController;