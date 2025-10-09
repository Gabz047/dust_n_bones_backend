import express from 'express';
import BranchController from '../controllers/BranchController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, branchSchemas } from '../middleware/validation.js';
import { extractTenant, optionalTenant, validateTenantAccess } from '../middleware/tenant.js';
import { resolveEntityContext } from '../middleware/userContext.js';

const router = express.Router();

// Rota pública para buscar empresa por subdomínio (tenants)
router.get('/subdomain/:subdomain', BranchController.getBySubdomain);

// Rotas protegidas para usuários (sem tenant obrigatório)
router.post('/', authenticateToken, validateRequest(branchSchemas.create), resolveEntityContext, authorizeRoles('admin', 'owner'), BranchController.create);
router.get('/branch', authenticateToken, resolveEntityContext, BranchController.getBranch);

// Rotas administrativas com tenant obrigatório
router.get('/', authenticateToken, extractTenant, validateTenantAccess, resolveEntityContext, authorizeRoles('admin', 'owner'), BranchController.getAll);
router.get('/:id', authenticateToken, extractTenant, validateTenantAccess, resolveEntityContext, authorizeRoles('admin', 'owner'), BranchController.getById);
router.put('/:id', authenticateToken, extractTenant, validateTenantAccess, resolveEntityContext, authorizeRoles('admin', 'owner'), validateRequest(branchSchemas.update), BranchController.update);
router.delete('/:id', authenticateToken, extractTenant, validateTenantAccess, resolveEntityContext, authorizeRoles('admin', 'owner'), BranchController.delete);

export default router;
