import { ProjectItem, Project, Item, sequelize , ProductionOrder } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

class ProjectItemController {
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { projectId, itemId, quantity } = req.body;

      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(400).json({ success: false, message: 'Projeto não encontrado' });
      }

      const item = await Item.findByPk(itemId);
      if (!item) {
        return res.status(400).json({ success: false, message: 'Item não encontrado' });
      }

      const id = uuidv4();
      const projectItem = await ProjectItem.create({
        id,
        projectId,
        itemId,
        quantity: quantity || 1
      }, { transaction });

      await transaction.commit();
      return res.status(201).json({ success: true, data: projectItem });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar ProjectItem:', error);
      return res.status(500).json({ success: false, message: 'Erro interno', error: error.message });
    }
  }

  static async getAll(req, res) {
    try {
      const { count, rows } = await ProjectItem.findAndCountAll({
        include: [
          { model: Project, as: 'project' },
          { model: Item, as: 'item' }
        ]
      });

      res.json({ success: true, data: rows, total: count });
    } catch (error) {
      console.error('Erro ao buscar ProjectItems:', error);
      res.status(500).json({ success: false, message: 'Erro interno', error: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const projectItem = await ProjectItem.findByPk(id, {
        include: [
          { model: Project, as: 'project' },
          { model: Item, as: 'item' }
        ]
      });

      if (!projectItem) {
        return res.status(404).json({ success: false, message: 'Relação não encontrada' });
      }

      res.json({ success: true, data: projectItem });
    } catch (error) {
      console.error('Erro ao buscar ProjectItem:', error);
      res.status(500).json({ success: false, message: 'Erro interno', error: error.message });
    }
  }

    static async getByProjectId(req, res) {
    try {
      const { id } = req.params;
      const projectItem = await ProjectItem.findAll({
        where: {projectId: id},
        include: [
          { model: Project, as: 'project', attributes: ['id', 'name'] },
          { model: Item, as: 'item' }
        ]
        
      });

      if (!projectItem) {
        return res.status(404).json({ success: false, message: 'Relação não encontrada' });
      }

      res.json({ success: true, data: projectItem });
    } catch (error) {
      console.error('Erro ao buscar ProjectItem:', error);
      res.status(500).json({ success: false, message: 'Erro interno', error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const projectItem = await ProjectItem.findByPk(id);
      if (!projectItem) {
        return res.status(404).json({ success: false, message: 'Relação não encontrada' });
      }

      await projectItem.update(updates);
      res.json({ success: true, data: projectItem });
    } catch (error) {
      console.error('Erro ao atualizar ProjectItem:', error);
      res.status(500).json({ success: false, message: 'Erro interno', error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const projectItem = await ProjectItem.findByPk(id);
      if (!projectItem) {
        return res.status(404).json({ success: false, message: 'Relação não encontrada' });
      }

       const productionOrder = await ProductionOrder.findOne({where: { projectId: projectItem.projectId }})
      if (productionOrder) {
        
          return res.status(404).json({ success: false, message: 'Item do projeto não pode ser apagado, pois o projeto possui uma ordem de produção!' });
      }

      await projectItem.destroy();
      res.json({ success: true, message: 'Relação removida com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar ProjectItem:', error);
      res.status(500).json({ success: false, message: 'Erro interno', error: error.message });
    }
  }
}

export default ProjectItemController;
