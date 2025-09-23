import { v4 as uuidv4 } from 'uuid';
import { sequelize, Expedition, Project, Customer, MovementLogEntity, User } from '../models/index.js';

class ExpeditionController {

  // Cria uma nova expedição
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { projectId, mainCustomerId, userId } = req.body;

      const project = await Project.findByPk(projectId, { transaction });
      if (!project) return res.status(400).json({ success: false, message: 'Projeto não encontrado' });

      const customer = await Customer.findByPk(mainCustomerId, { transaction });
      if (!customer) return res.status(400).json({ success: false, message: 'Cliente não encontrado' });

      const expedition = await Expedition.create({
        id: uuidv4(),
        projectId,
        mainCustomerId,
      }, { transaction });

      await MovementLogEntity.create({
        id: uuidv4(),
        method: 'criação',
        entity: 'expedição',
        entityId: expedition.id,
        userId,
        status: 'aberto'
      }, { transaction });

      await transaction.commit();
      return res.status(201).json({ success: true, data: expedition });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar expedição:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Atualiza uma expedição existente
  static async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { projectId, mainCustomerId, userId } = req.body;

      const expedition = await Expedition.findByPk(id, { transaction });
      if (!expedition) return res.status(404).json({ success: false, message: 'Expedição não encontrada' });

      if (projectId && !await Project.findByPk(projectId, { transaction }))
        return res.status(400).json({ success: false, message: 'Projeto não encontrado' });

      if (mainCustomerId && !await Customer.findByPk(mainCustomerId, { transaction }))
        return res.status(400).json({ success: false, message: 'Cliente não encontrado' });

      await expedition.update({ projectId, mainCustomerId }, { transaction });

      await MovementLogEntity.create({
        id: uuidv4(),
        method: 'edição',
        entity: 'expedição',
        entityId: expedition.id,
        userId,
        status: 'aberto'
      }, { transaction });

      await transaction.commit();
      return res.status(200).json({ success: true, data: expedition });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao atualizar expedição:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Deleta uma expedição
  static async delete(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const expedition = await Expedition.findByPk(id, { transaction });
      if (!expedition) return res.status(404).json({ success: false, message: 'Expedição não encontrada' });

      await MovementLogEntity.create({
        id: uuidv4(),
        method: 'remoção',
        entity: 'expedição',
        entityId: expedition.id,
        userId,
        status: 'aberto'
      }, { transaction });

      await expedition.destroy({ transaction });

      await transaction.commit();
      return res.status(200).json({ success: true, message: 'Expedição removida com sucesso' });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao deletar expedição:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Lista todas as expedições
  static async getAll(req, res) {
    try {
      const expeditions = await Expedition.findAll({
        include: [
          { model: Project, as: 'project' },
          { model: Customer, as: 'mainCustomer' } // ✅ alias corrigido
        ],
        order: [['createdAt', 'DESC']]
      });
      return res.json({ success: true, data: expeditions });
    } catch (error) {
      console.error('Erro ao listar expedições:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Busca expedição por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const expedition = await Expedition.findByPk(id, {
        include: [
          { model: Project, as: 'project' },
          { model: Customer, as: 'mainCustomer' } // ✅ alias corrigido
        ]
      });
      if (!expedition) return res.status(404).json({ success: false, message: 'Expedição não encontrada' });
      return res.json({ success: true, data: expedition });
    } catch (error) {
      console.error('Erro ao buscar expedição por ID:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Busca expedições por projeto
  static async getByProject(req, res) {
    try {
      const { projectId } = req.params;
      const expeditions = await Expedition.findAll({
        where: { projectId },
        include: [
          { model: Project, as: 'project' },
          { model: Customer, as: 'mainCustomer' } // ✅ alias corrigido
        ]
      });
      return res.json({ success: true, data: expeditions });
    } catch (error) {
      console.error('Erro ao buscar expedições por projeto:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Busca expedições por cliente
  static async getByCustomer(req, res) {
    try {
      const { mainCustomerId } = req.params;
      const expeditions = await Expedition.findAll({
        where: { mainCustomerId },
        include: [
          { model: Project, as: 'project' },
          { model: Customer, as: 'mainCustomer' } // ✅ alias corrigido
        ]
      });
      return res.json({ success: true, data: expeditions });
    } catch (error) {
      console.error('Erro ao buscar expedições por cliente:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

}

export default ExpeditionController;
