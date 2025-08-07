import { Company } from '../models/index.js';

export const extractTenant = async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Header X-Tenant-ID é obrigatório'
            });
        }

        // Buscar e validar o tenant
        const tenant = await Company.findOne({
            where: {
                id: tenantId,
                active: true
            }
        }); 

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant não encontrado ou inativo'
            });
        }

        // Adicionar tenant ao request
        req.tenant = tenant;
        next();
    } catch (error) {
        console.error('Erro no middleware de tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

export const optionalTenant = async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];

        if (tenantId) {
            const tenant = await Company.findOne({
                where: {
                    id: tenantId,
                    active: true
                }
            });

            if (tenant) {
                req.tenant = tenant;
            }
        }

        next();
    } catch (error) {
        console.error('Erro no middleware opcional de tenant:', error);
        next(); // Continua mesmo com erro no tenant opcional
    }
};

export const validateTenantAccess = (req, res, next) => {
    // Verificar se o usuário tem acesso ao tenant
    if (req.user && req.tenant) {
        // Se o usuário não pertencer ao tenant
        if (req.user.companyId !== req.tenant.id) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado ao tenant especificado'
            });
        }
    }

    next();
};