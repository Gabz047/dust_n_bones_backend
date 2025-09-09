import express from 'express';
import OrderItemAdditionalFeatureOptionController from '../controllers/OrderItemAdditionalFeatureOption.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Criar adicional
router.post(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'owner'),
  OrderItemAdditionalFeatureOptionController.create
);

// Listar adicionais por pedido
router.get(
  '/order/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'owner'),
  OrderItemAdditionalFeatureOptionController.getByOrder
);

// Listar adicionais por item dentro de um pedido
router.get(
  '/order/:orderId/item/:itemFeatureId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'owner'),
  OrderItemAdditionalFeatureOptionController.getByOrderAndItem
);

// Atualizar adicional
router.put(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'owner'),
  OrderItemAdditionalFeatureOptionController.update
);

// Deletar adicional
router.delete(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  OrderItemAdditionalFeatureOptionController.delete
);

export default router;
