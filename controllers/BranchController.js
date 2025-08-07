import { Branch, Company, CompanySettings, CompanyCustomize, User, UserBranch, sequelize, CompanyCustomize } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

class BranchController {
    static async create(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const {
                name,
                subdomain,
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
                company_id,
            } = req.body;

            const subdomainINLower = subdomain.toLowerCase()

            // Verificar se subdomain já existe para uma empresa
            const existingCompany = await Company.findOne({ where: { subdomain: subdomainINLower } });
            if (existingCompany) {
                return res.status(400).json({
                    success: false,
                    message: 'Subdomínio já está em uso por uma empresa'
                });
            }

            // Verificar se subdomain já existe para uma filial
            const existingBranch = await Branch.findOne({ where: { subdomain: subdomainINLower } });
            if (existingBranch) {
                return res.status(400).json({
                    success: false,
                    message: 'Subdomínio já está em uso por uma filial'
                });
            }

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
            const activeCompany = await Company.findOne({ where: { id: company_id, active: true } })
            if (!activeCompany) {
                return res.status(400).json({
                    success: false,
                    message: 'Esta empresa não está ativa'
                })
            }

            const branchId = uuidv4();

            // Criar filial
            const branch = await Branch.create({
                id: branchId,
                name,
                subdomain: subdomain.toLowerCase(),
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
                company_id,
                maxUsers: maxUsers || 5,
                ownerId: req.user.id
            }, { transaction });

            // Associar usuário à filial (tabela intermediária UserBranch)
            await UserBranch.create({
                userId: req.user.id,
                branchId: branch.id
            }, { transaction })

            // Garantir que usuario tem a companyId da empresa:
            await User.update(
                { company_id: company_id },
                { where: { id: req.user.id } }, { transaction })

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
            const { subdomain, companyId } = req.params;

            // Buscas 
            const branch = await Branch.findOne({
                where: {
                    subdomain: subdomain.toLowerCase(),
                    active: true
                },
            });

            const company = await Company.findOne({
                where: {
                    id: companyId,
                    active: true
                },
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
            });

            // Validações

            if (!branch) {
                return res.status(404).json({
                    success: false,
                    message: 'Filial não encontrada'
                });
            }

            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Empresa não encontrada ou inativa'
                });
            }

            if (branch.companyId !== company.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Esta filial não pertence à empresa informada'
                })
            }

            // Estruturar resposta conforme solicitado
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
                active: company.active
            };

            res.json({
                success: true,
                data: response
            });
        } catch (error) {
            console.error('Erro ao buscar filial por subdomínio:', error);
            res.status(500).json({
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

            const branch = await Branch.findByPk(id, {
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
            });

            if (!branch) {
                return res.status(404).json({
                    success: false,
                    message: 'Filial não encontrada'
                });
            }

            res.json({
                success: true,
                data: branch
            });
        } catch (error) {
            console.error('Erro ao buscar Filial:', error);
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

            const branch = await Branch.findByPk(id);
            if (!branch) {
                return res.status(404).json({
                    success: false,
                    message: 'Filial não encontrada'
                });
            }

            // Verificar se subdomain já existe (se está sendo atualizado)
            if (updates.subdomain && updates.subdomain !== branch.subdomain) {
                const existingBranch = await Branch.findOne({
                    where: { subdomain: updates.subdomain.toLowerCase() }
                });
                if (existingBranch) {
                    return res.status(400).json({
                        success: false,
                        message: 'Subdomínio já está em uso'
                    });
                }
                updates.subdomain = updates.subdomain.toLowerCase();
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
                    {
                        model: Branch,
                        as: 'branch',
                        include: [
                            {
                                model: Company,
                                as: 'company',
                                include: [
                                    { model: CompanySettings, as: 'settings' },
                                    { model: CompanyCustomize, as: 'customization' }
                                ]
                            }
                        ]
                    }
                ]
            });

            if (!branchUser) {
                return res.status(404).json({
                    success: false,
                    message: 'Filial não encontrada'
                });
            }

            res.json({
                success: true,
                data: branchUser
            });
        } catch (error) {
            console.error('Erro ao buscar filial do usuário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }
}

export default BranchController;