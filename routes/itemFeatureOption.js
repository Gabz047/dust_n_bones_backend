import express from 'express';
import ItemFeatureOptionController from '../controllers/ItemFeatureOptionController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, itemFeatureOptionSchemas } from '../middleware/validation.js';
import { extractTenant, optionalTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Criar ItemFeatureOption (sem tenant obrigatório)
router.post(
  '/',
  authenticateToken,
  validateRequest(itemFeatureOptionSchemas.create),
  authorizeRoles('admin', 'owner'),
  ItemFeatureOptionController.create
);

router.get(
  '/by-item-features',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ItemFeatureOptionController.getByItemFeatures
);

// Buscar todas (com tenant obrigatório)
router.get(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ItemFeatureOptionController.getAll
);

// Buscar por ID
router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ItemFeatureOptionController.getById
);

// Buscar por itemFeatureId
router.get(
  '/item-feature/:itemFeatureId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ItemFeatureOptionController.getByItemFeature
);

// Buscar por featureOptionId
router.get(
  '/feature-option/:featureOptionId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ItemFeatureOptionController.getByFeatureOption
);

// Atualizar
router.put(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  validateRequest(itemFeatureOptionSchemas.update),
  ItemFeatureOptionController.update
);

// Deletar
router.delete(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ItemFeatureOptionController.delete
);

export default router;
