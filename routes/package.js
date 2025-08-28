import express from 'express';
import PackageController from '../controllers/PackageController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, packageSchemas } from '../middleware/validation.js';


const router = express.Router();

router.get('/', authenticateToken, PackageController.getAll);

router.post('/', authenticateToken, validateRequest(packageSchemas.create), authorizeRoles('admin', 'owner'), PackageController.create);

router.get('/:id', authenticateToken, PackageController.getById, authorizeRoles('admin', 'owner'));

router.put('/:id', authenticateToken, validateRequest(packageSchemas.update), authorizeRoles('admin', 'owner'), PackageController.update);

router.delete('/:id', authenticateToken, authorizeRoles('admin', 'owner'), PackageController.delete);

export default router;