import express from 'express';
import MovementLogEntityItemController from '../controllers/MovementLogEntityItemController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Criar vários itens de movimentação
router.post(
  '/batch',
  authenticateToken,
  MovementLogEntityItemController.createBatch
);

// Listar todos
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  MovementLogEntityItemController.getAll
);

// Buscar por ID
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  MovementLogEntityItemController.getById
);

// Buscar por MovementLogEntity
router.get(
  '/movement-log-entity/:movementLogEntityId',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  MovementLogEntityItemController.getByMovementLogEntity
);

// Buscar por entidade (ex: romaneio, fatura, caixa, expedição)
router.get(
  '/entity/:entity',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  MovementLogEntityItemController.getByEntity
);

// Buscar por entityId (ex: todos itens de uma fatura específica)
router.get(
  '/entity-id/:entityId',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  MovementLogEntityItemController.getByEntityId
);

// Buscar por intervalo de datas
router.get(
  '/date',
  authenticateToken,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  MovementLogEntityItemController.getByDate
);

export default router;
