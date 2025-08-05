import express from 'express';
import CompanySettingsController from '../controllers/CompanySettingsController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, companySettingsSchemas } from '../middleware/validation.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Rotas para configurações da própria empresa do usuário (com tenant)
router.get('/company', authenticateToken, extractTenant, validateTenantAccess, CompanySettingsController.getCompanySettings);
router.put('/company', authenticateToken, extractTenant, validateTenantAccess, validateRequest(companySettingsSchemas.update), CompanySettingsController.updateCompanySettings);

// Rotas administrativas para qualquer empresa
router.get('/:companyId', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin'), CompanySettingsController.getByCompany);
router.put('/:companyId', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin'), validateRequest(companySettingsSchemas.update), CompanySettingsController.update);
router.post('/:companyId/reset', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin'), CompanySettingsController.reset);

export default router;
