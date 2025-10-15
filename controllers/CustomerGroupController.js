// controllers/CustomerGroupController.js
import Customer from '../models/Customer.js';
import CustomerGroup from '../models/CustomerGroup.js';
import Branch from '../models/Branch.js';
import Company from '../models/Company.js';
import sequelize from '../config/database.js';
import { Op } from 'sequelize';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';
import { generateReferralId } from '../utils/globals/generateReferralId.js';

function groupAccessFilter(req) {
  const { companyId, branchId } = req.context || {};
  const where = {};
  if (branchId) where.branchId = branchId;
  else if (companyId) where.companyId = companyId;
  return where;
}
export default {
  // Criar grupo de clientes
  async create(req, res) {
     const transaction = await sequelize.transaction();
  try {
    const { mainCustomer } = req.body
    const { companyId, branchId } = req.context

    const customer = await Customer.findByPk(mainCustomer)
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado.',
      })
    }

    if (
      (branchId && customer.branchId !== branchId) ||
      (!branchId && companyId && customer.companyId !== companyId)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Cliente não pertence à mesma empresa ou filial.',
      })
    }

    const isMainCustomerInAnotherGroup = await CustomerGroup.findOne({
      where: { mainCustomer },
    })

    const isCustomerInAnotherGroup = await Customer.findOne({
      where: { id: mainCustomer, customerGroup: { [Op.ne]: null } },
    })

    if (isMainCustomerInAnotherGroup || isCustomerInAnotherGroup) {
      return res.status(400).json({
        success: false,
        message: 'Este cliente já pertence a um grupo (como principal ou comum).',
      })
    }

       const company = await Company.findOne({ where: { id: companyId } });


      const referralId = await generateReferralId({
        model: CustomerGroup,
        transaction,
        companyId: company.id,
      });

    const group = await CustomerGroup.create({
      mainCustomer,
      referralId,
      companyId: companyId || null,
      branchId: branchId || null,
    })

    await Customer.update({ customerGroup: group.id }, { where: { id: mainCustomer } })

    return res.status(201).json({
      success: true,
      message: 'Grupo criado com sucesso.',
      data: group,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Erro ao criar grupo.' })
  }
},

  // 📦 Buscar todos os grupos com paginação e filtros
  async getAll(req, res) {
    try {
      const where = groupAccessFilter(req)

      const { term, fields } = req.query

      // ⚡️ Se o campo de busca envolve associação (ex: mainCustomerInGroup.name)
      if (fields?.includes('mainCustomerInGroup.') && term) {
        const result = await CustomerGroup.findAndCountAll({
          where,
          include: [
            {
              model: Customer,
              as: 'mainCustomerInGroup',
              attributes: ['id', 'name'],
              required: true,
              where: {
                name: { [Op.iLike]: `%${term}%` },
              },
            },
            {
              model: Customer,
              as: 'customersInGroup',
              attributes: ['id', 'name'],
            },
          ],
          order: [['createdAt', 'DESC']],
          limit: req.query.limit ? parseInt(req.query.limit) : 10,
          offset: req.query.page
            ? (parseInt(req.query.page) - 1) * (parseInt(req.query.limit) || 10)
            : 0,
        })

        return res.status(200).json({
          data: result.rows,
          count: result.count,
          pagination: {
            total: result.count,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            totalPages: Math.ceil(result.count / (parseInt(req.query.limit) || 10)),
          },
        })
      }

      // 👇 Se não for filtro por associação, usa o util padrão
      const result = await buildQueryOptions(req, CustomerGroup, {
        where,
        include: [
          { model: Customer, as: 'mainCustomerInGroup', attributes: ['id', 'name'] },
          { model: Customer, as: 'customersInGroup', attributes: ['id', 'name'] },
        ],
        order: [['createdAt', 'DESC']],
      })

      return res.status(200).json(result)
    } catch (error) {
      console.error('Erro ao buscar grupos de clientes:', error)
      return res.status(500).json({ error: error.message })
    }
  },


  // 🔍 Buscar grupo por ID
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

  // Buscar grupo do cliente principal
  async getByMainCustomerGroup(req, res) {
    try {
      const { id } = req.params;
      const { companyId, branchId } = req.context;

      const customer = await Customer.findByPk(id);
      if (!customer)
        return res.status(404).json({ success: false, message: 'Cliente não encontrado.' });

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

  // Atualizar os clientes comuns do grupo
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

  // Atualizar cliente principal do grupo
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

  // Deletar grupo
  async delete(req, res) {
  const transaction = await sequelize.transaction()
  try {
    const { id } = req.params
    const { companyId, branchId } = req.context

    const whereGroup = { id }
    if (branchId) whereGroup.branchId = branchId
    else if (companyId) whereGroup.companyId = companyId

    const group = await CustomerGroup.findOne({
      where: whereGroup,
      include: [
        {
          model: Customer,
          as: 'customersInGroup',
          attributes: ['id', 'name'],
        },
        {
          model: Customer,
          as: 'mainCustomerInGroup',
          attributes: ['id', 'name'],
        },
      ],
      transaction,
    })

    if (!group) {
      await transaction.rollback()
      return res.status(404).json({
        success: false,
        message: 'Grupo não encontrado ou sem permissão.',
      })
    }

    // 🔍 Importa o modelo de Project dinamicamente
    const { Project } = await import('../models/index.js')

    // Combina o cliente principal e os clientes comuns do grupo
    const allCustomerIds = [
      group.mainCustomerInGroup?.id,
      ...group.customersInGroup.map((c) => c.id),
    ].filter(Boolean)

    // Verifica se algum desses clientes está em projeto
    const hasProjects = await Project.findOne({
      where: { customerId: { [Op.in]: allCustomerIds } },
      transaction,
    })

    if (hasProjects) {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir este grupo porque um ou mais clientes estão vinculados a projetos.',
      })
    }

    // ✅ Nenhum cliente vinculado — pode excluir
    await Customer.update(
      { customerGroup: null },
      { where: { customerGroup: id }, transaction }
    )

    await group.destroy({ transaction })
    await transaction.commit()

    return res.json({
      success: true,
      message: 'Grupo deletado com sucesso.',
    })
  } catch (err) {
    await transaction.rollback()
    console.error(err)
    return res
      .status(500)
      .json({ success: false, message: 'Erro ao deletar grupo.' })
  }
}
};