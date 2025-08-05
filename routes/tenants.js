import express from 'express';
import TenantController from '../controllers/TenantController.js';
import { authenticateToken } from '../middleware/auth.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Rota pública para buscar tenant por subdomínio
router.get('/subdomain/:subdomain', TenantController.getBySubdomain);

// Rotas protegidas para tenant
router.get('/current', authenticateToken, extractTenant, TenantController.getCurrentTenant);
router.get('/stats', authenticateToken, extractTenant, validateTenantAccess, TenantController.getTenantStats);
router.get('/validate/:tenantId', authenticateToken, TenantController.validateTenantAccess);

export default router;