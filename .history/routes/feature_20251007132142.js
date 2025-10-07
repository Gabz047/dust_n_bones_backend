import express from 'express';
import FeatureController from '../controllers/FeatureController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, FeatureSchemas } from '../middleware/validation.js';
import { extractTenant, optionalTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Rotas públicas ou que não precisam de tenant obrigatório

// Rotas administrativas com tenant obrigatório
router.post(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'owner'),
  validateRequest(FeatureSchemas.create),
  FeatureController.create
);

router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'owner'),
  FeatureController.getById
);

router.get('/', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), FeatureController.getAll)

router.put(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'owner'),
  validateRequest(FeatureSchemas.update),
  FeatureController.update
);

router.delete(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  FeatureController.delete
);

export default router;
