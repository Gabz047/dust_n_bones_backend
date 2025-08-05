import express from 'express';
import CompanyController from '../controllers/CompanyController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, companySchemas } from '../middleware/validation.js';
import { extractTenant, optionalTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Rota pública para buscar empresa por subdomínio (tenants)
router.get('/subdomain/:subdomain', CompanyController.getBySubdomain);

// Rotas protegidas para usuários (sem tenant obrigatório)
router.post('/', authenticateToken, validateRequest(companySchemas.create), CompanyController.create);
router.get('/company', authenticateToken, CompanyController.getCompany);

// Rotas administrativas com tenant obrigatório
router.get('/', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin'), CompanyController.getAll);
router.get('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin'), CompanyController.getById);
router.put('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin'), validateRequest(companySchemas.update), CompanyController.update);
router.delete('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin'), CompanyController.delete);

export default router;
