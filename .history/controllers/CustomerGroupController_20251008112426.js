import Customer from '../models/Customer.js';
import CustomerGroup from '../models/CustomerGroup.js';
import { Op } from 'sequelize';

export default {
  // Criar grupo de clientes
  async create(req, res) {
    try {
      const { mainCustomer } = req.body;
      const { companyId, branchId } = req.context;

      // Verifica se o cliente existe
      const customer = await Customer.findByPk(mainCustomer);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado.',
        });
      }

      // Garante que o cliente pertence à mesma empresa/filial
      if (
        (branchId && customer.branchId !== branchId) ||
        (!branchId && companyId && customer.companyId !== companyId)
      ) {
        return res.status(403).json({
          success: false,
          message: 'Cliente não pertence à mesma empresa ou filial.',
        });
      }

      // Verifica se o cliente já é principal ou pertence a outro grupo
      const isMainCustomerInAnotherGroup = await CustomerGroup.findOne({
        where: { mainCustomer },
      });

      const isCustomerInAnotherGroup = await Customer.findOne({
        where: { id: mainCustomer, customerGroup: { [Op.ne]: null } },
      });

      if (isMainCustomerInAnotherGroup || isCustomerInAnotherGroup) {
        return res.status(400).json({
          success: false,
          message: 'Este cliente já pertence a um grupo (como principal ou comum).',
        });
      }

      // Cria o grupo com o contexto da empresa/filial
      const group = await CustomerGroup.create({
        mainCustomer,
        companyId: companyId || null,
        branchId: branchId || null,
      });

      // Atualiza o cliente principal com o ID do grupo
      await Customer.update({ customerGroup: group.id }, { where: { id: mainCustomer } });

      return res.status(201).json({
        success: true,
        message: 'Grupo criado com sucesso.',
        data: group,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erro ao criar grupo.' });
    }
  },

  // Buscar todos os grupos com clientes (respeita empresa/filial)
  async getAll(req, res) {
    try {
      const { companyId, branchId } = req.context;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const { active } = req.query;

      const where = {};
      if (active !== undefined) where.active = active === 'true';
      if (branchId) where.branchId = branchId;
      else if (companyId) where.companyId = companyId;
      else
        return res.status(403).json({
          success: false,
          message: 'Usuário sem contexto de empresa ou filial válido.',
        });

      const { count, rows } = await CustomerGroup.findAndCountAll({
        where,
        limit,
        offset,
        include: [
          { model: Customer, as: 'mainCustomerInGroup' },
          { model: Customer, as: 'customersInGroup' },
        ],
        order: [['createdAt', 'DESC']],
      });

      return res.json({
        success: true,
        data: {
          customerGroups: rows,
          pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
          },
        },
      });
    } catch (err) {
      console.error('Erro ao buscar grupos de clientes:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: err.message,
      });
    }
  },

  // Buscar grupo por ID (respeita empresa/filial)
  async getById(req, res) {
    try {
      const { id } = req.params;
      const { companyId, branchId } = req.context;

      const where = { id };
      if (branchId) where.branchId = branchId;
      else if (companyId) where.companyId = companyId;

      const group = await CustomerGroup.findOne({
        where,
        include: [
          {
            model: Customer,
            as: 'mainCustomerInGroup',
            attributes: ['id', 'name', 'document', 'email', 'phone'],
          },
          {
            model: Customer,
            as: 'customersInGroup',
            attributes: ['id', 'name', 'document', 'email', 'phone'],
          },
        ],
      });

      if (!group)
        return res.status(404).json({
          success: false,
          message: 'Grupo não encontrado ou sem permissão de acesso.',
        });

      return res.json({ success: true, data: group });
    } catch (err) {
      console.error('Erro ao buscar grupo por ID:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: err.message,
      });
    }
  },

  // Buscar grupo do cliente principal (respeita empresa/filial)
  async getByMainCustomerGroup(req, res) {
    try {
      const { id } = req.params;
      const { companyId, branchId } = req.context;

      const customer = await Customer.findByPk(id);
      if (!customer)
        return res.status(404).json({ success: false, message: 'Cliente não encontrado.' });

      // Verifica se cliente pertence à mesma empresa/filial
      if (
        (branchId && customer.branchId !== branchId) ||
        (!branchId && companyId && customer.companyId !== companyId)
      ) {
        return res.status(403).json({
          success: false,
          message: 'Cliente não pertence à mesma empresa ou filial.',
        });
      }

      const group = await CustomerGroup.findOne({
        where: {
          id: customer.customerGroup,
          ...(branchId ? { branchId } : { companyId }),
        },
        include: [
          { model: Customer, as: 'mainCustomerInGroup', attributes: ['id', 'name', 'document', 'email'] },
        ],
      });

      if (!group)
        return res.status(404).json({
          success: false,
          message: 'Cliente não pertence a nenhum grupo.',
        });

      const isMainCustomer = group.mainCustomerInGroup?.id === customer.id;
      if (!isMainCustomer)
        return res.status(404).json({
          success: false,
          message: 'Cliente não é o cliente principal do grupo.',
        });

      const customersInGroup = await Customer.findAll({
        where: { customerGroup: group.id },
        attributes: ['id', 'name', 'document', 'email'],
      });

      return res.json({ success: true, data: { customer, group, customersInGroup } });
    } catch (error) {
      console.error('Erro ao buscar cliente principal do grupo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  },

  // Atualizar os clientes comuns do grupo (respeita empresa/filial)
  async updateGroupCustomers(req, res) {
    try {
      const { id } = req.params;
      const { companyId, branchId } = req.context;
      const { customerIds = [] } = req.body;

      const whereGroup = { id };
      if (branchId) whereGroup.branchId = branchId;
      else if (companyId) whereGroup.companyId = companyId;

      const group = await CustomerGroup.findOne({ where: whereGroup });
      if (!group)
        return res.status(404).json({
          success: false,
          message: 'Grupo não encontrado ou sem permissão.',
        });

      for (const customerId of customerIds) {
        const customer = await Customer.findByPk(customerId);
        if (!customer) continue;

        if (
          (branchId && customer.branchId !== branchId) ||
          (!branchId && companyId && customer.companyId !== companyId)
        ) {
          return res.status(403).json({
            success: false,
            message: `Cliente ${customer.name} não pertence à mesma empresa/filial.`,
          });
        }

        const isAlreadyMain = await CustomerGroup.findOne({ where: { mainCustomer: customerId } });
        const isInOtherGroup = customer.customerGroup && customer.customerGroup !== id;

        if (isAlreadyMain || isInOtherGroup) {
          return res.status(400).json({
            success: false,
            message: `Cliente ${customer.name} já pertence a outro grupo.`,
          });
        }
      }

      await Customer.update(
        { customerGroup: null },
        {
          where: {
            customerGroup: id,
            id: { [Op.ne]: group.mainCustomer },
          },
        }
      );

      await Customer.update({ customerGroup: id }, { where: { id: customerIds } });

      return res.json({ success: true, message: 'Clientes do grupo atualizados com sucesso.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar clientes do grupo.',
      });
    }
  },

  // Atualizar cliente principal do grupo (respeita empresa/filial)
  async updateGroupMainCustomer(req, res) {
    try {
      const { id } = req.params;
      const { companyId, branchId } = req.context;
      const { mainCustomerId } = req.body;

      const whereGroup = { id };
      if (branchId) whereGroup.branchId = branchId;
      else if (companyId) whereGroup.companyId = companyId;

      const group = await CustomerGroup.findOne({ where: whereGroup });
      if (!group)
        return res.status(404).json({
          success: false,
          message: 'Grupo não encontrado ou sem permissão.',
        });

      const newMainCustomer = await Customer.findByPk(mainCustomerId);
      if (!newMainCustomer)
        return res.status(404).json({ success: false, message: 'Novo cliente principal não encontrado.' });

      if (
        (branchId && newMainCustomer.branchId !== branchId) ||
        (!branchId && companyId && newMainCustomer.companyId !== companyId)
      ) {
        return res.status(403).json({
          success: false,
          message: 'Cliente não pertence à mesma empresa ou filial.',
        });
      }

      const isMainElsewhere = await CustomerGroup.findOne({
        where: { mainCustomer: mainCustomerId, id: { [Op.ne]: id } },
      });

      const isInOtherGroup = newMainCustomer.customerGroup && newMainCustomer.customerGroup !== id;

      if (isMainElsewhere || isInOtherGroup) {
        return res.status(400).json({
          success: false,
          message: 'Cliente já pertence a outro grupo.',
        });
      }

      const oldMainCustomer = await Customer.findByPk(group.mainCustomer);
      if (oldMainCustomer && oldMainCustomer.customerGroup === id) {
        await oldMainCustomer.update({ customerGroup: null });
      }

      await Customer.update({ customerGroup: id }, { where: { id: mainCustomerId } });

      group.mainCustomer = mainCustomerId;
      await group.save();

      return res.json({
        success: true,
        message: 'Cliente principal atualizado com sucesso.',
        data: group,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar cliente principal do grupo.',
      });
    }
  },

  // Deletar grupo (respeita empresa/filial)
  async delete(req, res) {
    try {
      const { id } = req.params;
      const { companyId, branchId } = req.context;

      const whereGroup = { id };
      if (branchId) whereGroup.branchId = branchId;
      else if (companyId) whereGroup.companyId = companyId;

      const group = await CustomerGroup.findOne({ where: whereGroup });
      if (!group)
        return res.status(404).json({
          success: false,
          message: 'Grupo não encontrado ou sem permissão.',
        });

      await Customer.update({ customerGroup: null }, { where: { customerGroup: id } });
      await group.destroy();

      return res.json({ success: true, message: 'Grupo deletado com sucesso.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erro ao deletar grupo.' });
    }
  },
};
