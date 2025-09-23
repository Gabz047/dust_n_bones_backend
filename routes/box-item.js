import express from 'express';
import BoxItemController from '../controllers/BoxItemController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, boxItemSchemas } from '../middleware/validation.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Criar múltiplos BoxItems
router.post(
  '/',
  authenticateToken,
  validateRequest(boxItemSchemas.createBatch),
  BoxItemController.createBatch
);

// Atualizar múltiplos BoxItems
router.put(
  '/',
  authenticateToken,
  validateRequest(boxItemSchemas.updateBatch),
  BoxItemController.updateBatch
);

// Deletar múltiplos BoxItems
router.delete(
  '/',
  authenticateToken,
  validateRequest(boxItemSchemas.deleteBatch),
  BoxItemController.deleteBatch
);

// Listar todos os BoxItems
router.get(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  BoxItemController.getAll
);

// Buscar BoxItem por ID
router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxItemController.getById
);

// Filtros
router.get(
  '/order-item/:orderItemId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxItemController.getByOrderItem
);

router.get(
  '/box/:boxId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxItemController.getByBox
);

router.get(
  '/item/:itemId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxItemController.getByItem
);

router.get(
  '/feature-item/:itemFeatureId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxItemController.getByFeatureItem
);

router.get(
  '/feature-option/:featureOptionId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxItemController.getByFeatureOption
);

router.get(
  '/user/:userId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxItemController.getByUser
);

router.get(
  '/date/:date',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxItemController.getByDate
);

export default router;
