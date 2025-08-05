import { Company, CompanySettings, CompanyCustomize, Account } from '../models/index.js';

class TenantController {
  // Buscar dados do tenant por subdomínio (rota pública)
  static async getBySubdomain(req, res) {
    try {
      console.log('Buscando empresa por subdomínio:');
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
          message: 'Tenant não encontrado'
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
      console.log('Estrutura tenant:', {
        success: true,
        data: response
      });
      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Erro ao buscar tenant por subdomínio:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Obter informações do tenant atual
  static async getCurrentTenant(req, res) {
    try {
      if (!req.tenant) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum tenant especificado'
        });
      }

      const tenant = await Company.findByPk(req.tenant.id, {
        include: [
          {
            model: CompanySettings,
            as: 'settings'
          },
          {
            model: CompanyCustomize,
            as: 'customization'
          },
          {
            model: Account,
            as: 'owner',
            attributes: ['id', 'email', 'username']
          }
        ]
      });

      res.json({
        success: true,
        data: tenant
      });
    } catch (error) {
      console.error('Erro ao buscar tenant atual:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Estatísticas do tenant
  static async getTenantStats(req, res) {
    try {
      if (!req.tenant) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum tenant especificado'
        });
      }

      // Contar usuários do tenant
      const userCount = await Account.count({
        where: { companyId: req.tenant.id }
      });

      const stats = {
        tenantId: req.tenant.id,
        tenantName: req.tenant.name,
        userCount,
        maxUsers: req.tenant.maxUsers,
        subscriptionPlan: req.tenant.subscriptionPlan,
        active: req.tenant.active,
        createdAt: req.tenant.createdAt
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas do tenant:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Validar acesso ao tenant
  static async validateTenantAccess(req, res) {
    try {
      const { tenantId } = req.params;

      // Verificar se o tenant existe
      const tenant = await Company.findOne({
        where: {
          id: tenantId,
          active: true
        }
      });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant não encontrado'
        });
      }

      // Verificar se o usuário tem acesso
      if (req.user.accountType !== 'admin' && req.user.companyId !== tenantId) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado ao tenant'
        });
      }

      res.json({
        success: true,
        message: 'Acesso autorizado',
        data: {
          tenantId: tenant.id,
          tenantName: tenant.name,
          userRole: req.user.role,
          hasAccess: true
        }
      });
    } catch (error) {
      console.error('Erro ao validar acesso ao tenant:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}

export default TenantController;
