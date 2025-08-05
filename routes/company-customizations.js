import express from 'express';
import CompanyCustomizeController from '../controllers/CompanyCustomizeController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, companyCustomizeSchemas } from '../middleware/validation.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Rota pública para tema da empresa
router.get('/theme/:subdomain', CompanyCustomizeController.getPublicTheme);

// Rotas para customização da própria empresa do usuário (com tenant)
router.get('/company', authenticateToken, extractTenant, validateTenantAccess, CompanyCustomizeController.getCompanyCustomization);
router.put('/company', authenticateToken, extractTenant, validateTenantAccess, validateRequest(companyCustomizeSchemas.update), CompanyCustomizeController.updateCompanyCustomization);

// Rotas administrativas para qualquer empresa
router.get('/:companyId', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin'), CompanyCustomizeController.getByCompany);
router.put('/:companyId', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin'), validateRequest(companyCustomizeSchemas.update), CompanyCustomizeController.update);
router.post('/:companyId/reset', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin'), CompanyCustomizeController.reset);

export default router;