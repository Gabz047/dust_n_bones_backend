import { v4 as uuidv4 } from 'uuid';
import { sequelize, Expedition, Project, Customer, MovementLogEntity, User, Account, Company, Branch, Box, Invoice, BoxItem, Order, DeliveryNote } from '../models/index.js';
import { Op } from 'sequelize';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';
import { generateReferralId } from '../utils/globals/generateReferralId.js';
class ExpeditionController {

  // 🔒 Filtro de acesso por empresa/filial
  static projectAccessFilter(req) {
    const { companyId, branchId } = req.context || {};
    return {
      companyId,
      ...(branchId ? { branchId } : {})
    };
  }

  // Criar expedição
  // Criar expedição
static async create(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { projectId, mainCustomerId, userId } = req.body;

    // 🔍 Busca o projeto e o cliente principal
    const project = await Project.findByPk(projectId, { transaction });
    if (!project) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Projeto não encontrado.' });
    }

    const customer = await Customer.findByPk(mainCustomerId, { transaction });
    if (!customer) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Cliente não encontrado.' });
    }

    // ✅ Usa os IDs do projeto
    const companyId = project.companyId;
    const branchId = project.branchId ?? null;

    // 🔢 Gera o referralId único
    const referralId = await generateReferralId({
      model: Expedition, // Corrigido: antes estava DeliveryNote
      transaction,
      companyId,
      
    });

    // 🏗️ Cria a expedição
    const expId = uuidv4()
    const expedition = await Expedition.create(
      {
        id: expId,
        projectId,
        mainCustomerId,
        referralId, // Inclui o código gerado
      },
      { transaction }
    );

    // 🧾 Cria log de movimentação
    const company = await Company.findOne({ where: { id: companyId } });
      
            const MreferralId = await generateReferralId({
              model:  MovementLogEntity,
              transaction,
              companyId: company.id,
              
            });
    let movementData = {
      id: uuidv4(),
      method: 'criação',
      entity: 'expedição',
      entityId: expId,
      status: 'aberto',
      companyId: companyId || null,
        branchId: branchId || null,
        referralId: MreferralId,
    };

    // Verifica se userId é de User ou Account
    const user = await User.findByPk(userId, { transaction });
    if (user) {
      movementData.userId = userId;
    } else {
      const account = await Account.findByPk(userId, { transaction });
      if (account) {
        movementData.accountId = userId;
      } else {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'O ID informado não corresponde a um User ou Account válido',
        });
      }
    }

    await MovementLogEntity.create(movementData, { transaction });

    await transaction.commit();
    return res.status(201).json({ success: true, data: expedition });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao criar expedição:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
    });
  }
}


  // Atualizar expedição
  static async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { projectId, mainCustomerId, userId } = req.body;

      const expedition = await Expedition.findByPk(id, { transaction });
      if (!expedition) return res.status(404).json({ success: false, message: 'Expedição não encontrada.' });

      if (projectId && !(await Project.findByPk(projectId, { transaction })))
        return res.status(400).json({ success: false, message: 'Projeto não encontrado.' });

      if (mainCustomerId && !(await Customer.findByPk(mainCustomerId, { transaction })))
        return res.status(400).json({ success: false, message: 'Cliente não encontrado.' });

      await expedition.update({ projectId, mainCustomerId }, { transaction });
      const project = await Project.findByPk(projectId, { transaction });

      const company = await Company.findOne({ where: { id: project.companyId } });
      
      
            const referralId = await generateReferralId({
              model:  MovementLogEntity,
              transaction,
              companyId: company.id,
              
            });
      // Preparar dados do log
      let movementData = {
        id: uuidv4(),
        method: 'edição',
        entity: 'expedição',
        entityId: expedition.id,
        companyId: project.companyId || null,
        branchId: project.branchId || null,
        status: 'aberto',
        referralId,
      };

      // Verifica User ou Account
      const user = await User.findByPk(userId);
      if (user) {
        movementData.userId = userId;
      } else {
        const account = await Account.findByPk(userId);
        if (account) {
          movementData.accountId = userId;
        } else {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'O ID informado não corresponde a um User ou Account válido' });
        }
      }

      await MovementLogEntity.create(movementData, { transaction });

      await transaction.commit();
      return res.status(200).json({ success: true, data: expedition });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao atualizar expedição:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Deletar expedição

