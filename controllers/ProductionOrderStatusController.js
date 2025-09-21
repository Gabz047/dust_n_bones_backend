import ProductionOrderStatus from '../models/ProductionOrderStatus.js';
import ProductionOrder from '../models/ProductionOrder.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import Project from '../models/Project.js';
import sequelize from '../config/database.js';

class ProductionOrderStatusController {
    // Criar um novo status
    static async create(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { status, productionOrderId, date } = req.body;

            const productionOrder = await ProductionOrder.findByPk(productionOrderId);
            if (!productionOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Ordem de produção não encontrada'
                });
            }
            const now = new Date();

            const productionOrderStatus = await ProductionOrderStatus.create({
                id: uuidv4(),
                status,
                productionOrderId,
                date
            }, {transaction});

            if (status === 'Finalizada') {
                await productionOrder.update(
                    { closeDate: now },
                    { transaction }
                )
            }

            await transaction.commit()

        
            return res.status(201).json({ success: true, data: productionOrderStatus });
        } catch (error) {
            console.error('Erro ao criar status da ordem de produção:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao criar status da ordem de produção',
                error: error.message
            });
        }
    }

    // Listar todos os status com paginação e busca
    static async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const { search } = req.query;
            const where = {};

            if (search) {
                where[Op.or] = [
                    { status: { [Op.iLike]: `%${search}%` } }
                ];
            }

            const { count, rows } = await ProductionOrderStatus.findAndCountAll({
                where,
                include: [
                    {
                        model: ProductionOrder,
                        as: 'productionOrder',
                        attributes: ['id', 'code', 'description']
                    }
                ],
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            res.json({
                success: true,
                data: {
                    statuses: rows,
                    pagination: {
                        total: count,
                        page,
                        limit,
                        totalPages: Math.ceil(count / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao buscar status da ordem de produção:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

     // Buscar itens por OP
  static async getByProductionOrder(req, res) {
    try {
      const { id } = req.params;
      const items = await ProductionOrderStatus.findAll({
        where: { productionOrderId: id },
        include: [
          { model: ProductionOrder, as: 'productionOrder' },
        ]
      });

      res.json({ success: true, data: items });
    } catch (error) {
      console.error('Erro ao buscar itens por OP:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

static async getByCompanyOrBranch(req, res) {
  try {
    const { id } = req.params;

    // Buscar status onde a ordem de produção está ligada a um projeto da company ou branch
    const items = await ProductionOrderStatus.findAll({
      include: [
        {
          model: ProductionOrder,
          as: 'productionOrder',
          include: [
            {
              model: Project,
              as: 'project',
              where: {
                [Op.or]: [
                  { companyId: id },
                  { branchId: id }
                ]
              }
            }
          ]
        }
      ]
    });

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Erro ao buscar status por empresa/filial:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor', 
      error: error.message 
    });
  }
}



    // Buscar por ID
    static async getById(req, res) {
        try {
            const { id } = req.params;

            const productionOrderStatus = await ProductionOrderStatus.findByPk(id, {
                include: [
                    {
                        model: ProductionOrder,
                        as: 'productionOrder',
                        attributes: ['id', 'code', 'description']
                    }
                ]
            });

            if (!productionOrderStatus) {
                return res.status(404).json({
                    success: false,
                    message: 'Status da ordem de produção não encontrado'
                });
            }

            res.json({
                success: true,
                data: productionOrderStatus
            });
        } catch (error) {
            console.error('Erro ao buscar status da ordem de produção:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    // Atualizar
    static async update(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const productionOrderStatus = await ProductionOrderStatus.findByPk(id);

            if (!productionOrderStatus) {
                return res.status(404).json({
                    success: false,
                    message: 'Status da ordem de produção não encontrado'
                });
            }

            await productionOrderStatus.update(updates);

            res.json({
                success: true,
                message: 'Status atualizado com sucesso',
                data: productionOrderStatus
            });
        } catch (error) {
            console.error('Erro ao atualizar status da ordem de produção:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    // Deletar
    static async delete(req, res) {
        try {
            const { id } = req.params;

            const productionOrderStatus = await ProductionOrderStatus.findByPk(id);

            if (!productionOrderStatus) {
                return res.status(404).json({
                    success: false,
                    message: 'Status da ordem de produção não encontrado'
                });
            }


            await productionOrderStatus.destroy();

            res.json({
                success: true,
                message: 'Status removido com sucesso'
            });
        } catch (error) {
            console.error('Erro ao deletar status da ordem de produção:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }
}

export default ProductionOrderStatusController;
