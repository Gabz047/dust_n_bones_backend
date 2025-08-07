import { Branch, Company, CompanySettings, CompanyCustomize, User, UserBranch, Account } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

class UserBranchController {
  static async create(req, res) {
    try {
      const { userId, branchId, dateJoined } = req.body;

      // Verificar se usuário já está associado a alguma filial ativa da empresa ativa
      const existingAssociation = await UserBranch.findOne({
        where: { userId },
        include: [{
          model: Branch,
          as: 'branch',
          required: true,
          include: [{
            model: Company,
            as: 'company',
            where: { active: true },
            required: true
          }]
        }]
      });

      if (existingAssociation) {
        return res.status(400).json({
          success: false,
          message: 'Usuário já está associado a uma filial de uma empresa ativa'
        });
      }

      // Verificar se a filial está ativa
      const branch = await Branch.findOne({ where: { id: branchId, active: true } });
      if (!branch) {
        return res.status(400).json({
          success: false,
          message: 'Filial está inativa ou não existe'
        });
      }

      // Criar associação usuário-filial
      const userBranch = await UserBranch.create({
        id: uuidv4(),
        userId,
        branchId,
        dateJoined: dateJoined || new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Usuário associado à filial com sucesso',
        data: userBranch
      });
    } catch (error) {
      console.error('Erro ao associar usuário à filial:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  static async getAll(req, res) {
    try {
      const { page = 1, limit = 10, active } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (active !== undefined) where.active = active === 'true';

      const { count, rows } = await Branch.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name']
          },
          {
            model: UserBranch,
            as: 'userBranches',
            attributes: ['id', 'userId', 'dateJoined']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          branches: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar filiais:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params; 
      const updates = req.body;

      //verificar se existe uma associação usuário-filial
      const userBranch = await UserBranch.findByPk(id);
      if (!userBranch) {
        return res.status(404).json({
          success: false,
          message: 'Associação usuário-filial não encontrada'
        });
      }

      // Atualizar apenas campos permitidos, ex: dateJoined

      if (updates.dateJoined !== undefined) {
        userBranch.dateJoined = updates.dateJoined;
      }

      // Se quiser mudar a filial, verificar se existe e está ativa
     if (updates.branchId !== undefined && updates.branchId !== userBranch.branchId) {
      const branchExists = await Branch.findOne({ where: { id: updates.branchId, active: true } });
      if (!branchExists) {
        return res.status(400).json({
          success: false,
          message: 'Nova filial não existe ou está inativa'
        });
      }

      // Verificar se já não existe associação com essa filial e usuário
      const exists = await UserBranch.findOne({
        where: { userId: userBranch.userId, branchId: updates.branchId }
      });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'Usuário já está associado a essa filial'
        });
      }

      userBranch.branchId = updates.branchId;
    }

      await userBranch.save();

      res.json({
        success: true,
        message: 'Associação usuário-filial atualizada com sucesso',
        data: userBranch
      });
    } catch (error) {
      console.error('Erro ao atualizar associação usuário-filial:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      const userBranch = await UserBranch.findByPk(id);
      if (!userBranch) {
        return res.status(404).json({
          success: false,
          message: 'associação usuário-filial não encontrada'
        });
      }

      // Hard delete
      await userBranch.destroy();

      res.json({
        success: true,
        message: 'associação usuário-filial excluída com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir associação usuário-filial:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

}

export default UserBranchController;
