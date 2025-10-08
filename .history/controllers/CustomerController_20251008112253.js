import { Customer, Company, Branch, User, sequelize, CustomerGroup } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

class CustomerController {
  // Criar cliente
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      
      const context = req.context; // vem do middleware resolveEntityContext
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
          return res.status(400).json({
            success: false,
            message: 'Documento já está em uso por outro cliente',
          });
        }
      }

      // Impedir CNPJ duplicado com empresa/filial
      if (document?.length > 11) {
        const existingCompanyCnpj = await Company.findOne({ where: { cnpj: document } });
        if (existingCompanyCnpj)
          return res.status(400).json({ success: false, message: 'Documento já usado por empresa.' });

        const existingBranchCnpj = await Branch.findOne({ where: { cnpj: document } });
        if (existingBranchCnpj)
          return res.status(400).json({ success: false, message: 'Documento já usado por filial.' });
      }

      // Verifica grupo de cliente
      if (customerGroup) {
        const existingGroup = await CustomerGroup.findByPk(customerGroup);
        if (!existingGroup)
          return res.status(404).json({ success: false, message: 'Grupo de cliente não encontrado.' });
      }

      // Cria cliente com contexto do usuário
      const customer = await Customer.create(
        {
          id: uuidv4(),
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

  // Buscar todos (respeitando empresa/filial)
  static async getAll(req, res) {
    try {
      const { companyId, branchId } = req.context;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const { active } = req.query;

      const where = {};
      if (active !== undefined) where.active = active === 'true';

      // Filtro exclusivo (empresa OU filial)
      if (branchId) {
        where.branchId = branchId;
      } else if (companyId) {
        where.companyId = companyId;
      } else {
        return res.status(403).json({
          success: false,
          message: 'Usuário sem contexto de empresa ou filial válido.',
        });
      }

      const { count, rows } = await Customer.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      });

      return res.json({
        success: true,
        data: {
          customers: rows,
          pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
          },
        },
      });
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }

  // Buscar por ID (também respeita o contexto)
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

  // Update (mantido)
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const customer = await Customer.findByPk(id);
      if (!customer)
        return res.status(404).json({ success: false, message: 'Cliente não encontrado' });

      if (updates.document && updates.document !== customer.document) {
        const existing = await Customer.findOne({ where: { document: updates.document } });
        if (existing)
          return res.status(400).json({ success: false, message: 'Documento já usado por outro cliente' });
      }

      await Customer.update(updates, { where: { id } });

      return res.json({ success: true, message: 'Cliente atualizado com sucesso' });
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Delete (mantido)
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const customer = await Customer.findByPk(id);

      if (!customer)
        return res.status(404).json({ success: false, message: 'Cliente não encontrado' });

      await customer.update({ active: false });

      return res.json({ success: true, message: 'Cliente desativado com sucesso' });
    } catch (error) {
      console.error('Erro ao desativar cliente:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }
}

export default CustomerController;
