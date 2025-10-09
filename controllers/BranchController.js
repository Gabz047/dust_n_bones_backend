import { Branch, Company, CompanySettings, CompanyCustomize, User, UserBranch, sequelize } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';

class BranchController {

  static async create(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const {
      name, logo, cnpj, email, phone, address, city, state, zipCode,
      country, website, description, maxUsers, companyId, ownerId, subdomain
    } = req.body;

    if (cnpj) {
      const existingCompanyCnpj = await Company.findOne({ where: { cnpj } });
      if (existingCompanyCnpj) return res.status(400).json({ success: false, message: 'CNPJ já está em uso por uma empresa' });

      const existingBranchCnpj = await Branch.findOne({ where: { cnpj } });
      if (existingBranchCnpj) return res.status(400).json({ success: false, message: 'CNPJ já está em uso por uma filial' });
    }

    const activeCompany = await Company.findOne({ where: { id: companyId, active: true } });
    if (!activeCompany) return res.status(400).json({ success: false, message: 'Esta empresa não está ativa' });

    const userBranch = await UserBranch.findOne({
      where: { userId: ownerId },
      include: [{ model: Branch, as: 'branch', where: { companyId, active: true } }]
    });
    if (userBranch) return res.status(400).json({ success: false, message: 'Usuário já está associado a uma filial desta empresa' });

    const branchId = uuidv4();
    const branch = await Branch.create({
      id: branchId,
      name, logo, cnpj, email, phone, address, city, state, zipCode,
      country: country || 'Brasil', website, description,
      companyId, maxUsers: maxUsers || 5, ownerId,
      subdomain
    }, { transaction });

    // Cria relação UserBranch
    await UserBranch.create({ userId: ownerId, branchId: branch.id }, { transaction });

    // Atualiza companyId **e** branchId do usuário
    await User.update(
      { companyId, branchId: branch.id },
      { where: { id: ownerId }, transaction }
    );

    await transaction.commit();

    res.status(201).json({ success: true, message: 'Filial criada com sucesso', data: branch });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao criar filial:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}


 static async getBySubdomain(req, res) {
    try {
      const { subdomain, companyId } = req.params;

      // Buscar filial
      const branch = await Branch.findOne({
        where: { subdomain: subdomain.toLowerCase(), active: true },
        include: [
          {
            model: Company,
            as: 'company',
            where: companyId ? { id: companyId, active: true } : { active: true },
            required: true,
            include: [
              { model: CompanySettings, as: 'settings' },
              { model: CompanyCustomize, as: 'customization' }
            ]
          }
        ]
      });

      if (!branch) return res.status(404).json({ success: false, message: 'Filial ou empresa não encontrada' });

      const company = branch.company;

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

      res.json({ success: true, data: response });

    } catch (error) {
      console.error('Erro ao buscar filial por subdomínio:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 📦 Buscar todas as filiais (COM PAGINAÇÃO E FILTROS)
  static async getAll(req, res) {
    try {
      const { active, country, state, city, term, fields } = req.query;

      const where = {};
      if (active !== undefined) where.active = active === 'true';
      if (req.context.company?.id) where.companyId = req.context.company.id;
      if (req.context.branch?.id) where.id = req.context.branch.id;

      // 🔍 Filtros de localização
      if (country) where.country = country;
      if (state) where.state = state;
      if (city) where.city = city;

       if (term && fields) {
            const searchFields = fields.split(',')
            where[Op.or] = searchFields.map((field) => ({
              [field]: { [Op.iLike]: `%${term}%` }
            }))
          }

      const result = await buildQueryOptions(req, Branch, {
        where,
        include: [
          { 
            model: Company, 
            as: 'company', 
            include: [
              { model: CompanySettings, as: 'settings' },
              { model: CompanyCustomize, as: 'customization' }
            ] 
          },
          { 
            model: UserBranch, 
            as: 'userBranches', 
            include: [{ model: User, as: 'user' }] 
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar Filiais:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const where = { id };
      if (req.context.company?.id) where.companyId = req.context.company.id;
      if (req.context.branch?.id) where.id = req.context.branch.id;

      const branch = await Branch.findOne({
        where,
        include: [
          { model: Company, as: 'company', include: [
            { model: CompanySettings, as: 'settings' },
            { model: CompanyCustomize, as: 'customization' }
          ] },
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
      if (!branch) return res.status(404).json({ success: false, message: 'Filial não encontrada' });

      if (updates.cnpj && updates.cnpj !== branch.cnpj) {
        const existingCnpj = await Branch.findOne({ where: { cnpj: updates.cnpj } });
        if (existingCnpj) return res.status(400).json({ success: false, message: 'CNPJ já está em uso' });
      }

      if (updates.ownerId && updates.ownerId !== branch.ownerId) {
        const userBranch = await UserBranch.findOne({
          where: { userId: updates.ownerId },
          include: [{ model: Branch, as: 'branch', where: { id: { [Op.ne]: id } } }]
        });
        if (userBranch) return res.status(400).json({ success: false, message: 'Usuário já está associado a outra filial' });

        const existingUserBranch = await UserBranch.findOne({ where: { branchId: id } });
        if (existingUserBranch) await existingUserBranch.destroy();

        await UserBranch.create({ userId: updates.ownerId, branchId: id });
      }

      await Branch.update(updates, { where: { id } });

      res.json({ success: true, message: 'Filial atualizada com sucesso', data: Branch });
    } catch (error) {
      console.error('Erro ao atualizar Filial:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const branch = await Branch.findByPk(id);
      if (!branch) return res.status(404).json({ success: false, message: 'Filial não encontrada' });

      await branch.update({ active: false });

      res.json({ success: true, message: 'Filial desativada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar Filial:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getBranch(req, res) {
    try {
      const whereUserBranch = { userId: req.user.id };
      const includeBranch = {
        model: Branch,
        as: 'branch',
        include: [
          { model: Company, as: 'company', include: [
            { model: CompanySettings, as: 'settings' },
            { model: CompanyCustomize, as: 'customization' }
          ] }
        ]
      };

      if (req.context.company?.id) includeBranch.where = { companyId: req.context.company.id };
      if (req.context.branch?.id) includeBranch.where = { ...includeBranch.where, id: req.context.branch.id };

      const branchUser = await UserBranch.findOne({
        where: whereUserBranch,
        include: [includeBranch]
      });

      if (!branchUser) return res.status(404).json({ success: false, message: 'Filial não encontrada' });

      res.json({ success: true, data: branchUser });
    } catch (error) {
      console.error('Erro ao buscar filial do usuário:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }
}

export default BranchController;