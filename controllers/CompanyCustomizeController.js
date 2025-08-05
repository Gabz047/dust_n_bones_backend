import { CompanyCustomize, Company } from '../models/index.js';

class CompanyCustomizeController {
    static async getByCompany(req, res) {
        try {
            const { companyId } = req.params;

            const customization = await CompanyCustomize.findOne({
                where: { companyId },
                include: [
                    {
                        model: Company,
                        as: 'company',
                        attributes: ['id', 'name', 'subdomain']
                    }
                ]
            });

            if (!customization) {
                return res.status(404).json({
                    success: false,
                    message: 'Customização não encontrada'
                });
            }

            res.json({
                success: true,
                data: customization
            });
        } catch (error) {
            console.error('Erro ao buscar customização:', error);
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

            // Buscar ou criar customização
            let customization = await CompanyCustomize.findOne({ where: { companyId } });

            if (!customization) {
                customization = await CompanyCustomize.create({
                    companyId,
                    ...updates
                });
            } else {
                await customization.update(updates);
            }

            res.json({
                success: true,
                message: 'Customização atualizada com sucesso',
                data: customization
            });
        } catch (error) {
            console.error('Erro ao atualizar customização:', error);
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

            const customization = await CompanyCustomize.findOne({ where: { companyId } });
            if (!customization) {
                return res.status(404).json({
                    success: false,
                    message: 'Customização não encontrada'
                });
            }

            // Resetar para valores padrão
            await customization.update({
                primaryColor: '#007bff',
                secondaryColor: '#6c757d',
                backgroundColor: '#ffffff',
                textColor: '#212529',
                accentColor: '#28a745',
                warningColor: '#ffc107',
                errorColor: '#dc3545',
                successColor: '#28a745',
                logoUrl: null,
                darkLogoUrl: null,
                faviconUrl: null,
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                borderRadius: '6px',
                sidebarStyle: 'light',
                headerStyle: 'light',
                theme: 'light',
                customCss: null,
                customJs: null,
                showCompanyLogo: true,
                showCompanyName: true,
                compactMode: false
            });

            res.json({
                success: true,
                message: 'Customização resetada para o padrão',
                data: customization
            });
        } catch (error) {
            console.error('Erro ao resetar customização:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async getCompanyCustomization(req, res) {
        try {
            // Buscar empresa do usuário
            const company = await Company.findOne({ where: { ownerId: req.user.id } });
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Empresa não encontrada'
                });
            }

            const customization = await CompanyCustomize.findOne({
                where: { companyId: company.id }
            });

            if (!customization) {
                return res.status(404).json({
                    success: false,
                    message: 'Customização não encontrada'
                });
            }

            res.json({
                success: true,
                data: customization
            });
        } catch (error) {
            console.error('Erro ao buscar customização da empresa:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async updateCompanyCustomization(req, res) {
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

            // Buscar ou criar customização
            let customization = await CompanyCustomize.findOne({ where: { companyId: company.id } });

            if (!customization) {
                customization = await CompanyCustomize.create({
                    companyId: company.id,
                    ...updates
                });
            } else {
                await customization.update(updates);
            }

            res.json({
                success: true,
                message: 'Customização atualizada com sucesso',
                data: customization
            });
        } catch (error) {
            console.error('Erro ao atualizar customização:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async getPublicTheme(req, res) {
        try {
            const { subdomain } = req.params;

            const company = await Company.findOne({
                where: {
                    subdomain: subdomain.toLowerCase(),
                    active: true
                },
                include: [
                    {
                        model: CompanyCustomize,
                        as: 'customization'
                    }
                ]
            });

            if (!company || !company.customization) {
                return res.status(404).json({
                    success: false,
                    message: 'Tema não encontrado'
                });
            }

            // Retornar apenas dados públicos do tema
            const theme = {
                primaryColor: company.customization.primaryColor,
                secondaryColor: company.customization.secondaryColor,
                backgroundColor: company.customization.backgroundColor,
                textColor: company.customization.textColor,
                logoUrl: company.customization.logoUrl,
                darkLogoUrl: company.customization.darkLogoUrl,
                faviconUrl: company.customization.faviconUrl,
                fontFamily: company.customization.fontFamily,
                fontSize: company.customization.fontSize,
                borderRadius: company.customization.borderRadius,
                theme: company.customization.theme,
                showCompanyLogo: company.customization.showCompanyLogo,
                showCompanyName: company.customization.showCompanyName,
                compactMode: company.customization.compactMode
            };

            res.json({
                success: true,
                data: theme
            });
        } catch (error) {
            console.error('Erro ao buscar tema público:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }
}

export default CompanyCustomizeController;