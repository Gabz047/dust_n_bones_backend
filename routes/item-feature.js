import express from 'express';
import ItemFeatureController from '../controllers/ItemFeatureController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, itemFeatureSchemas } from '../middleware/validation.js';
import { extractTenant, optionalTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Rotas públicas ou que não precisam de tenant obrigatório
// Por exemplo, listar todas as características de um item (não exige tenant)
router.get('/item/:itemId', authenticateToken, ItemFeatureController.getAllByItem);

// Rotas administrativas com tenant obrigatório
router.post(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager'),
  validateRequest(itemFeatureSchemas.create),
  ItemFeatureController.create
);

router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager'),
  ItemFeatureController.getById
);

router.put(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager'),
  validateRequest(itemFeatureSchemas.update),
  ItemFeatureController.update
);

router.delete(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin'),
  ItemFeatureController.delete
);

export default router;
