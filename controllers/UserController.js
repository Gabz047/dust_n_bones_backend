import { User, Company, Branch, UserBranch, Account } from '../models/index.js';
import sequelize from '../config/database.js';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';
import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../utils/email/sendMail.js';
import bcrypt from 'bcryptjs'
import { resetPasswordEmailTemplate } from '../utils/email/templates/resetPasswordEmail.js'
// Função auxiliar para garantir que companyId sempre exista
function resolveCompanyId(req, fallbackId) {
  return req.body.companyId || req.context?.companyId || fallbackId;
}

// Filtro de acesso baseado no tenant (company ou branch)
function userAccessFilter(req) {
  const filter = {};
  if (!req.userTenant) return filter;

  const { type, data } = req.userTenant;

  if (type === 'company') {
    filter.companyId = data.id;
  } else if (type === 'branch') {
    filter.branchId = data.id;
    filter.companyId = data.companyId; // garante que branch também retorna company
  }

  return filter;
}

class UserController {
  // --------------------- CREATE ---------------------
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
        branchId,
        assignedBranches
      } = req.body;

      const resolvedCompanyId = resolveCompanyId(req);
      if (!resolvedCompanyId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Não foi possível determinar a empresa associada a este usuário.',
        });
      }

      const existingUser = await User.findOne({
        where: { email, companyId: resolvedCompanyId }
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
        companyId: resolvedCompanyId,
        branchId: branchId || null
      };

      const user = await User.create(userData, { transaction });

      if (Array.isArray(assignedBranches) && assignedBranches.length > 0) {
        const userBranchData = assignedBranches.map(bid => ({
          userId: user.id,
          branchId: bid,
          dateJoined: new Date()
        }));
        await UserBranch.bulkCreate(userBranchData, { transaction });
      }

      await transaction.commit();

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

  // --------------------- FORGOT PASSWORD ---------------------
  static async forgotPassword(req, res) {
    console.log('USER FORGOT')

    try {
      const { email, subdomain } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email é obrigatório' });

      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });

      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const sub = subdomain || req.headers.host?.split('.')[0] || 'localhost';
      const resetLink = `https://${sub}.estoquelogia.com/reset-password/${token}`;

      console.log('================SUBBBB💀💀💀💀💀', sub)
      console.log('RESET >>>>>>>>>>>>>>>>>>>>>>🦆🦆🦆', resetLink)
      const html = resetPasswordEmailTemplate({
        name: user.firstName,
        resetLink,
      });

      console.log('FRONTEND_URL:', process.env.FRONTEND_URL, token);


      await sendEmail({
        to: email,
        subject: 'Redefinição de senha',
        html,
      });

      // opcional: salvar no banco se quiser invalidar depois
      await user.update({ resetToken: token, resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000) });

      return res.json({ success: true, message: 'Email de redefinição enviado com sucesso' });
    } catch (error) {
      console.error('Erro em forgotPassword:', error);
      return res.status(500).json({ success: false, message: 'Erro ao enviar email de redefinição', error: error.message });
    }
  }

  // --------------------- RESET PASSWORD ---------------------
  static async resetPassword(req, res) {
    console.log('USER RESET')

    try {
      const { newPassword } = req.body;
      const { token } = req.params
      if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Token e nova senha são obrigatórios' });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Token inválido ou expirado' });
      }

      const user = await User.findByPk(decoded.userId);
      if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });

      await user.update(
        { password: newPassword, resetToken: null, resetTokenExpiresAt: null },
        { individualHooks: true }
      );

      return res.json({ success: true, message: 'Senha redefinida com sucesso' });
    } catch (error) {
      console.error('Erro em resetPassword:', error);
      return res.status(500).json({ success: false, message: 'Erro ao redefinir senha', error: error.message });
    }
  }


  // --------------------- LOGIN ---------------------
  static async login(req, res) {
    try {
      const { email, username, password, rememberToken, branchId } = req.body;

      if (!email && !username) {
        return res.status(400).json({ success: false, message: 'Email ou username é obrigatório' });
      }

      const tenant = req.tenant;
      if (!tenant) {
        return res.status(400).json({ success: false, message: 'Header X-Tenant-ID é obrigatório' });
      }

      let authenticatedEntity = null;
      let entityType = null;
      let userInBranch = false;
      let allowedBranches = [];

      // ------------------- BUSCA USUÁRIO -------------------
      const userWhere = { active: true };
      if (email) userWhere.email = email;
      if (username) userWhere.username = username;

      const userInclude = [
        { model: Company, as: 'company', attributes: ['id', 'name', 'subdomain', 'logo'] },
        { model: UserBranch, as: 'userBranches', attributes: ['branchId'], required: false }
      ];

      const user = await User.findOne({ where: userWhere, include: userInclude });

      if (user && await user.validPassword(password)) {
        authenticatedEntity = user;
        entityType = 'user';
        await user.update({ lastLoginAt: new Date() });

        userInBranch = Array.isArray(user.userBranches) && user.userBranches.length > 0;
        allowedBranches = userInBranch ? user.userBranches.map(ub => ub.branchId) : [];

        // ✅ Agora o usuário de filial também pode logar na company
        // Se branchId for passado, apenas validamos se é uma filial que ele tem acesso
        if (branchId) {
          if (userInBranch && !allowedBranches.includes(branchId)) {
            return res.status(403).json({
              success: false,
              message: 'Acesso negado: filial selecionada não pertence a este usuário.'
            });
          }
        }
      }

      // ------------------- BUSCA ACCOUNT SE NÃO ACHOU USUÁRIO -------------------
      if (!authenticatedEntity) {
        const accountWhere = { companyId: tenant.id };
        if (email) accountWhere.email = email;
        if (username) accountWhere.username = username;

        const account = await Account.findOne({
          where: accountWhere,
          include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'subdomain', 'logo'] }]
        });

        if (account && account.password && await account.validPassword(password)) {
          authenticatedEntity = account;
          entityType = 'account';
          userInBranch = false;
        }
      }

      if (!authenticatedEntity) {
        return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
      }

      // ------------------- GERA TOKEN -------------------
      const token = jwt.sign(
        {
          id: authenticatedEntity.id,
          email: authenticatedEntity.email,
          role: authenticatedEntity.role,
          companyId: authenticatedEntity.companyId || tenant.id,
          entityType
        },
        process.env.JWT_SECRET,
        { expiresIn: rememberToken ? '7d' : process.env.JWT_EXPIRES_IN }
      );

      const { password: _, ...entityData } = authenticatedEntity.toJSON();

      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: rememberToken ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
      });

      return res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          [entityType]: entityData,
          userInBranch,
          allowedBranches,
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
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // --------------------- GET ALL ---------------------
  static async getAll(req, res) {
    try {
      const { term, fields, role, active } = req.query;
      const where = userAccessFilter(req);

      if (term && fields) {
        const searchFields = fields.split(',');
        where[Op.or] = searchFields.map(field => ({ [field]: { [Op.iLike]: `%${term}%` } }));
      }

      if (role) where.role = role;
      if (active !== undefined) where.active = active === 'true';

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
      return res.status(500).json({ success: false, message: 'Erro ao buscar usuários.', error: error.message });
    }
  }

  // --------------------- GET BY ID ---------------------
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
          { model: UserBranch, as: 'userBranches', include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'companyId'] }] },
          { model: Branch, as: 'assignedBranches', attributes: ['id', 'name', 'companyId'], through: { attributes: [] } }
        ],
      });

      if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });

      const userInBranch = await UserBranch.findOne({ where: { userId: user.id } });
      const { password: _, ...userData } = user.toJSON();

      return res.json({
        success: true,
        message: 'Usuário encontrado com sucesso',
        data: {
          user: userData,
          userInBranch: !!userInBranch,
          entityType: 'user',
          tenant: {
            id: user.company?.id || resolveCompanyId(req),
            name: user.company?.name,
            subdomain: user.company?.subdomain,
            logo: user.company?.logo
          }
        }
      });

    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar usuário.', error: error.message });
    }
  }

  // --------------------- UPDATE ---------------------
 // --------------------- UPDATE ---------------------
