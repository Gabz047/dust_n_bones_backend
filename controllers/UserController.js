import { User, Company, Branch, UserBranch, Account } from '../models/index.js';
import sequelize from '../config/database.js';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';
import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import { resolveTenant } from '../middleware/resolveTenant.js';


function userAccessFilter(req) {
  const filter = {};

  if (!req.userTenant) return filter;

  const { type, data } = req.userTenant;

  if (type === 'company') {
    // Se o tenant é uma company, pega todos os usuários da empresa
    filter.companyId = data.id;
    // branchId não é filtrado, pega todos
  } else if (type === 'branch') {
    // Se o tenant é uma branch, pega apenas usuários da branch
    filter.branchId = data.id;
  }

  return filter;
}

class UserController {
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const {
        email,
        username,
        password,
        firstName,
        lastName,
        phone,
        avatar,
        role,
        permissions,
        companyId,
        branchId,
        assignedBranches, // Nova: lista de branches para UserBranch
      } = req.body;

      // Verificar se email já existe na empresa
      const existingUser = await User.findOne({
        where: {
          email,
          companyId: companyId || req.context?.companyId
        }
      });

      if (existingUser) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Email já está em uso nesta empresa'
        });
      }

      const userData = {
        email,
        username,
        password,
        firstName,
        lastName,
        phone,
        avatar,
        role: role || 'employee',
        permissions: permissions || [],
      };

     const user = branchId
  ? await User.create({ branchId, ...userData }, { transaction })
  : await User.create({ companyId: companyId || req.context?.companyId, ...userData }, { transaction });

      // Criar UserBranch registros se assignedBranches for fornecido
      if (assignedBranches && Array.isArray(assignedBranches) && assignedBranches.length > 0) {
        const userBranchData = assignedBranches.map(bid => ({
          userId: user.id,
          branchId: bid,
          dateJoined: new Date()
        }));
        await UserBranch.bulkCreate(userBranchData, { transaction });
      }

      await transaction.commit();

      // Remover password da resposta
      const { password: _, ...userResponse } = user.toJSON();

      return res.status(201).json({ success: true, data: userResponse });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar usuário:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar usuário.',
        error: error.message
      });
    }
  }

 static async login(req, res) {
  try {
    const { email, username, password, rememberToken } = req.body;

    if (!email && !username) {
      console.log('[LOGIN] Nenhum email ou username fornecido');
      return res.status(400).json({
        success: false,
        message: 'Email ou username é obrigatório'
      });
    }

    const tenant = req.tenant;
    if (!tenant) {
      console.log('[LOGIN] Tenant não encontrado no header X-Tenant-ID');
      return res.status(400).json({
        success: false,
        message: 'Header X-Tenant-ID é obrigatório'
      });
    }

    console.log('[LOGIN] Tenant:', tenant);

    let authenticatedEntity = null;
    let entityType = null;

let userInclude; // ⬅️ declarar aqui, escopo da função

const userWhere = { active: true };
if (email) userWhere.email = email;
if (username) userWhere.username = username;

if (tenant.type === 'branch') {
  userInclude = [
    {
      model: Company,
      as: 'company',
      attributes: ['id', 'name', 'subdomain', 'logo']
    },
    {
      model: UserBranch,
      as: 'userBranches',
      attributes: ['branchId'],
      required: true,   
      where: { branchId: tenant.id } // filtra pelo tenant
    }
  ];
  console.log('USERINCLUDE',userInclude)
  // Não precisa de Op.or nem branchId no usuário
} else {
  userInclude = [
    { model: Company, as: 'company', attributes: ['id', 'name', 'subdomain', 'logo'] },
    { model: UserBranch, as: 'userBranches', attributes: ['branchId'], required: false }
  ];

  userWhere.companyId = tenant.id;
}

   console.log('[LOGIN] userWhere:', userWhere);
const user = await User.findOne({ where: userWhere, include: userInclude });

 

   
    console.log('[LOGIN] User encontrado:', user ? user.toJSON() : null);

    if (user) {
      const isValidPassword = await user.validPassword(password);
      console.log('[LOGIN] Password válido?', isValidPassword);
      if (isValidPassword) {
        authenticatedEntity = user;
        entityType = 'user';
        await user.update({ lastLoginAt: new Date() });
      }
    }

    // ------------------- BUSCA ACCOUNT -------------------
    if (!authenticatedEntity) {
      const accountWhere = { companyId: tenant.id };
      if (email) accountWhere.email = email;
      if (username) accountWhere.username = username;

      const account = await Account.findOne({
        where: accountWhere,
        include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'subdomain', 'logo'] }]
      });

      console.log('[LOGIN] Account encontrado:', account ? account.toJSON() : null);

      if (account && account.password) {
        const isValidPassword = await account.validPassword(password);
        console.log('[LOGIN] Account password válido?', isValidPassword);
        if (isValidPassword) {
          authenticatedEntity = account;
          entityType = 'account';
        }
      }
    }

    if (!authenticatedEntity) {
      console.log('[LOGIN] Nenhuma entidade autenticada, credenciais inválidas');
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    console.log('[LOGIN] Entidade autenticada:', entityType, authenticatedEntity.id);

    const token = jwt.sign(
      {
        id: authenticatedEntity.id,
        email: authenticatedEntity.email,
        role: authenticatedEntity.role,
        companyId: authenticatedEntity.companyId,
        entityType
      },
      process.env.JWT_SECRET,
      { expiresIn: rememberToken ? '7d' : process.env.JWT_EXPIRES_IN }
    );

    const { password: _, ...entityData } = authenticatedEntity.toJSON();
    const userInBranch = entityType === 'user'
      ? (await UserBranch.findOne({ where: { userId: authenticatedEntity.id } })) ? true : false
      : null;

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: rememberToken ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        [entityType]: entityData,
        userInBranch,
        entityType,
        token,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          logo: tenant.logo
        }
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
}




  static async getAll(req, res) {
  try {
    const { term, fields, role, active } = req.query;

    // Aplica o filtro de tenant (company ou branch)
    const where = userAccessFilter(req);

    // Filtro de pesquisa textual
    if (term && fields) {
      const searchFields = fields.split(',');
      where[Op.or] = searchFields.map((field) => ({
        [field]: { [Op.iLike]: `%${term}%` },
      }));
    }

    // Filtro por role
    if (role) {
      where.role = role;
    }

    // Filtro por status ativo
    if (active !== undefined) {
      where.active = active === 'true';
    }

    const result = await buildQueryOptions(req, User, {
      where,
      attributes: { exclude: ['password'] },
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] },
        {
          model: UserBranch,
          as: 'userBranches',
          include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar usuários.',
      error: error.message
    });
  }
}

  static async getById(req, res) {
    try {
      const { id } = req.params;

      const where = { id, ...userAccessFilter(req) };

      const user = await User.findOne({
        where,
        attributes: { exclude: ['password'] },
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name', 'subdomain', 'logo'] },
          { model: Branch, as: 'branch', attributes: ['id', 'name'] },
          {
            model: UserBranch,
            as: 'userBranches',
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
          }
        ],
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
      }

      const userInBranch = await UserBranch.findOne({ where: { userId: user.id } });
      const entityType = 'user';

      const { password: _, ...userData } = user.toJSON();

      res.json({
        success: true,
        message: 'Usuário encontrado com sucesso',
        data: {
          [entityType]: userData,
          userInBranch: userInBranch ? true : false,
          entityType,
          tenant: {
            id: user.company?.id,
            name: user.company?.name,
            subdomain: user.company?.subdomain,
            logo: user.company?.logo
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar usuário.',
        error: error.message
      });
    }
  }

  static async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const updates = { ...req.body };
      const assignedBranches = updates.assignedBranches; // Extrair antes de atualizar

      delete updates.assignedBranches; // Remover do objeto de updates

      const user = await User.findByPk(id);
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
      }

      // Tratar branchId e companyId
      if ('branchId' in updates) {
        updates.branchId = updates.branchId || null;
      }
      if ('companyId' in updates) {
        updates.companyId = updates.companyId || null;
      }

      // Verificar se email já existe (se está sendo atualizado)
      if (updates.email && updates.email !== user.email) {
        const existingUser = await User.findOne({
          where: {
            email: updates.email,
            companyId: user.companyId,
            id: { [Op.ne]: id }
          }
        });

        if (existingUser) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Email já está em uso nesta empresa'
          });
        }
      }

      // Atualizar apenas campos que vieram no payload
      const fieldsToUpdate = Object.keys(updates);
      await user.update(updates, { transaction, fields: fieldsToUpdate });

      // Gerenciar UserBranch se assignedBranches foi fornecido
      if (assignedBranches !== undefined && Array.isArray(assignedBranches)) {
        // Deletar todos os UserBranch existentes
        await UserBranch.destroy({ where: { userId: id }, transaction });

        // Criar novos registros se a lista não estiver vazia
        if (assignedBranches.length > 0) {
          const userBranchData = assignedBranches.map(branchId => ({
            userId: id,
            branchId: branchId,
            dateJoined: new Date()
          }));
          await UserBranch.bulkCreate(userBranchData, { transaction });
        }
      }

      await transaction.commit();

      const { password: _, ...userResponse } = user.toJSON();
      return res.json({ success: true, data: userResponse });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao atualizar usuário:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar usuário.',
        error: error.message
      });
    }
  }

  static async delete(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);

      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado.',
        });
      }

      // Verificar se é o único owner da empresa
      if (user.role === 'owner') {
        const ownerCount = await User.count({
          where: {
            companyId: user.companyId,
            role: 'owner',
            active: true
          }
        });

        if (ownerCount <= 1) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Não é possível desativar o único proprietário da empresa.',
          });
        }
      }

      // Deletar todos os UserBranch associados
      await UserBranch.destroy({ where: { userId: id }, transaction });

      // Soft delete - apenas desativar
      await user.update({ active: false }, { transaction });
      await transaction.commit();

      return res.json({
        success: true,
        message: 'Usuário desativado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: 'Erro ao deletar usuário.',
        error: error.message,
      });
    }
  }

  static async profile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name', 'subdomain', 'logo']
          },
          {
            model: UserBranch,
            as: 'userBranches',
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
          }
        ]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const updates = { ...req.body };

      // Remover campos que não podem ser atualizados pelo próprio usuário
      delete updates.role;
      delete updates.permissions;
      delete updates.companyId;
      delete updates.active;
      delete updates.assignedBranches; // Não permite auto-editar branches

      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Verificar se email já existe
      if (updates.email && updates.email !== user.email) {
        const existingUser = await User.findOne({
          where: {
            email: updates.email,
            companyId: user.companyId
          }
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email já está em uso nesta empresa'
          });
        }
      }

      await user.update(updates);

      const userInBranch = await UserBranch.findOne({ where: { userId: user.id } });
      const entityType = 'user';

      const { password: _, ...userData } = user.toJSON();

      res.json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: {
          [entityType]: userData,
          userInBranch: userInBranch ? true : false,
          entityType,
          tenant: {
            id: user.company?.id,
            name: user.company?.name,
            subdomain: user.company?.subdomain,
            logo: user.company?.logo
          }
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}

export default UserController;