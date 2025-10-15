import { Branch, Company } from '../models/index.js';

/**
 * Middleware para extrair o tenant (branch ou company) da URL ou header
 * e colocar no req.userTenant para uso no controller
 */
export const resolveTenant = async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'] || req.params.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Header X-Tenant-ID ou param tenantId é obrigatório'
            });
        }

        let tenant = await Branch.findOne({
            where: { id: tenantId, active: true },
            include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
            raw: true,
            nest: true
        });

        let tenantType = 'branch';

        if (!tenant) {
            tenant = await Company.findOne({
                where: { id: tenantId, active: true },
                raw: true
            });
            tenantType = 'company';
        }

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant não encontrado ou inativo'
            });
        }

        req.userTenant = {
            type: tenantType, // 'branch' ou 'company'
            data: tenant
        };

        next();
    } catch (error) {
        console.error('Erro no middleware resolveTenant:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};
