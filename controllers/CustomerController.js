import { Customer, Company, Branch, User, sequelize } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

class CustomerController {
    static async create(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const {
                name,
                document,
                email,
                phone,
                address,
                city,
                state,
                zipCode,
                country
            } = req.body;

            // Verificar se documento já existe (se fornecido)
            if (document) {
                const existingCustomer = await Customer.findOne({ where: { document } });
                if (existingCustomer) {
                    return res.status(400).json({
                        success: false,
                        message: 'Documento já está em uso por outro cliente'
                    });
                }
            }

            // Verificar se cnpj nao esta sendo usado por uma empresa ou filial

            if (document.length > 11) {
                const existingCompanyCnpj = await Company.findOne({ where: { cnpj: document } });
                if (existingCompanyCnpj) {
                    return res.status(400).json({
                        success: false,
                        message: 'Documento já está em uso por uma empresa',
                    });
                }

                const existingBranchCnpj = await Branch.findOne({ where: { cnpj: document } });
                if (existingBranchCnpj) {
                    return res.status(400).json({
                        success: false,
                        message: 'Documento já está em uso por uma filial',
                    });
                }
            }

            const customer = await Customer.create({
                id: uuidv4(),
                name,
                document: document || null,
                email,
                phone,
                address,
                city,
                state,
                zipCode,
                country: country || 'Brasil'
            }, { transaction });

            await transaction.commit();

            return res.status(201).json({
                success: true,
                message: 'Cliente criado com sucesso',
                data: customer
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Erro ao criar cliente:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const { active } = req.query;

            const where = {};
            if (active !== undefined) where.active = active === 'true';

            const { count, rows } = await Customer.findAndCountAll({
                where,
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            return res.json({
                success: true,
                data: {
                    customers: rows,
                    pagination: {
                        total: count,
                        page,
                        limit,
                        totalPages: Math.ceil(count / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const customer = await Customer.findByPk(id);

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente não encontrado'
                });
            }

            return res.json({
                success: true,
                data: customer
            });
        } catch (error) {
            console.error('Erro ao buscar cliente:', error);
            return res.status(500).json({
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

            const customer = await Customer.findByPk(id);
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente não encontrado'
                });
            }

            // Verificar se documento está sendo alterado e já existe
            if (updates.document && updates.document !== customer.document) {
                const existing = await Customer.findOne({ where: { document: updates.document } });
                if (existing) {
                    return res.status(400).json({
                        success: false,
                        message: 'Documento já está em uso por outro cliente'
                    });
                }
            }

            if (updates.document && updates.document !== customer.document && updates.document.length > 11) {
                const existingCompanyCnpj = await Company.findOne({ where: { cnpj: updates.document } });
                if (existingCompanyCnpj) {
                    return res.status(400).json({
                        success: false,
                        message: 'Documento já está em uso por uma empresa',
                    });
                }

                const existingBranchCnpj = await Branch.findOne({ where: { cnpj: updates.document } });
                if (existingBranchCnpj) {
                    return res.status(400).json({
                        success: false,
                        message: 'Documento já está em uso por uma filial',
                    });
                }
            }

            await Customer.update(updates, { where: { id } });

            return res.json({
                success: true,
                message: 'Cliente atualizado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const customer = await Customer.findByPk(id);

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente não encontrado'
                });
            }

            // Soft delete
            await customer.update({ active: false });

            return res.json({
                success: true,
                message: 'Cliente desativado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao desativar cliente:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }
}

export default CustomerController;
