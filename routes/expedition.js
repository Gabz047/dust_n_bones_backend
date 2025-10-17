import express from 'express';
import ExpeditionController from '../controllers/ExpeditionController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, expeditionSchemas } from '../middleware/validation.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Criar expedição
router.post(
  '/',
  authenticateToken,
  validateRequest(expeditionSchemas.create),
  ExpeditionController.create
);

router.post(
  '/:id/finalize',
  authenticateToken,
  ExpeditionController.finalize
);

// Atualizar expedição
router.put(
  '/:id',
  authenticateToken,
  validateRequest(expeditionSchemas.update),
  ExpeditionController.update
);

// Deletar expedição
router.delete(
  '/:id',
  authenticateToken,
  validateRequest(expeditionSchemas.delete),
  ExpeditionController.delete
);

// Listar todas
router.get(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ExpeditionController.getAll
);

// Buscar por ID
router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  ExpeditionController.getById
);

// Buscar por projeto
router.get(
  '/project/:projectId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  ExpeditionController.getByProject
);

// Buscar por cliente
router.get(
  '/customer/:customerId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  ExpeditionController.getByCustomer
);

export default router;
