import express from 'express';
import StatusController from '../controllers/StatusController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, statusSchemas } from '../middleware/validation.js';

const router = express.Router();

// Buscar todos os status
router.get('/', authenticateToken, StatusController.getAll);

// Criar novo status
router.post(
  '/',
  authenticateToken,
  validateRequest(statusSchemas.create),
  authorizeRoles('admin', 'owner'),
  StatusController.create
);

// Buscar status por ID
router.get('/:id', authenticateToken, StatusController.getById);

// Atualizar status
router.put(
  '/:id',
  authenticateToken,
  validateRequest(statusSchemas.update),
  authorizeRoles('admin', 'owner'),
  StatusController.update
);

// Deletar status
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'owner'), StatusController.delete);

// Buscar status por usuário
router.get('/user/:userId', authenticateToken, StatusController.getByUser);

// Buscar status por pedido
router.get('/order/:orderId', authenticateToken, StatusController.getByOrder);

export default router;
