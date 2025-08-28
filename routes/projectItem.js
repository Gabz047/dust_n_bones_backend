import express from 'express';
import ProjectItemController from '../controllers/ProjectItemController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, projectItemSchemas } from '../middleware/validation.js';

const router = express.Router();

// Buscar todos
router.get('/', authenticateToken, ProjectItemController.getAll);

// Criar relação Projeto-Item
router.post(
  '/',
  authenticateToken,
  validateRequest(projectItemSchemas.create.body),
  authorizeRoles('admin', 'owner'),
  ProjectItemController.create
);

// Buscar por ID
router.get('/:id', authenticateToken, ProjectItemController.getById);

router.get('/project/:id', authenticateToken, ProjectItemController.getByProjectId);

// Atualizar
router.put(
  '/:id',
  authenticateToken,
  validateRequest(projectItemSchemas.update.body),
  authorizeRoles('admin', 'owner'),
  ProjectItemController.update
);

// Deletar
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'owner'), ProjectItemController.delete);

export default router;
