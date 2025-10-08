import {
  Customer,
  Company,
  Branch,
  User,
  sequelize,
  CustomerGroup
} from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

class CustomerController {
  // 🟢 CRIAR CLIENTE
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
        country,
        customerGroup
      } = req.body;

      const { companyId, branchId } = req.context;

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

      // Verificar se documento já é usado por empresa ou filial
      if (document && document.length > 11) {
        const existingCompanyCnpj = await Company.findOne({ where: { cnpj: document } });
        if (existingCompanyCnpj) {
          return res.status(400).json({
            success: false,
            message: 'Documento já está em uso por uma empresa'
          });
        }

        const existingBranchCnpj = await Branch.findOne({ where: { cnpj: document } });
        if (existingBranchCnpj) {
          return res.status(400).json({
            success: false,
            message: 'Documento já está em uso por uma filial'
          });
        }
      }

      // Verificar grupo
      if (customerGroup) {
        const existingGroup = await CustomerGroup.findByPk(customerGroup);
        if (!existingGroup) {
          return res.status(404).json({
            success: false,
            message: 'Grupo de cliente não encontrado'
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
        country: country || 'Brasil',
        customerGroup: customerGroup || null,
        companyId: companyId || null,
        branchId: branchId || null,
        active: true
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

  // 🟣 LISTAR CLIENTES (respeitando contexto)
  static async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const { active } = req.query;
      const { companyId, branchId } = req.context;

      const where = {
        [Op.or]: [
          { companyId: companyId || null },
          { branchId: branchId || null }
        ]
      };

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

  // 🟢 BUSCAR CLIENTE POR ID (respeita contexto)
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const { companyId, branchId } = req.context;

      const customer = await Customer.findOne({
        where: {
          id,
          [Op.or]: [
            { companyId: companyId || null },
            { branchId: branchId || null }
          ]
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado ou sem permissão'
        });
      }

      const customerGroup = customer.customerGroup
        ? await CustomerGroup.findByPk(customer.customerGroup)
        : null;

      let mainCustomerInGroup = null;
      if (customerGroup?.mainCustomer) {
        mainCustomerInGroup = await Customer.findByPk(customerGroup.mainCustomer);
      }

      return res.json({
        success: true,
        data: {
          customer,
          customerGroup,
          mainCustomerInGroup
        }
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

  // 🟡 ATUALIZAR CLIENTE
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const { companyId, branchId } = req.context;

      const customer = await Customer.findOne({
        where: {
          id,
          [Op.or]: [
            { companyId: companyId || null },
            { branchId: branchId || null }
          ]
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado ou sem permissão'
        });
      }

      // Valida documento
      if (updates.document && updates.document !== customer.document) {
        const existing = await Customer.findOne({ where: { document: updates.document } });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Documento já está em uso por outro cliente'
          });
        }

        if (updates.document.length > 11) {
          const existingCompanyCnpj = await Company.findOne({ where: { cnpj: updates.document } });
          if (existingCompanyCnpj) {
            return res.status(400).json({
              success: false,
              message: 'Documento já está em uso por uma empresa'
            });
          }

          const existingBranchCnpj = await Branch.findOne({ where: { cnpj: updates.document } });
          if (existingBranchCnpj) {
            return res.status(400).json({
              success: false,
              message: 'Documento já está em uso por uma filial'
            });
          }
        }
      }

      await customer.update(updates);

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

  // 🔴 DESATIVAR CLIENTE
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const { companyId, branchId } = req.context;

      const customer = await Customer.findOne({
        where: {
          id,
          [Op.or]: [
            { companyId: companyId || null },
            { branchId: branchId || null }
          ]
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado ou sem permissão'
        });
      }

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
