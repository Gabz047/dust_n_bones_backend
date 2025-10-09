import { Company, Branch } from '../models/index.js';
import { RedisCache } from '../config/redis.js';

// Middleware obrigatório
export const extractTenant = async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Header X-Tenant-ID é obrigatório'
            });
        }

        // Tentar pegar no cache primeiro
        let tenant = await RedisCache.getTenantData(tenantId);

        if (!tenant) {
            // Buscar primeiro como branch
            tenant = await Branch.findOne({
                where: { id: tenantId, active: true },
                include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
                raw: true,
                nest: true // Para manter a associação como objeto aninhado
            });

            if (!tenant) {
                // Buscar como company
                tenant = await Company.findOne({
                    where: { id: tenantId, active: true },
                    raw: true
                });
            }

            console.log('🔍 Tenant buscado no banco:', tenant);

            if (tenant) {
                await RedisCache.setTenantData(tenantId, tenant, 1800); // TTL 30min
            }
        } else {
            console.log('🟢 Tenant recuperado do cache Redis');
        }

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant não encontrado ou inativo'
            });
        }

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

// Middleware opcional
export const optionalTenant = async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];

        if (tenantId) {
            let tenant = await Branch.findOne({
                where: { id: tenantId, active: true },
                include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
                raw: true,
                nest: true
            });

            if (!tenant) {
                tenant = await Company.findOne({
                    where: { id: tenantId, active: true },
                    raw: true
                });
            }

            if (tenant) {
                req.tenant = tenant;
            }
        }

        next();
    } catch (error) {
        console.error('Erro no middleware opcional de tenant:', error);
        next(); // Continua mesmo com erro
    }
};

// Validar acesso ao tenant (branch ou company)
export const validateTenantAccess = (req, res, next) => {
    if (req.user && req.tenant) {
        const tenantId = req.tenant.id;

        // Se o usuário não for admin e não pertencer à company ou branch
        if (req.user.accountType !== 'admin' && req.user.companyId !== tenantId && req.user.branchId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado ao tenant especificado'
            });
        }
    }

    next();
};
