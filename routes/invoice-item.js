import express from 'express';
import InvoiceItemController from '../controllers/InvoiceItemController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, invoiceItemSchemas } from '../middleware/validation.js';

const router = express.Router();

// Criar múltiplos InvoiceItems
router.post(
  '/batch',
  authenticateToken,
  validateRequest(invoiceItemSchemas.createBatch),
  InvoiceItemController.createBatch
);

// Atualizar múltiplos InvoiceItems
router.put(
  '/batch',
  authenticateToken,
  validateRequest(invoiceItemSchemas.updateBatch),
  InvoiceItemController.updateBatch
);

// Deletar múltiplos InvoiceItems
router.delete(
  '/batch',
  authenticateToken,
  validateRequest(invoiceItemSchemas.deleteBatch),
  InvoiceItemController.deleteBatch
);

// Listar todos os InvoiceItems
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  InvoiceItemController.getAll
);

// Buscar InvoiceItem por ID
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  InvoiceItemController.getById
);

// Buscar por Invoice
router.get(
  '/invoice/:invoiceId',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  InvoiceItemController.getByInvoice
);

// Buscar por DeliveryNote
router.get(
  '/delivery-note/:deliveryNoteId',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  InvoiceItemController.getByDeliveryNote
);

// Buscar por Order
router.get(
  '/order/:orderId',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  InvoiceItemController.getByOrder
);

export default router;
