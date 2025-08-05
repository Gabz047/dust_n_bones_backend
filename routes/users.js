import express from 'express';
import UserController from '../controllers/UserController.js';
import { authenticateToken } from '../middleware/auth.js';
import { extractTenant } from '../middleware/tenant.js';
import { validateRequest } from '../middleware/validation.js';
import { userSchemas } from '../middleware/validation.js';

const router = express.Router();

// Middleware de tenant aplicado em todas as rotas
router.use(extractTenant);

// Rota de login do usuário (não requer autenticação)
router.post('/login', UserController.login);

// Middleware de autenticação aplicado nas rotas protegidas
router.use(authenticateToken);

// Rotas CRUD de usuários
router.get('/', UserController.getAll);
router.get('/:id', UserController.getById);
router.post('/', validateRequest(userSchemas.create), UserController.create);
router.put('/:id', validateRequest(userSchemas.update), UserController.update);
router.delete('/:id', UserController.delete);

// Rota especial para atualizar perfil do usuário logado
router.put('/profile/me', validateRequest(userSchemas.updateProfile), UserController.updateProfile);

export default router;
