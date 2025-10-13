import { User, Company, Branch, UserBranch } from '../models/index.js';
import sequelize from '../config/database.js';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';
import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';

function userAccessFilter(req) {
  // Prioridade: user → context → tenant
  const companyId =
    req.user?.companyId ||
    req.context?.companyId ||
    req.tenant?.id;

  const branchId =
    req.user?.branchId ||
    req.context?.branchId ||
    null;

  const filter = {};
  if (companyId) filter.companyId = companyId;
  if (branchId) filter.branchId = branchId;

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
                return res.status(400).json({
                    success: false,
                    message: 'Email ou username é obrigatório'
                });
            }
            // O tenant já vem do middleware extractTenant via header X-Tenant-ID
            if (!req.tenant) {
                return res.status(400).json({
                    success: false,
                    message: 'Header X-Tenant-ID é obrigatório',
                    errors: [{
                        field: 'X-Tenant-ID',
                        message: 'Header X-Tenant-ID não foi fornecido ou tenant não encontrado'
                    }]
                });
            }

            let authenticatedEntity = null;
            let entityType = null;

            // Primeiro, tentar buscar um User na empresa especificada
            const whereConditionUser = {
                companyId: req.tenant.id,
                active: true
            };

            if (email) {
                whereConditionUser.email = email;
            } else if (username) {
                whereConditionUser.username = username;
            }

            const user = await User.findOne({
                where: whereConditionUser,
                include: [
                    {
                        model: Company,
                        as: 'company',
                        attributes: ['id', 'name', 'subdomain', 'logo']
                    }
                ]
            });

            if (user) {
                // Verificar senha do User
                const isValidPassword = await user.validPassword(password);
                if (isValidPassword) {
                    authenticatedEntity = user;
                    entityType = 'user';
                    // Atualizar último login
                    await user.update({ lastLoginAt: new Date() });
                }
            }

            // Se não encontrou User ou a senha não confere, tentar buscar Account vinculado ao tenant
            if (!authenticatedEntity) {
                const whereConditionAccount = {
                    companyId: req.tenant.id
                };

                if (email) {
                    whereConditionAccount.email = email;
                } else if (username) {
                    whereConditionAccount.username = username;
                }

                const account = await Account.findOne({
                    where: whereConditionAccount,
                    include: [
                        {
                            model: Company,
                            as: 'company',
                            attributes: ['id', 'name', 'subdomain', 'logo']
                        }
                    ]
                });

                if (account && account.password) {
                    // Verificar senha do Account
                    const isValidPassword = await account.validPassword(password);
                    if (isValidPassword) {
                        authenticatedEntity = account;
                        entityType = 'account';
                    }
                }
            }

            // Se não encontrou nem User nem Account válido
            if (!authenticatedEntity) {
                console.warn('Falha no login: Credenciais inválidas para email/username:', email || username);
                return res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas'
                });
            }

            // Gerar token JWT
            const token = jwt.sign(
                {
                    id: authenticatedEntity.id,
                    email: authenticatedEntity.email,
                    role: authenticatedEntity.role,
                    companyId: authenticatedEntity.companyId,
                    entityType: entityType // Adicionar tipo da entidade para diferenciar
                },
                process.env.JWT_SECRET,
                { expiresIn: rememberToken ? '7d' : process.env.JWT_EXPIRES_IN }
            );

            const { password: _, ...entityData } = authenticatedEntity.toJSON();

            const userInBranch = await UserBranch.findOne({where: { userId: authenticatedEntity.id}})

            res.cookie('token', token, {
                httpOnly: true,
                // secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
                secure: false,
                sameSite: 'lax', // Protege contra CSRF
                maxAge: rememberToken ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
            })

            res.json({
                success: true,
                message: 'Login realizado com sucesso',
                data: {
                    [entityType]: entityData, // user ou account,
                    ['userInBranch']: userInBranch ? true : false, // Verifica se o usuário está vinculado a uma filial ou diretamente à empresa
                    entityType,
                    token,
                    tenant: {
                        id: req.tenant.id,
                        name: req.tenant.name,
                        subdomain: req.tenant.subdomain,
                        logo: req.tenant.logo
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

    const user = await User.findByPk(id);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    // Tratar branchId e companyId
    if ('branchId' in updates) {
      updates.branchId = updates.branchId || null; // '' vira null
    }
    if ('companyId' in updates) {
      updates.companyId = updates.companyId || null; // '' vira null
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
    
  static  async delete(req, res) {
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