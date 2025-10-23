import { Account,Company } from '../models/index.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from '../utils/email/sendMail.js';
import { resetPasswordEmailTemplate } from '../utils/email/templates/resetPasswordEmail.js';
class AccountController {
    static async create(req, res) {
        try {
            const { email, username, password, role, accountType, referralId } = req.body;

            // Verificar se email já existe
            const existingAccount = await Account.findOne({ where: { email } });
            if (existingAccount) {
                return res.status(400).json({
                    success: false,
                    message: 'Email já está em uso'
                });
            }

            const account = await Account.create({
                id: uuidv4(),
                email,
                username,
                password,
                role: role || 'owner',
                accountType: accountType || 'client',
                referralId
            });

            // Remover password da resposta
            const { password: _, ...accountData } = account.toJSON();

            res.status(201).json({
                success: true,
                message: 'Conta criada com sucesso',
                data: accountData
            });
        } catch (error) {
            console.error('Erro ao criar conta:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    // --------------------- FORGOT PASSWORD ---------------------
  static async forgotPassword(req, res) {
        console.log('ACCOUNT forgot')

    try {
      const { email, subdomain } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email é obrigatório' });

      const account = await Account.findOne({ where: { email } });
      if (!account) return res.status(404).json({ success: false, message: 'Conta não encontrada' });

      const token = jwt.sign(
        { accountId: account.id },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const sub = subdomain || req.headers.host?.split('.')[0] || 'localhost';
      const resetLink = `http://${sub}.localhost:3001/reset-password/${token}`;

      const html = resetPasswordEmailTemplate({
        name: account.username || account.email,
        resetLink,
      });

      await sendEmail({
        to: email,
        subject: 'Redefinição de senha',
        html,
      });

      await account.update({
        resetToken: token,
        resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      return res.json({ success: true, message: 'Email de redefinição enviado com sucesso' });
    } catch (error) {
      console.error('Erro em forgotPassword:', error);
      return res.status(500).json({ success: false, message: 'Erro ao enviar email de redefinição', error: error.message });
    }
  }

  // --------------------- RESET PASSWORD ---------------------
  static async resetPassword(req, res) {
    console.log('ACCOUNT reset')
    try {
      const { newPassword } = req.body;
      const {token } = req.params
      if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Token e nova senha são obrigatórios' });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Token inválido ou expirado' });
      }

      const account = await Account.findByPk(decoded.accountId);
      if (!account) return res.status(404).json({ success: false, message: 'Conta não encontrada' });

   
     await account.update(
  { password: newPassword, resetToken: null, resetTokenExpiresAt: null },
  { individualHooks: true } // <-- dispara o hook beforeUpdate
);

      return res.json({ success: true, message: 'Senha redefinida com sucesso' });
    } catch (error) {
      console.error('Erro em resetPassword:', error);
      return res.status(500).json({ success: false, message: 'Erro ao redefinir senha', error: error.message });
    }
  }

    static async login(req, res) {
        try {
            const { email, password } = req.body;

            const account = await Account.findOne({ where: { email } });
            if (!account) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas'
                });
            }

            const isValidPassword = await account.validPassword(password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas'
                });
            }

            const token = jwt.sign(
                { id: account.id, email: account.email, role: account.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            const { password: _, ...accountData } = account.toJSON();

            res.cookie('token', token, {
                httpOnly: true,
                // secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
                secure: false,
                sameSite: 'lax', // Protege contra CSRF
                maxAge: 24 * 60 * 60 * 1000
            })

            res.json({
                success: true,
                message: 'Login realizado com sucesso',
                data: {
                    account: accountData,
                    token
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
            const { page = 1, limit = 10, role, accountType } = req.query;
            const offset = (page - 1) * limit;

            const where = {};
            if (role) where.role = role;
            if (accountType) where.accountType = accountType;

            // Filtrar por tenant se disponível
            if (req.tenant && req.user.accountType !== 'admin') {
                where.companyId = req.tenant.id;
            }

            const { count, rows } = await Account.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                attributes: { exclude: ['password'] },
                order: [['createdAt', 'DESC']]
            });

            res.json({
                success: true,
                data: {
                    accounts: rows,
                    pagination: {
                        total: count,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(count / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao buscar contas:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;

            const where = { id };

            // Filtrar por tenant se não for admin
            if (req.tenant && req.user.accountType !== 'admin') {
                where.companyId = req.tenant.id;
            }

            const account = await Account.findOne({
                where,
                attributes: { exclude: ['password'] },
                include: [
                    {
                        association: 'authProviders',
                        attributes: ['provider', 'email', 'photo']
                    }
                ]
            });

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Conta não encontrada'
                });
            }

            res.json({
                success: true,
                data: account
            });
        } catch (error) {
            console.error('Erro ao buscar conta:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

   static async update(req, res) {
  try {
    const updates = { ...req.body };

    // Impedir alteração de campos sensíveis
    delete updates.role;
    delete updates.accountType;
    delete updates.active;
    delete updates.companyId;
    delete updates.referralId;

    // Buscar conta autenticada
    const account = await Account.findByPk(req.user.id, {
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'subdomain', 'logo']
        }
      ]
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Conta não encontrada'
      });
    }

    // Verificar se email já existe
    if (updates.email && updates.email !== account.email) {
      const existingAccount = await Account.findOne({
        where: { email: updates.email }
      });
      if (existingAccount) {
        return res.status(400).json({
          success: false,
          message: 'Email já está em uso'
        });
      }
    }

    // Atualiza apenas os campos enviados
    await account.update(updates);

    // Gerar novo token atualizado
    const token = jwt.sign(
      {
        id: account.id,
        email: account.email,
        role: account.role,
        companyId: account.companyId,
        entityType: 'account'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remover senha
    const { password: _, ...accountData } = account.toJSON();

    // Formato de resposta igual ao UserController.login
    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: {
        account: accountData,
        userInBranch: false, // Accounts não possuem branches
        entityType: 'account',
        token,
        tenant: {
          id: account.company?.id || null,
          name: account.company?.name || null,
          subdomain: account.company?.subdomain || null,
          logo: account.company?.logo || null
        }
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil da conta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
}


    static async delete(req, res) {
        try {
            const { id } = req.params;

            const account = await Account.findByPk(id);
            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Conta não encontrada'
                });
            }

            await account.destroy();

            res.json({
                success: true,
                message: 'Conta deletada com sucesso'
            });
        } catch (error) {
            console.error('Erro ao deletar conta:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async profile(req, res) {
        try {
            const account = await Account.findByPk(req.user.id, {
                attributes: { exclude: ['password'] },
                include: [
                    {
                        association: 'authProviders',
                        attributes: ['provider', 'email', 'photo']
                    }
                ]
            });

            res.json({
                success: true,
                data: account
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
}

export default AccountController;