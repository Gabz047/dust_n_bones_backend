import express from 'express';
import ProjectController from '../controllers/ProjectController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, projectSchema } from '../middleware/validation.js';
import { extractTenant, optionalTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Rotas protegidas para usuários (sem tenant obrigatório)
router.post('/', authenticateToken, validateRequest(projectSchema.create), authorizeRoles('admin', 'owner'), ProjectController.create);

// Rotas administrativas com tenant obrigatório
router.get('/', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), ProjectController.getAll);

router.get('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), ProjectController.getById);

router.put('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), validateRequest(projectSchema.update), ProjectController.update);

router.delete('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), ProjectController.delete);

export default router;
