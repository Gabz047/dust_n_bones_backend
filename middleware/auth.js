import jwt from 'jsonwebtoken';
import { Account, User } from '../models/index.js';
import { redisClient } from '../config/redis.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = req.cookies?.token || (req.headers['authorization'] && authHeader && authHeader.split(' ')[1]);

  console.log('Token do cookie:', req.cookies.token);
  console.log('Token do header Authorization:', authHeader);
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acesso requerido'
    });
  }

  try {
    // Decodifica o token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Define a chave do cache Redis para este usuário
    const cacheKey = `authUser:${decoded.entityType || 'user'}:${decoded.id}`;

    // Tenta obter o usuário do cache
    const cachedUserJSON = await redisClient.get(cacheKey);
    if (cachedUserJSON) {
      // Se achou no cache, parseia e atribui ao req.user
      const cachedUser = JSON.parse(cachedUserJSON);
      req.user = cachedUser;
      req.entityType = decoded.entityType || (cachedUser.firstName ? 'user' : 'account');
      console.log('🟢 Usuário recuperado do cache Redis');
      return next();
    }

    // Se não achou no cache, busca no banco de dados
    let authenticatedEntity = null;

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
      // Compatibilidade com tokens antigos: tenta user, depois account
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

    // Se não encontrou no banco, erro 401
    if (!authenticatedEntity) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Se usuário inativo, bloqueia
    if (authenticatedEntity.active === false) {
      return res.status(401).json({
        success: false,
        message: 'Usuário desativado'
      });
    }

    // Salva no cache para próximas requisições (TTL 1 hora)
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(authenticatedEntity));

    // Coloca no request para usar nos próximos middlewares
    req.user = authenticatedEntity;
    req.entityType = decoded.entityType || (authenticatedEntity.firstName ? 'user' : 'account');

    console.log('🟡 Usuário buscado no banco e salvo no cache Redis');

    next();

  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

// Middleware para autorizar por roles (funções/perfis)
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Se não tiver usuário autenticado, bloqueia
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Se o role do usuário NÃO estiver na lista de roles permitidos, bloqueia
    if (!roles.includes(req.user.role)) {
      console.log(`🚫 Acesso negado para usuário ${req.user.id} com role "${req.user.role}". Roles permitidos: [${roles}]`);
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Permissões insuficientes.'
      });
    }

    console.log(`✅ Usuário ${req.user.id} autorizado com role "${req.user.role}"`);
    next();
  };
};

// Middleware para autorizar por permissões específicas
export const authorizePermissions = (...permissions) => {
  return (req, res, next) => {
    // Se não tiver usuário autenticado, bloqueia
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Caso o modelo da entidade não tenha o método hasPermission (exemplo: Account), permite seguir (backward compatibility)
    if (typeof req.user.hasPermission !== 'function') {
      console.log(`⚠️ Entidade ${req.entityType} não tem método hasPermission. Permitindo acesso.`);
      return next();
    }

    // Verifica se tem alguma das permissões necessárias
    const hasAnyPermission = permissions.some(permission => req.user.hasPermission(permission));

    if (!hasAnyPermission) {
      console.log(`🚫 Usuário ${req.user.id} não tem permissões necessárias: [${permissions}]`);
      return res.status(403).json({
        success: false,
        message: 'Permissões insuficientes'
      });
    }

    console.log(`✅ Usuário ${req.user.id} autorizado com permissões: [${permissions}]`);
    next();
  };
};
