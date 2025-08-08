import e from 'cors';
import { User, Company, Account, UserBranch } from '../models/index.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

class UserController {
    static async create(req, res) {
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
                permissions
            } = req.body;

            // Verificar se o tenant está especificado
            if (!req.tenant) {
                return res.status(400).json({
                    success: false,
                    message: 'Tenant não especificado'
                });
            }

            // Verificar se email já existe na empresa
            const existingUser = await User.findOne({
                where: {
                    email,
                    companyId: req.tenant.id
                }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email já está em uso nesta empresa'
                });
            }

            const user = await User.create({
                id: uuidv4(),
                email,
                username,
                password,
                firstName,
                lastName,
                phone,
                avatar,
                role: role || 'employee',
                permissions: permissions || [],
                companyId: req.tenant.id,
            });

            // Remover password da resposta
            const { password: _, ...userData } = user.toJSON();

            res.status(201).json({
                success: true,
                message: 'Usuário criado com sucesso',
                data: userData
            });
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }
    
    static async login(req, res) {
        try {
            const { email, username, password } = req.body;
            
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
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            const { password: _, ...entityData } = authenticatedEntity.toJSON();

            const userInBranch = await UserBranch.findOne({where: { userId: authenticatedEntity.id}})

            res.json({
                success: true,
                message: 'Login realizado com sucesso',
                data: {
                    [entityType]: entityData, // user ou account,
                    ['userInBranch']: userInBranch ? true : false, // Verifica se o usuário está vinculado a uma filial ou diretamente à empresa
                    token,
                    entityType,
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
            const { page = 1, limit = 10, role, active } = req.query;
            const offset = (page - 1) * limit;

            if (!req.tenant) {
                return res.status(400).json({
                    success: false,
                    message: 'Tenant não especificado'
                });
            }

            const where = {
                companyId: req.tenant.id
            };

            if (role) where.role = role;
            if (active !== undefined) where.active = active === 'true';

            const { count, rows } = await User.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                attributes: { exclude: ['password'] },
                order: [['createdAt', 'DESC']]
            });

            res.json({
                success: true,
                data: {
                    users: rows,
                    pagination: {
                        total: count,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(count / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
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

            if (!req.tenant) {
                return res.status(400).json({
                    success: false,
                    message: 'Tenant não especificado'
                });
            }

            const user = await User.findOne({
                where: {
                    id,
                    companyId: req.tenant.id
                },
                attributes: { exclude: ['password'] },
                include: [
                    {
                        model: Company,
                        as: 'company',
                        attributes: ['id', 'name', 'subdomain']
                    },
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
            console.error('Erro ao buscar usuário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }
    
    static async update(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            if (!req.tenant) {
                return res.status(400).json({
                    success: false,
                    message: 'Tenant não especificado'
                });
            }

            const user = await User.findOne({
                where: {
                    id,
                    companyId: req.tenant.id
                }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }

            // Verificar se email já existe (se está sendo atualizado)
            if (updates.email && updates.email !== user.email) {
                const existingUser = await User.findOne({
                    where: {
                        email: updates.email,
                        companyId: req.tenant.id
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

            const { password: _, ...userData } = user.toJSON();

            res.json({
                success: true,
                message: 'Usuário atualizado com sucesso',
                data: userData
            });
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
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

            if (!req.tenant) {
                return res.status(400).json({
                    success: false,
                    message: 'Tenant não especificado'
                });
            }

            const user = await User.findOne({
                where: {
                    id,
                    companyId: req.tenant.id
                }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }

            // Soft delete - apenas desativar
            await user.update({ active: false });

            res.json({
                success: true,
                message: 'Usuário desativado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao deletar usuário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
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
            const updates = req.body;

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

            // Verificar se email já existe (se está sendo atualizado)
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

            const { password: _, ...userData } = user.toJSON();

            res.json({
                success: true,
                message: 'Perfil atualizado com sucesso',
                data: userData
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