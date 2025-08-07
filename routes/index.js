import express from 'express';
import accountRoutes from './accounts.js';
import companyRoutes from './companies.js';
import companySettingsRoutes from './company-settings.js';
import companyCustomizationRoutes from './company-customizations.js';
import tenantRoutes from './tenants.js';
import userRoutes from './users.js';
import branchRoutes from './branch.js'
import userBranchRoutes from './userBranch.js'
import SignupController from '../controllers/SignupController.js';
import { validateRequest, signupSchema } from '../middleware/validation.js';

const router = express.Router();

// Rota de teste da API
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API Estoquelogia funcionando!',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            signup: '/api/signup',
            accounts: '/api/accounts',
            companies: '/api/companies',
            companySettings: '/api/company-settings',
            companyCustomizations: '/api/company-customizations',
            tenants: '/api/tenants',
            users: '/api/users',
            branches: '/api/branches',
            userBranches: '/api/userBranches'
        }
    });
});

// Rota de signup (criação de conta + empresa)
router.post('/signup', validateRequest(signupSchema), SignupController.signup);

// Rotas dos módulos
router.use('/userBranches', userBranchRoutes)
router.use('/branches', branchRoutes)
router.use('/accounts', accountRoutes);
router.use('/companies', companyRoutes);
router.use('/company-settings', companySettingsRoutes);
router.use('/company-customizations', companyCustomizationRoutes);
router.use('/tenants', tenantRoutes);
router.use('/users', userRoutes);

export default router;