import express from 'express';
import DeliveryNoteItemController from '../controllers/DeliveryNoteItemController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, deliveryNoteItemSchemas } from '../middleware/validation.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Criar vários DeliveryNoteItems
router.post(
  '/batch',
  authenticateToken,
  validateRequest(deliveryNoteItemSchemas.createBatch),
  DeliveryNoteItemController.createBatch
);

// Atualizar vários DeliveryNoteItems
router.put(
  '/batch',
  authenticateToken,
  validateRequest(deliveryNoteItemSchemas.updateBatch),
  DeliveryNoteItemController.updateBatch
);

// Deletar vários DeliveryNoteItems
router.delete(
  '/batch',
  authenticateToken,
  validateRequest(deliveryNoteItemSchemas.deleteBatch),
  DeliveryNoteItemController.deleteBatch
);

// Listar todos
router.get(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  DeliveryNoteItemController.getAll
);

// Buscar por ID
router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  DeliveryNoteItemController.getById
);

// Buscar itens por DeliveryNote
router.get(
  '/delivery-note/:deliveryNoteId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  DeliveryNoteItemController.getByDeliveryNote
);

// Buscar itens por Box
router.get(
  '/box/:boxId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  DeliveryNoteItemController.getByBox
);

export default router;
