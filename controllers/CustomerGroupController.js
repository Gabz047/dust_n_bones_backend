import Customer from '../models/Customer.js';
import CustomerGroup from '../models/CustomerGroup.js';
import { Op } from 'sequelize';

export default {
    // Criar grupo de clientes
    async create(req, res) {
        try {
            const { mainCustomer } = req.body;

            // Verifica se o cliente já é cliente principal em outro grupo
            const isMainCustomerInAnotherGroup = await CustomerGroup.findOne({
                where: { mainCustomer: mainCustomer }
            });

            // Verifica se o cliente já pertence a algum grupo como cliente comum
            const isCustomerInAnotherGroup = await Customer.findOne({
                where: { id: mainCustomer, customerGroup: { [Op.ne]: null } }
            });

            if (isMainCustomerInAnotherGroup || isCustomerInAnotherGroup) {
                return res.status(400).json({
                    success: false,
                    message: 'Este cliente já pertence a um grupo (como principal ou comum).'
                });
            }

            // Verifica se cliente existe

            const customer = await Customer.findByPk(mainCustomer);
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente não encontrado.'
                });
            }

            // Cria o grupo
            const group = await CustomerGroup.create({
                mainCustomer: mainCustomer
            });

            // Atualiza o cliente principal com o ID do grupo

            await Customer.update(
                { customerGroup: group.id },
                { where: { id: mainCustomer } }
            );

            return res.status(201).json({ success: true, message: 'Grupo criado com sucesso.', data: group });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Erro ao criar grupo.' });
        }
    },

    // Buscar todos os grupos com clientes
    async getAll(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { active } = req.query;

        const where = {};
        if (active !== undefined) where.active = active === 'true';

        const { count, rows } = await CustomerGroup.findAndCountAll({
            where,
            limit,
            offset,
            include: [
                {
                    model: Customer,
                    as: 'mainCustomerInGroup'
                },
                {
                    model: Customer,
                    as: 'customersInGroup'
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.json({
            success: true,
            data: {
                customerGroups: rows,
                pagination: {
                    total: count,
                    page,
                    limit,
                    totalPages: Math.ceil(count / limit)
                }
            }
        });
    } catch (err) {
        console.error('Erro ao buscar grupos de clientes:', err);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: err.message
        });
    }
    },

    // Atualizar os clientes normais do grupo
   async updateGroupCustomers(req, res) {
    try {
        const { id } = req.params; // ID do grupo
        const { customerIds = [] } = req.body; // Novos clientes comuns

        const group = await CustomerGroup.findByPk(id);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Grupo não encontrado.' });
        }

        // Verificar se cada cliente pode ser adicionado ao grupo
        for (const customerId of customerIds) {
            const customer = await Customer.findByPk(customerId);
            if (!customer) continue;

            const isAlreadyMain = await CustomerGroup.findOne({
                where: { mainCustomer: customerId }
            });

            const isInOtherGroup = customer.customerGroup && customer.customerGroup !== id;

            if (isAlreadyMain || isInOtherGroup) {
                return res.status(400).json({
                    success: false,
                    message: `Cliente ${customer.name} já pertence a um grupo (como principal ou comum).`
                });
            }
        }

        // Limpa todos os clientes atuais do grupo, menos o principal
        await Customer.update(
            { customerGroup: null },
            {
                where: {
                    customerGroup: id,
                    id: { [Op.ne]: group.mainCustomer }
                }
            }
        );

        // Atribui os novos clientes ao grupo
        await Customer.update(
            { customerGroup: id },
            {
                where: {
                    id: customerIds
                }
            }
        );

        return res.json({ success: true, message: 'Clientes do grupo atualizados com sucesso.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar clientes do grupo.' });
    }
},

async updateGroupMainCustomer(req, res) {
    try {
        const { id } = req.params; // ID do grupo
        const { mainCustomerId } = req.body; // Novo cliente principal

        const group = await CustomerGroup.findByPk(id);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Grupo não encontrado.' });
        }

        const newMainCustomer = await Customer.findByPk(mainCustomerId);
        if (!newMainCustomer) {
            return res.status(400).json({ success: false, message: 'Novo cliente principal não encontrado.' });
        }

        // Verifica se o novo principal já está em outro grupo
        const isMainElsewhere = await CustomerGroup.findOne({
            where: { mainCustomer: mainCustomerId, id: { [Op.ne]: id } }
        });

        const isInOtherGroup = newMainCustomer.customerGroup && newMainCustomer.customerGroup !== id;

        if (isMainElsewhere || isInOtherGroup) {
            return res.status(400).json({
                success: false,
                message: 'Cliente já pertence a um grupo (como principal ou comum).'
            });
        }

        // Limpa o campo customerGroup do antigo cliente principal (se não estiver nos comuns)
        const oldMainCustomer = await Customer.findByPk(group.mainCustomer);
        const isStillInGroup = await Customer.findOne({
            where: {
                id: oldMainCustomer.id,
                customerGroup: id
            }
        });

        if (isStillInGroup) {
            // Se o antigo principal ainda está listado como comum, não limpa
        } else {
            await Customer.update(
                { customerGroup: null },
                { where: { id: oldMainCustomer.id } }
            );
        }

        // Atualiza o novo cliente principal
        await Customer.update(
            { customerGroup: id },
            { where: { id: mainCustomerId } }
        );

        group.mainCustomer = mainCustomerId;
        await group.save();

        return res.json({ success: true, message: 'Cliente principal atualizado com sucesso.', data: group });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar cliente principal do grupo.' });
    }
},


    // Deletar grupo
    async delete(req, res) {
        try {
            const { id } = req.params;

            const group = await CustomerGroup.findByPk(id);
            if (!group) {
                return res.status(404).json({ success: false, message: 'Grupo não encontrado.' });
            }

            // Remove grupo dos clientes
            await Customer.update(
                { customerGroup: null },
                { where: { customerGroup: id } }
            );

            await group.destroy();

            return res.json({ success: true, message: 'Grupo deletado com sucesso.' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Erro ao deletar grupo.' });
        }
    }
};
