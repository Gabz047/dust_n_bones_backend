import express from 'express';
import MovementController from '../controllers/MovementController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Criar movimentação (apenas o registro pai)
router.post(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  MovementController.create
);

// Listar todas as movimentações
router.get(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  MovementController.getAll
);

// Buscar movimentação por ID
router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  MovementController.getById
);

// Buscar movimentações por usuário
router.get(
  '/user/:userId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  MovementController.getByUser
);

// Buscar movimentações por ordem de produção
router.get(
  '/production-order/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  MovementController.getByProductionOrder
);

// Buscar movimentações por item + itemFeature
router.get(
  '/item-feature/:itemId/:itemFeatureId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  MovementController.getByItemFeature
);

// Buscar movimentações por tipo
router.get(
  '/type/:type',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  MovementController.getByMovementType
);

router.delete(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  MovementController.delete
);

export default router;
