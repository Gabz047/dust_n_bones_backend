import { CompanySettings, Company } from '../models/index.js';

class CompanySettingsController {
    static async getByCompany(req, res) {
        try {
            const { companyId } = req.params;

            const settings = await CompanySettings.findOne({
                where: { companyId },
                include: [
                    {
                        model: Company,
                        as: 'company',
                        attributes: ['id', 'name', 'subdomain']
                    }
                ]
            });

            if (!settings) {
                return res.status(404).json({
                    success: false,
                    message: 'Configurações não encontradas'
                });
            }

            res.json({
                success: true,
                data: settings
            });
        } catch (error) {
            console.error('Erro ao buscar configurações:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async update(req, res) {
        try {
            const { companyId } = req.params;
            const updates = req.body;

            // Verificar se a empresa existe
            const company = await Company.findByPk(companyId);
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Empresa não encontrada'
                });
            }

            // Buscar ou criar configurações
            let settings = await CompanySettings.findOne({ where: { companyId } });

            if (!settings) {
                settings = await CompanySettings.create({
                    companyId,
                    ...updates
                });
            } else {
                await settings.update(updates);
            }

            res.json({
                success: true,
                message: 'Configurações atualizadas com sucesso',
                data: settings
            });
        } catch (error) {
            console.error('Erro ao atualizar configurações:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async reset(req, res) {
        try {
            const { companyId } = req.params;

            const settings = await CompanySettings.findOne({ where: { companyId } });
            if (!settings) {
                return res.status(404).json({
                    success: false,
                    message: 'Configurações não encontradas'
                });
            }

            // Resetar para valores padrão
            await settings.update({
                timezone: 'America/Sao_Paulo',
                language: 'pt-BR',
                currency: 'BRL',
                dateFormat: 'DD/MM/YYYY',
                timeFormat: '24h',
                numberFormat: '1.234,56',
                firstDayOfWeek: 1,
                fiscalYearStart: '01-01',
                taxRate: 0.00,
                enableNotifications: true,
                enableEmailReports: true,
                backupFrequency: 'daily',
                maxFileSize: 10485760,
                allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'xlsx', 'csv']
            });

            res.json({
                success: true,
                message: 'Configurações resetadas para o padrão',
                data: settings
            });
        } catch (error) {
            console.error('Erro ao resetar configurações:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async getCompanySettings(req, res) {
        try {
            // Buscar empresa do usuário
            const company = await Company.findOne({ where: { ownerId: req.user.id } });
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Empresa não encontrada'
                });
            }

            const settings = await CompanySettings.findOne({
                where: { companyId: company.id }
            });

            if (!settings) {
                return res.status(404).json({
                    success: false,
                    message: 'Configurações não encontradas'
                });
            }

            res.json({
                success: true,
                data: settings
            });
        } catch (error) {
            console.error('Erro ao buscar configurações da empresa:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async updateCompanySettings(req, res) {
        try {
            const updates = req.body;

            // Buscar empresa do usuário
            const company = await Company.findOne({ where: { ownerId: req.user.id } });
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Empresa não encontrada'
                });
            }

            // Buscar ou criar configurações
            let settings = await CompanySettings.findOne({ where: { companyId: company.id } });

            if (!settings) {
                settings = await CompanySettings.create({
                    companyId: company.id,
                    ...updates
                });
            } else {
                await settings.update(updates);
            }

            res.json({
                success: true,
                message: 'Configurações atualizadas com sucesso',
                data: settings
            });
        } catch (error) {
            console.error('Erro ao atualizar configurações:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }
}

export default CompanySettingsController;