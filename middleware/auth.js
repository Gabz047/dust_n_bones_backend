import jwt from 'jsonwebtoken';
import { Account, User } from '../models/index.js';

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de acesso requerido'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        let authenticatedEntity = null;

        // Se o token tem entityType, usar para determinar qual modelo buscar
        if (decoded.entityType) {
            if (decoded.entityType === 'user') {
                authenticatedEntity = await User.findByPk(decoded.id, {
                    include: [
                        {
                            association: 'company',
                            attributes: ['id', 'name', 'subdomain', 'active']
                        }
                    ]
                });
            } else if (decoded.entityType === 'account') {
                authenticatedEntity = await Account.findByPk(decoded.id, {
                    include: [
                        {
                            association: 'company',
                            attributes: ['id', 'name', 'subdomain', 'active']
                        }
                    ]
                });
            }
        } else {
            // Fallback para compatibilidade com tokens antigos
            // Tentar encontrar primeiro como User, depois como Account
            authenticatedEntity = await User.findByPk(decoded.id, {
                include: [
                    {
                        association: 'company',
                        attributes: ['id', 'name', 'subdomain', 'active']
                    }
                ]
            });

            if (!authenticatedEntity) {
                authenticatedEntity = await Account.findByPk(decoded.id, {
                    include: [
                        {
                            association: 'company',
                            attributes: ['id', 'name', 'subdomain', 'active']
                        }
                    ]
                });
            }
        }

        if (!authenticatedEntity) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Verificar se a entidade está ativa (se aplicável)
        if (authenticatedEntity.active === false) {
            return res.status(401).json({
                success: false,
                message: 'Usuário desativado'
            });
        }

        req.user = authenticatedEntity;
        req.entityType = decoded.entityType || (authenticatedEntity.firstName ? 'user' : 'account'); // Inferir tipo se não especificado
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Token inválido'
        });
    }
};

export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Permissões insuficientes.'
            });
        }
        next();
    };
};

export const authorizePermissions = (...permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }

        // Se for Account (backward compatibility), permitir
        if (!req.user.hasPermission) {
            return next();
        }

        // Verificar se tem alguma das permissões necessárias
        const hasPermission = permissions.some(permission => 
            req.user.hasPermission(permission)
        );

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Permissões insuficientes'
            });
        }

        next();
    };
};