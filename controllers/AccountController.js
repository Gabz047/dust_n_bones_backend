import { Account } from '../models/index.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

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
            const { id } = req.params;
            const updates = req.body;

            const account = await Account.findByPk(id);
            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Conta não encontrada'
                });
            }

            // Verificar se email já existe (se está sendo atualizado)
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

            await account.update(updates);

            const { password: _, ...accountData } = account.toJSON();

            res.json({
                success: true,
                message: 'Conta atualizada com sucesso',
                data: accountData
            });
        } catch (error) {
            console.error('Erro ao atualizar conta:', error);
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