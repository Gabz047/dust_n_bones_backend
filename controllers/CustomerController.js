import { Customer, Company, Branch, sequelize, CustomerGroup } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';
import { generateReferralId } from '../utils/globals/generateReferralId.js';
class CustomerController {
  // 🔒 Filtro de acesso por empresa/filial
  static customerAccessFilter(req) {
    const { companyId } = req.context || {};
    
  if (companyId) {
      return { companyId };
  }
    return {};
  }

  // 🧾 Criar cliente
   static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const context = req.context;
      const {
        name,
        document,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        country,
        customerGroup,
      } = req.body;

      // Verificar se documento já existe (cliente)
      if (document) {
        const existingCustomer = await Customer.findOne({ where: { document } });
        if (existingCustomer) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Documento já está em uso por outro cliente',
          });
        }
      }

      // Impedir CNPJ duplicado com empresa/filial
      if (document?.length > 11) {
        const existingCompanyCnpj = await Company.findOne({ where: { cnpj: document } });
        if (existingCompanyCnpj) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'Documento já usado por empresa.' });
        }

        const existingBranchCnpj = await Branch.findOne({ where: { cnpj: document } });
        if (existingBranchCnpj) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'Documento já usado por filial.' });
        }
      }

      // Verifica grupo de cliente
      if (customerGroup) {
        const existingGroup = await CustomerGroup.findByPk(customerGroup);
        if (!existingGroup) {
          await transaction.rollback();
          return res.status(404).json({ success: false, message: 'Grupo de cliente não encontrado.' });
        }
      }

     
     const company = await Company.findOne({ where: { id: context.companyId } });

      const referralId = await generateReferralId({
        model: Customer,
        transaction,
        companyId: company.id,
      });
      // Cria cliente com contexto do usuário
      const customer = await Customer.create(
        {
        
          referralId,
          name,
          document: document || null,
          email,
          phone,
          address,
          city,
          state,
          zipCode,
          customerGroup: customerGroup || null,
          country: country || 'Brasil',
          companyId: context.companyId || null,
          branchId: context.branchId || null,
        },
        { transaction }
      );

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: 'Cliente criado com sucesso',
        data: customer,
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar cliente:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }
  // 📦 Buscar todos os clientes (COM PAGINAÇÃO)
  static async getAll(req, res) {
    try {
      const { active, state, country, city, email, term, fields } = req.query;
      const where = { ...CustomerController.customerAccessFilter(req) };

      // Filtros opcionais
      if (active !== undefined) where.active = active === 'true';
      if (state) where.state = { [Op.iLike]: `%${state}%` };
      if (country) where.country = { [Op.iLike]: `%${country}%` };
      if (city) where.city = { [Op.iLike]: `%${city}%` };
      if (email) where.email = { [Op.iLike]: `%${email}%` };

       if (term && fields) {
            const searchFields = fields.split(',')
            where[Op.or] = searchFields.map((field) => ({
              [field]: { [Op.iLike]: `%${term}%` }
            }))
          }

      const result = await buildQueryOptions(req, Customer, {
        where,
        include: [
          {
            model: CustomerGroup,
            as: 'customerGroups',
            attributes: ['id', 'mainCustomer'],
            required: false,
            include: [
              {
                model: Customer,
                as: 'mainCustomerInGroup',
                attributes: ['name']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }

  // 🔍 Buscar por ID
 static async getById(req, res) {
    try {
      const { companyId, branchId } = req.context;
      const { id } = req.params;

      const where = { id };
      if (branchId) where.branchId = branchId;
      else if (companyId) where.companyId = companyId;

      const customer = await Customer.findOne({ where });
      if (!customer)
        return res.status(404).json({ success: false, message: 'Cliente não encontrado ou sem permissão.' });

      const customerGroup = await CustomerGroup.findByPk(customer.customerGroup);
      let mainCustomerInGroup = null;
      if (customerGroup) mainCustomerInGroup = await Customer.findByPk(customerGroup.mainCustomer);

      return res.json({
        success: true,
        data: { customer, customerGroup, mainCustomerInGroup },
      });
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }

  // 🔍 Buscar com filtro de busca textual avançada
  static async search(req, res) {
    try {
      const { term, fields } = req.query;
      const where = { ...CustomerController.customerAccessFilter(req) };

      // 🔍 Filtro de pesquisa textual
      if (term && fields) {
        const searchFields = fields.split(',');
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${term}%` }
        }));
      }

      const result = await buildQueryOptions(req, Customer, {
        where,
        include: [
          {
            model: CustomerGroup,
            as: 'customerGroups',
            attributes: ['id', 'mainCustomer'],
            required: false,
            include: [
              {
                model: Customer,
                as: 'mainCustomerInGroup',
                attributes: ['name']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // ✏️ Atualizar cliente
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const where = { id, ...CustomerController.customerAccessFilter(req) };

      const customer = await Customer.findOne({ where });
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado ou sem permissão'
        });
      }

      if (updates.document && updates.document !== customer.document) {
        const existing = await Customer.findOne({ where: { document: updates.document } });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Documento já usado por outro cliente'
          });
        }
      }

      await customer.update(updates);

      return res.json({
        success: true,
        message: 'Cliente atualizado com sucesso',
        data: customer
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

  // 🗑️ Desativar cliente
  static async delete(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado.',
      });
    }

    // Verifica se o cliente faz parte de algum grupo
    const isInGroup = await CustomerGroup.findOne({
      where: { mainCustomer: id },
      transaction,
    });

    if (isInGroup) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir este cliente porque ele é o cliente principal de um grupo.',
      });
    }

    // Verifica se o cliente participa de algum projeto
    const { Project } = await import('../models/index.js');
    const hasProjects = await Project.findOne({
      where: { customerId: id },
      transaction,
    });

    if (hasProjects) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir este cliente porque ele está vinculado a um ou mais projetos.',
      });
    }

    // Nenhum vínculo — pode apagar
    await customer.destroy({ transaction });
    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Cliente excluído com sucesso.',
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao excluir cliente:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor.',
      error: error.message,
    });
  }
}
}

export default CustomerController;