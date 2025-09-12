import express from 'express';
import ProductionOrderItemAdditionalFeatureOptionController from '../controllers/ProductionOrderItemAdditionalFeatureOptionController.js';
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
  ProductionOrderItemAdditionalFeatureOptionController.create
);

// Listar adicionais por ordem de produção
router.get(
  '/production-order/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'owner'),
  ProductionOrderItemAdditionalFeatureOptionController.getByProductionOrder
);

// Listar adicionais por item dentro de uma ordem de produção
router.get(
  '/production-order/:productionOrderId/item/:itemFeatureId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'owner'),
  ProductionOrderItemAdditionalFeatureOptionController.getByProductionOrderAndItem
);

// Atualizar adicional
router.put(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'owner'),
  ProductionOrderItemAdditionalFeatureOptionController.update
);

// Deletar adicional
router.delete(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderItemAdditionalFeatureOptionController.delete
);

export default router;