static async update(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    const assignedBranches = updates.assignedBranches;
    delete updates.assignedBranches;

    const user = await User.findByPk(id);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    updates.companyId = resolveCompanyId(req, user.companyId);
    updates.branchId = updates.branchId || null;

    // Verifica se o e-mail já está em uso
    if (updates.email && updates.email !== user.email) {
      const existingUser = await User.findOne({
        where: { email: updates.email, companyId: user.companyId, id: { [Op.ne]: id } }
      });
      if (existingUser) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Email já está em uso nesta empresa' });
      }
    }

    // 🔒 --- Verificação de senha atual antes de trocar ---
    if (updates.currentPassword || updates.newPassword) {
      if (!updates.currentPassword || !updates.newPassword) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Para alterar a senha, envie senha atual e nova senha.',
        });
      }

      const isValid = await bcrypt.compare(updates.currentPassword, user.password);
      if (!isValid) {
        await transaction.rollback();
        return res.status(401).json({
          success: false,
          message: 'Senha atual incorreta.',
        });
      }

      // Atualiza a senha (hash via hook `beforeUpdate`)
      user.password = updates.newPassword;
    }

    // Remove campos temporários do body
    delete updates.currentPassword;
    delete updates.newPassword;

    // Atualiza os demais campos
    await user.update(updates, { transaction, individualHooks: true });

    // Atualiza filiais vinculadas (se houver)
    if (assignedBranches !== undefined && Array.isArray(assignedBranches)) {
      await UserBranch.destroy({ where: { userId: id }, transaction });
      if (assignedBranches.length > 0) {
        const userBranchData = assignedBranches.map(branchId => ({
          userId: id,
          branchId,
          dateJoined: new Date()
        }));
        await UserBranch.bulkCreate(userBranchData, { transaction });
      }
    }

    await transaction.commit();

    const { password: _, ...userResponse } = user.toJSON();
    return res.json({
      success: true,
      message: 'Usuário atualizado com sucesso.',
      data: userResponse,
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao atualizar usuário:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar usuário.',
      error: error.message,
    });
  }
}


  // --------------------- DELETE ---------------------
  static async delete(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);

      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
      }

      if (user.role === 'owner') {
        const ownerCount = await User.count({ where: { companyId: user.companyId, role: 'owner', active: true } });
        if (ownerCount <= 1) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'Não é possível desativar o único proprietário da empresa.' });
        }
      }

      await UserBranch.destroy({ where: { userId: id }, transaction });
      await user.update({ active: false }, { transaction });
      await transaction.commit();

      return res.json({ success: true, message: 'Usuário desativado com sucesso.' });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao deletar usuário:', error);
      return res.status(500).json({ success: false, message: 'Erro ao deletar usuário.', error: error.message });
    }
  }

  // --------------------- PROFILE ---------------------
  static async profile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] },
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name', 'subdomain', 'logo'] },
          { model: UserBranch, as: 'userBranches', include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }] }
        ]
      });

      if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });

      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // --------------------- UPDATE PROFILE ---------------------
  // --------------------- UPDATE PROFILE ---------------------
