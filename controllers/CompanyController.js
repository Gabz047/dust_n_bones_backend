import { Company, CompanySettings, CompanyCustomize, Account } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

class CompanyController {
    static async create(req, res) {
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
                subscriptionPlan,
                maxUsers
            } = req.body;

            // Verificar se subdomain já existe
            const existingCompany = await Company.findOne({ where: { subdomain } });
            if (existingCompany) {
                return res.status(400).json({
                    success: false,
                    message: 'Subdomínio já está em uso'
                });
            }

            // Verificar se CNPJ já existe (se fornecido)
            if (cnpj) {
                const existingCnpj = await Company.findOne({ where: { cnpj } });
                if (existingCnpj) {
                    return res.status(400).json({
                        success: false,
                        message: 'CNPJ já está em uso'
                    });
                }
            }

            const companyId = uuidv4();

            // Criar empresa
            const company = await Company.create({
                id: companyId,
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
                subscriptionPlan: subscriptionPlan || 'basic',
                maxUsers: maxUsers || 5,
                ownerId: req.user.id
            });

            // Criar configurações padrão
            await CompanySettings.create({
                id: uuidv4(),
                companyId: company.id
            });

            // Criar customização padrão
            await CompanyCustomize.create({
                id: uuidv4(),
                companyId: company.id
            });

            // Atualizar usuário para vincular à empresa
            await Account.update(
                { companyId: company.id },
                { where: { id: req.user.id } }
            );

            res.status(201).json({
                success: true,
                message: 'Empresa criada com sucesso',
                data: company
            });
        } catch (error) {
            console.error('Erro ao criar empresa:', error);
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

            const company = await Company.findOne({
                where: {
                    subdomain: subdomain.toLowerCase(),
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

            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Empresa não encontrada'
                });
            }

            // Estruturar resposta conforme solicitado
            const response = {
                id: company.id,
                name: company.name,
                logo: company.logo || company.customization?.logoUrl,
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
            console.error('Erro ao buscar empresa por subdomínio:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }
    
    static async getAll(req, res) {
        try {
            const { page = 1, limit = 10, active } = req.query;
            const offset = (page - 1) * limit;

            const where = {};
            if (active !== undefined) where.active = active === 'true';

            const { count, rows } = await Company.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [
                    {
                        model: Account,
                        as: 'owner',
                        attributes: ['id', 'email', 'username']
                    },
                    {
                        model: CompanySettings,
                        as: 'settings'
                    },
                    {
                        model: CompanyCustomize,
                        as: 'customization'
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            res.json({
                success: true,
                data: {
                    companies: rows,
                    pagination: {
                        total: count,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(count / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao buscar empresas:', error);
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

            const company = await Company.findByPk(id, {
                include: [
                    {
                        model: Account,
                        as: 'owner',
                        attributes: ['id', 'email', 'username']
                    },
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

            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Empresa não encontrada'
                });
            }

            res.json({
                success: true,
                data: company
            });
        } catch (error) {
            console.error('Erro ao buscar empresa:', error);
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

            const company = await Company.findByPk(id);
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Empresa não encontrada'
                });
            }

            // Verificar se subdomain já existe (se está sendo atualizado)
            if (updates.subdomain && updates.subdomain !== company.subdomain) {
                const existingCompany = await Company.findOne({
                    where: { subdomain: updates.subdomain.toLowerCase() }
                });
                if (existingCompany) {
                    return res.status(400).json({
                        success: false,
                        message: 'Subdomínio já está em uso'
                    });
                }
                updates.subdomain = updates.subdomain.toLowerCase();
            }

            // Verificar se CNPJ já existe (se está sendo atualizado)
            if (updates.cnpj && updates.cnpj !== company.cnpj) {
                const existingCnpj = await Company.findOne({
                    where: { cnpj: updates.cnpj }
                });
                if (existingCnpj) {
                    return res.status(400).json({
                        success: false,
                        message: 'CNPJ já está em uso'
                    });
                }
            }

            await company.update(updates);

            res.json({
                success: true,
                message: 'Empresa atualizada com sucesso',
                data: company
            });
        } catch (error) {
            console.error('Erro ao atualizar empresa:', error);
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

            const company = await Company.findByPk(id);
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Empresa não encontrada'
                });
            }

            // Soft delete - apenas desativar
            await company.update({ active: false });

            res.json({
                success: true,
                message: 'Empresa desativada com sucesso'
            });
        } catch (error) {
            console.error('Erro ao deletar empresa:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }
    
    static async getCompany(req, res) {
        try {
            const company = await Company.findOne({
                where: { ownerId: req.user.id },
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

            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Empresa não encontrada'
                });
            }

            res.json({
                success: true,
                data: company
            });
        } catch (error) {
            console.error('Erro ao buscar empresa do usuário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }
}

export default CompanyController;