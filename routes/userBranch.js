import express from 'express';
import UserBranchController from '../controllers/UserBranch.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, userBranchSchemas } from '../middleware/validation.js';
import { extractTenant, optionalTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Rotas protegidas para usuários (sem tenant obrigatório)
router.post('/', authenticateToken, validateRequest(userBranchSchemas.create), UserBranchController.create);

// Rotas administrativas com tenant obrigatório
router.get('/', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin'), UserBranchController.getAll);

router.put('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin'), validateRequest(userBranchSchemas.update), UserBranchController.update);

router.delete('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin'), UserBranchController.delete);

export default router;