// --------------------- UPDATE PROFILE ---------------------
static async updateProfile(req, res) {
  try {
    const updates = { ...req.body };

    // Impede atualização de campos sensíveis
    delete updates.role;
    delete updates.permissions;
    delete updates.companyId;
    delete updates.active;
    delete updates.assignedBranches;

    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'subdomain', 'logo'],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    // 🔍 Verifica se o novo e-mail já existe
    if (updates.email && updates.email !== user.email) {
      const existingUser = await User.findOne({
        where: { email: updates.email, companyId: user.companyId },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email já está em uso nesta empresa',
        });
      }
    }

    // 🔒 --- Verificação e troca segura de senha ---
    if (updates.currentPassword || updates.newPassword) {
      if (!updates.currentPassword || !updates.newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Para alterar a senha, envie senha atual e nova senha.',
        });
      }

      const isValid = await bcrypt.compare(updates.currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Senha atual incorreta.',
        });
      }

      // ✅ Corrigido: seta a nova senha dentro do objeto updates
      updates.password = updates.newPassword;
    }

    // Remove campos temporários
    delete updates.currentPassword;
    delete updates.newPassword;

    // Atualiza demais dados (senha inclusa, hash via hook beforeUpdate)
    await user.update(updates, { individualHooks: true });

    const userInBranch = await UserBranch.findOne({ where: { userId: user.id } });
    const entityType = 'user';
    const { password: _, ...userData } = user.toJSON();

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: {
        [entityType]: userData,
        userInBranch: !!userInBranch,
        entityType,
        tenant: {
          id: user.company?.id || resolveCompanyId(req),
          name: user.company?.name,
          subdomain: user.company?.subdomain,
          logo: user.company?.logo,
        },
      },
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
    });
  }
}

}

export default UserController;
