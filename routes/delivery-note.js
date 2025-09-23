import express from 'express';
import DeliveryNoteController from '../controllers/DeliveryNoteController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, deliveryNoteSchemas } from '../middleware/validation.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Criar DeliveryNote
router.post(
  '/',
  authenticateToken,
  validateRequest(deliveryNoteSchemas.create),
  DeliveryNoteController.create
);

// Atualizar DeliveryNote
router.put(
  '/:id',
  authenticateToken,
  validateRequest(deliveryNoteSchemas.update),
  DeliveryNoteController.update
);

// Deletar DeliveryNote
router.delete(
  '/:id',
  authenticateToken,
  validateRequest(deliveryNoteSchemas.delete),
  DeliveryNoteController.delete
);

// Listar todos os DeliveryNotes
router.get(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  DeliveryNoteController.getAll
);

// Buscar DeliveryNote por ID
router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  DeliveryNoteController.getById
);

// Filtros
router.get(
  '/invoice/:invoiceId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  DeliveryNoteController.getByInvoice
);

router.get(
  '/customer/:customerId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  DeliveryNoteController.getByCustomer
);

router.get(
  '/order/:orderId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  DeliveryNoteController.getByOrder
);

router.get(
  '/expedition/:expeditionId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  DeliveryNoteController.getByExpedition
);

// Filtrar por companyId ou branchId via query
router.get(
  '/company-or-branch',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  DeliveryNoteController.getByCompanyOrBranch
);

export default router;
