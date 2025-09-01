import express from 'express';
import ProductionOrderStatusController from '../controllers/ProductionOrderStatusController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, productionOrderStatusSchemas } from '../middleware/validation.js';

const router = express.Router();

router.get('/', authenticateToken, ProductionOrderStatusController.getAll);

router.post(
    '/',
    authenticateToken,
    validateRequest(productionOrderStatusSchemas.create),
    authorizeRoles('admin', 'owner'),
    ProductionOrderStatusController.create
);

router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('admin', 'owner'),
    ProductionOrderStatusController.getById
);

router.get(
    '/companyOrBranch/:id',
    authenticateToken,
    authorizeRoles('admin', 'owner'),
    ProductionOrderStatusController.getByCompanyOrBranch
);

router.get(
    '/productionOrder/:id',
    authenticateToken,
    authorizeRoles('admin', 'owner'),
    ProductionOrderStatusController.getByProductionOrder
);

router.put(
    '/:id',
    authenticateToken,
    validateRequest(productionOrderStatusSchemas.update),
    authorizeRoles('admin', 'owner'),
    ProductionOrderStatusController.update
);

router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('admin', 'owner'),
    ProductionOrderStatusController.delete
);

export default router;
