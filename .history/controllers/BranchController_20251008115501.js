import { Branch, Company, CompanySettings, CompanyCustomize, User, UserBranch, sequelize } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

class BranchController {
    static async create(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const {
                name,
                logo,
                cnpj,
                email,
                phone,
                address,
                city,
                state,
                zipCode,
                country,
                website,
                description,
                maxUsers,
                companyId,
                ownerId,
            } = req.body;


            // Verificar se CNPJ já existe (se fornecido) por uma empresa
            if (cnpj) {
                const existingCompanyCnpj = await Company.findOne({ where: { cnpj } });
                if (existingCompanyCnpj) {
                    return res.status(400).json({
                        success: false,
                        message: 'CNPJ já está em uso por uma empresa'
                    });
                }
            }

            // Verificar se CNPJ já existe (se fornecido) por uma filial
            if (cnpj) {
                const existingBranchCnpj = await Branch.findOne({ where: { cnpj } });
                if (existingBranchCnpj) {
                    return res.status(400).json({
                        success: false,
                        message: 'CNPJ já está em uso por uma filial'
                    });
                }
            }

            //Verificar se empresa está ativa
            const activeCompany = await Company.findOne({ where: { id: companyId, active: true } })
            if (!activeCompany) {
                return res.status(400).json({
                    success: false,
                    message: 'Esta empresa não está ativa'
                })
            }

            // Verificar se o usuário é o dono da empresa ou já está em uma filial
            const userBranch = await UserBranch.findOne({
                where: { userId: ownerId },
                include: [
                    {
                        model: Branch,
                        as: 'branch',
                        where: { companyId, active: true }
                    }
                ]
            });
            if (userBranch) {
                return res.status(400).json({
                    success: false,
                    message: 'Usuário já está associado a uma filial desta empresa'
                });
            }

            const branchId = uuidv4();

            // Criar filial
            const branch = await Branch.create({
                id: branchId,
                name,
                logo,
                cnpj,
                email,
                phone,
                address,
                city,
                state,
                zipCode,
                country: country || 'Brasil',
                website,
                description,
                companyId,
                maxUsers: maxUsers || 5,
                ownerId,
                subdomain: activeCompany.subdomain
            }, { transaction });

            // Associar usuário à filial (tabela intermediária UserBranch)
            await UserBranch.create({
                userId: ownerId,
                branchId: branch.id
            }, { transaction })

            // Garantir que usuario tem a companyId da empresa:
            await User.update(
                { companyId: companyId },
                { where: { id: ownerId } }, { transaction })

            await transaction.commit()

            res.status(201).json({
                success: true,
                message: 'Filial criada com sucesso',
                data: branch
            });
        } catch (error) {
            await transaction.rollback()
            console.error('Erro ao criar filial:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async getBySubdomain(req, res) {
        try {
            const { subdomain } = req.params;

            const where = { subdomain: subdomain.toLowerCase(), active: true };
            if (req.context.branch?.id) where.id = req.context.branch.id;

            const branch = await Branch.findOne({ where });

            if (!branch) return res.status(404).json({ success: false, message: 'Filial não encontrada' });

            const company = await Company.findOne({
                where: { id: branch.companyId, active: true },
                include: [{ model: CompanySettings, as: 'settings' }, { model: CompanyCustomize, as: 'customization' }]
            });

            if (!company) return res.status(404).json({ success: false, message: 'Empresa não encontrada ou inativa' });

            const response = {
                id: branch.id,
                name: branch.name,
                logo: branch.logo || company.customization?.logoUrl,
                theme: {
                    primaryColor: company.customization?.primaryColor || '#007bff',
                    secondaryColor: company.customization?.secondaryColor || '#6c757d',
                    backgroundColor: company.customization?.backgroundColor || '#ffffff',
                    logoUrl: company.customization?.darkLogoUrl || company.customization?.logoUrl
                },
                settings: {
                    timezone: company.settings?.timezone || 'America/Sao_Paulo',
                    language: company.settings?.language || 'pt-BR',
                    currency: company.settings?.currency || 'BRL',
                    dateFormat: company.settings?.dateFormat || 'DD/MM/YYYY'
                },
                active: branch.active
            };

            res.json({ success: true, data: response });
        } catch (error) {
            console.error('Erro ao buscar filial por subdomínio:', error);
            res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
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

            const { count, rows } = await Branch.findAndCountAll({
                where,
                limit,
                offset,
                include: [
                    {
                        model: Company,
                        as: 'company',
                        include: [
                            {
                                model: CompanySettings,
                                as: 'settings'
                            },
                            {
                                model: CompanyCustomize,
                                as: 'customization'
                            }
                        ]
                    },
                    {
                        model: UserBranch,
                        as: 'userBranches',
                        include: [
                            {
                                model: User,
                                as: 'user',
                            }
                        ]
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            res.json({
                success: true,
                data: {
                    branches: rows,
                    pagination: {
                        total: count,
                        page,
                        limit,
                        totalPages: Math.ceil(count / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao buscar Filiais:', error);
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

            const where = req.context.branch?.id
                ? { id: req.context.branch.id }
                : { id, companyId: req.context.company?.id };

            const branch = await Branch.findOne({
                where,
                include: [
                    { model: Company, as: 'company', include: [{ model: CompanySettings, as: 'settings' }, { model: CompanyCustomize, as: 'customization' }] },
                    { model: UserBranch, as: 'userBranches', include: [{ model: User, as: 'user' }] }
                ]
            });

            if (!branch) return res.status(404).json({ success: false, message: 'Filial não encontrada' });

            res.json({ success: true, data: branch });
        } catch (error) {
            console.error('Erro ao buscar Filial:', error);
            res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const branch = await Branch.findByPk(id);
            if (!branch) {
                return res.status(404).json({
                    success: false,
                    message: 'Filial não encontrada'
                });
            }

            // Verificar se CNPJ já existe (se está sendo atualizado)
            if (updates.cnpj && updates.cnpj !== branch.cnpj) {
                const existingCnpj = await Branch.findOne({
                    where: { cnpj: updates.cnpj }
                });
                if (existingCnpj) {
                    return res.status(400).json({
                        success: false,
                        message: 'CNPJ já está em uso'
                    });
                }
            }

            // Verificar se ownerId está sendo atualizado
            if (updates.ownerId && updates.ownerId !== branch.ownerId) {
                // Verificar se o usuário já está associado a outra filial
                const userBranch = await UserBranch.findOne({
                    where: { userId: updates.ownerId },
                    include: [
                        {
                            model: Branch,
                            as: 'branch',
                            where: { id: { [Op.ne]: id } } 
                        }
                    ]
                });
                if (userBranch) {
                    return res.status(400).json({
                        success: false,
                        message: 'Usuário já está associado a outra filial'
                    });
                }

                const existingUserBranch = await UserBranch.findOne({ where: { branchId: id } });

                if (existingUserBranch) {
                    await existingUserBranch.destroy();
                }

                await UserBranch.create({
                    userId: updates.ownerId,
                    branchId: id
                });

            }

            await Branch.update(updates, { where: { id } });

            res.json({
                success: true,
                message: 'Filial atualizada com sucesso',
                data: Branch
            });
        } catch (error) {
            console.error('Erro ao atualizar Filial:', error);
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

            const branch = await Branch.findByPk(id);
            if (!branch) {
                return res.status(404).json({
                    success: false,
                    message: 'Filial não encontrada'
                });
            }

            // Soft delete - apenas desativar
            await branch.update({ active: false });

            res.json({
                success: true,
                message: 'Filial desativada com sucesso'
            });
        } catch (error) {
            console.error('Erro ao deletar Filial:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

     static async getBranch(req, res) {
        try {
            const branchUser = await UserBranch.findOne({
                where: { userId: req.user.id },
                include: [
                    { model: Branch, as: 'branch', include: [
                        { model: Company, as: 'company', include: [
                            { model: CompanySettings, as: 'settings' },
                            { model: CompanyCustomize, as: 'customization' }
                        ]}
                    ]}
                ]
            });

            if (!branchUser) return res.status(404).json({ success: false, message: 'Filial não encontrada' });

            // Filtra por companyId do usuário ou branch do contexto
            if (req.context.branch?.id && branchUser.branch.id !== req.context.branch.id) {
                return res.status(403).json({ success: false, message: 'Acesso não autorizado a esta filial' });
            }

            if (req.context.company?.id && branchUser.branch.companyId !== req.context.company.id) {
                return res.status(403).json({ success: false, message: 'Acesso não autorizado a esta filial' });
            }

            res.json({ success: true, data: branchUser });
        } catch (error) {
            console.error('Erro ao buscar filial do usuário:', error);
            res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
        }
    }
}

export default BranchController;