import express from 'express';
import MovementLogEntityController from '../controllers/MovementLogEntityController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, movementLogEntitySchemas } from '../middleware/validation.js';

const router = express.Router();

// Criar movimentação
router.post(
  '/',
  authenticateToken,
  validateRequest(movementLogEntitySchemas.create),
  MovementLogEntityController.create
);

// Listar todas as movimentações
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  MovementLogEntityController.getAll
);

// Buscar por ID
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  MovementLogEntityController.getById
);

// Filtrar por status
router.get(
  '/status/:status',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  MovementLogEntityController.getByStatus
);

// Filtrar por método
router.get(
  '/method/:method',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  MovementLogEntityController.getByMethod
);

// Filtrar por usuário
router.get(
  '/user/:userId',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  MovementLogEntityController.getByUser
);

// Filtrar por data (intervalo)
router.get(
  '/date',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  MovementLogEntityController.getByDate
);

// Filtrar por entidade (ex: fatura, romaneio)
router.get(
  '/entity/:entity',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  MovementLogEntityController.getByEntity
);

// Filtrar por ID da entidade
router.get(
  '/entity-id/:entityId',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  MovementLogEntityController.getByEntityId
);

// Pegar último status de uma entidade
router.get(
  '/last-status',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  MovementLogEntityController.getLastStatus
);

export default router;