static async delete(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const expedition = await Expedition.findByPk(id, { transaction });
    if (!expedition) return res.status(404).json({ success: false, message: 'Expedição não encontrada.' });

    // 🔗 Verifica vínculos
    const linkedDeliveryNotes = await expedition.countDeliveryNotes({ transaction });
    if (linkedDeliveryNotes > 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Não é possível deletar a expedição porque existem romaneios vinculados.' 
      });
    }
    const project = await Project.findByPk(expedition.projectId, { transaction }); 

    const company = await Company.findOne({ where: { id: project.companyId } });
      
            const referralId = await generateReferralId({
              model:  MovementLogEntity,
              transaction,
              companyId: company.id,
            });
    // Preparar dados do log
    let movementData = {
      id: uuidv4(),
      method: 'remoção',
      entity: 'expedição',
      entityId: expedition.id,
      status: 'aberto',
      companyId: project.companyId || null,
        branchId: project.branchId || null,
        referralId,
    };

    // Verifica User ou Account
    const user = await User.findByPk(userId);
    if (user) {
      movementData.userId = userId;
    } else {
      const account = await Account.findByPk(userId);
      if (account) {
        movementData.accountId = userId;
      } else {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'O ID informado não corresponde a um User ou Account válido' });
      }
    }

    await MovementLogEntity.create(movementData, { transaction });
    await expedition.destroy({ transaction });

    await transaction.commit();
    return res.status(200).json({ success: true, message: 'Expedição removida com sucesso.' });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao deletar expedição:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}




  // 📦 Buscar todas as expedições COM PAGINAÇÃO
  static async getAll(req, res) {
    try {
      const { projectId, mainCustomerId } = req.query;
      const where = {};

      if (projectId) where.projectId = projectId;
      if (mainCustomerId) where.mainCustomerId = mainCustomerId;

      const result = await buildQueryOptions(req, Expedition, {
        where,
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: ExpeditionController.projectAccessFilter(req)
          },
          { 
            model: Customer, 
            as: 'mainCustomer',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar expedições:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 🔍 Buscar por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const expedition = await Expedition.findByPk(id, {
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: ExpeditionController.projectAccessFilter(req)
          },
          { model: Customer, as: 'mainCustomer' }
        ]
      });

      if (!expedition)
        return res.status(404).json({ success: false, message: 'Expedição não encontrada' });

      const lastLog = await MovementLogEntity.findOne({
        where: { entity: 'expedição', entityId: expedition.id },
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          ...expedition.toJSON(),
          lastMovementLog: lastLog ? lastLog.toJSON() : null
        }
      });
    } catch (error) {
      console.error('Erro ao buscar expedição por ID:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 🏭 Buscar expedições por projeto COM PAGINAÇÃO
  static async getByProject(req, res) {
    try {
      const { projectId } = req.params;
      const { term, fields } = req.query;

      const where = { projectId };

      // 🔍 Filtro de pesquisa textual
      if (term && fields) {
        const searchFields = fields.split(',');
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${term}%` }
        }));
      }

      const result = await buildQueryOptions(req, Expedition, {
        where,
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: ExpeditionController.projectAccessFilter(req)
          },
          { model: Customer, as: 'mainCustomer' }
        ]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar expedições por projeto:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 👤 Buscar expedições por cliente COM PAGINAÇÃO
  static async getByCustomer(req, res) {
    try {
      const { mainCustomerId } = req.params;
      const { term, fields } = req.query;

      const where = { mainCustomerId };

      // 🔍 Filtro de pesquisa textual
      if (term && fields) {
        const searchFields = fields.split(',');
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${term}%` }
        }));
      }

      const result = await buildQueryOptions(req, Expedition, {
        where,
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: ExpeditionController.projectAccessFilter(req)
          },
          { model: Customer, as: 'mainCustomer' }
        ]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar expedições por cliente:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }
}

export default ExpeditionController;