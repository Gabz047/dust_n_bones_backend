import express from 'express';
import BoxController from '../controllers/BoxController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, boxSchemas } from '../middleware/validation.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Criar Box
router.post(
  '/',
  authenticateToken,
  validateRequest(boxSchemas.create),
  BoxController.create
);

router.get(
  '/orderIds',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxController.getByOrderIds
);
// Listar todos os Boxes
router.get(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  BoxController.getAll
);

router.get(
  '/open',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  BoxController.getOpenBoxes
);

// Buscar Box por ID
router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxController.getById
);

// Atualizar Box
router.put(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'owner'),
  validateRequest(boxSchemas.update),
  BoxController.update
);

// Deletar Box
router.delete(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  BoxController.delete
);

// Filtros
router.get(
  '/delivery-note/:deliveryNoteId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxController.getByDeliveryNote
);

router.get(
  '/project/:projectId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxController.getByProject
);

router.get(
  '/customer/:customerId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxController.getByCustomer
);

router.get(
  '/order/:orderId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxController.getByOrder
);

router.get(
  '/package/:packageId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxController.getByPackage
);

router.get(
  '/user/:userId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxController.getByUser
);

router.get(
  '/date/:date',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  BoxController.getByDate
);

export default router;
