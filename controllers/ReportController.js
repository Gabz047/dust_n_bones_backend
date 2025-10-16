import { sequelize, Order, OrderItem, Project, Company, Branch, Customer, Item, ItemFeature, FeatureOption, Box, BoxItem, ProductionOrder, ProductionOrderItem, Stock, StockItem, Feature } from '../models/index.js';
import { Op } from 'sequelize';


class OrderReportController {
  // 🔒 Filtro de acesso por empresa/filial (via projeto)
  static projectAccessFilter(req) {
    const { companyId, branchId } = req.context || {};
    return {
      companyId,
      ...(branchId ? { branchId } : {})
    };
  }


  /**
   * Retorna todos os dados necessários para gerar o relatório de pedido
   * GET /api/orders/:orderId/report-data
   */
  static async getReportData(req, res) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({ success: false, message: 'ID do pedido não informado' });
      }

      const order = await Order.findOne({
        where: { id: orderId },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'referralId', 'deliveryDate', 'totalQuantity', 'companyId', 'branchId'],
            where: OrderReportController.projectAccessFilter(req),
            include: [
              {
                model: Company,
                as: 'company',
                attributes: ['id', 'name', 'cnpj', 'address', 'city', 'state', ['zip_code', 'zipcode'], 'country', 'phone', 'email']
              },
              {
                model: Branch,
                as: 'branch',
                attributes: ['id', 'name', 'cnpj', 'address', 'city', 'state', ['zip_code', 'zipcode'], 'country', 'phone', 'email']
              },
              {
                model: Customer,
                as: 'customer',
                attributes: ['id', 'name']
              }
            ]
          },
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'name', 'address', 'city', 'state', ['zip_code', 'zipcode'], 'country', 'phone', 'email']
          },
          {
            model: OrderItem,
            as: 'orderItems',
            attributes: ['id', 'quantity', 'itemId', 'itemFeatureId', 'featureOptionId'],
            include: [
              {
                model: Item,
                as: 'item',
                attributes: ['id', 'name', 'price']
              },
              {
                model: ItemFeature,
                as: 'itemFeature',
                attributes: ['id'],
                include: [
                  {
                    model: Feature,
                    as: 'feature',
                    attributes: ['id', 'name']
                  }
                ]
              },
              {
                model: FeatureOption,
                as: 'featureOption',
                attributes: ['id', 'name']
              }
            ]
          }
        ]
      });

      if (!order) {
        return res.status(404).json({ success: false, message: 'Pedido não encontrado ou sem permissão de acesso' });
      }

      const orderItemsWithQuantities = await Promise.all(
        order.orderItems.map(async (orderItem) => {
          const expedidaData = await BoxItem.findAll({
            where: { orderItemId: orderItem.id },
            attributes: [[sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty']],
            raw: true
          });
          const qtdExpedida = expedidaData[0]?.totalQty || 0;

          const productionData = await ProductionOrderItem.findAll({
            where: {
              itemId: orderItem.itemId,
              itemFeatureId: orderItem.itemFeatureId || null,
              featureOptionId: orderItem.featureOptionId || null
            },
            attributes: [[sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty']],
            raw: true
          });
          const qtdProducao = productionData[0]?.totalQty || 0;

          const stockData = await StockItem.findAll({
            where: {
              itemId: orderItem.itemId,
              itemFeatureId: orderItem.itemFeatureId || null,
              featureOptionId: orderItem.featureOptionId || null
            },
            attributes: [[sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty']],
            raw: true
          });
          const qtdEstoque = stockData[0]?.totalQty || 0;

          return {
            id: orderItem.id,
            orderId: orderItem.orderId,
            item: {
              id: orderItem.item.id,
              name: orderItem.item.name,
              price: orderItem.item.price
            },
            feature: orderItem.itemFeature?.feature ? {
              id: orderItem.itemFeature.feature.id,
              name: orderItem.itemFeature.feature.name
            } : null,
            featureOption: orderItem.featureOption ? {
              id: orderItem.featureOption.id,
              name: orderItem.featureOption.name
            } : null,
            qtdOrdenada: orderItem.quantity,
            qtdExpedida,
            qtdProducao,
            qtdEstoque
          };
        })
      );

      const reportData = {
        order: {
          id: order.id,
          referralId: order.referralId,
          deliveryDate: order.deliveryDate,
          createdAt: order.createdAt
        },
        project: {
          id: order.project.id,
          name: order.project.name,
          referralId: order.project.referralId,
          deliveryDate: order.project.deliveryDate,
          totalQuantity: order.project.totalQuantity,
          customer: order.project.customer ? {
            id: order.project.customer.id,
            name: order.project.customer.name
          } : null
        },
        company: order.project.company ? {
          id: order.project.company.id,
          name: order.project.company.name,
          cnpj: order.project.company.cnpj,
          address: order.project.company.address,
          city: order.project.company.city,
          state: order.project.company.state,
          zipcode: order.project.company.zipcode,
          country: order.project.company.country,
          phone: order.project.company.phone,
          email: order.project.company.email
        } : null,
        branch: order.project.branch ? {
          id: order.project.branch.id,
          name: order.project.branch.name,
          cnpj: order.project.branch.cnpj,
          address: order.project.branch.address,
          city: order.project.branch.city,
          state: order.project.branch.state,
          zipcode: order.project.branch.zipcode,
          country: order.project.branch.country,
          phone: order.project.branch.phone,
          email: order.project.branch.email
        } : null,
        customer: order.customer ? {
          id: order.customer.id,
          name: order.customer.name,
          address: order.customer.address,
          city: order.customer.city,
          state: order.customer.state,
          zipcode: order.customer.zipcode,
          country: order.customer.country,
          phone: order.customer.phone,
          email: order.customer.email
        } : null,
        items: orderItemsWithQuantities
      };

      return res.json({ success: true, data: reportData });

    } catch (error) {
      console.error('Erro ao buscar dados do relatório:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }


  /**
   * Retorna todos os dados necessários para gerar o relatório de projeto
   * Agrega todos os pedidos dentro do projeto
   * GET /api/projects/:projectId/report-data
   */
  static async getProjectReportData(req, res) {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({ success: false, message: 'ID do projeto não informado' });
      }

      // 🔍 Busca o projeto com validação de acesso
      const project = await Project.findOne({
        where: {
          id: projectId,
          ...OrderReportController.projectAccessFilter(req)
        },
        include: [
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name', 'cnpj', 'address', 'city', 'state', ['zip_code', 'zipcode'], 'country', 'phone', 'email']
          },
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'cnpj', 'address', 'city', 'state', ['zip_code', 'zipcode'], 'country', 'phone', 'email']
          },
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'name', 'address', 'city', 'state', ['zip_code', 'zipcode'], 'country', 'phone', 'email']
          }
        ]
      });

      if (!project) {
        return res.status(404).json({ success: false, message: 'Projeto não encontrado ou sem permissão de acesso' });
      }

      // 🔍 Busca todos os pedidos do projeto
      const orders = await Order.findAll({
        where: { projectId },
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'name']
          },
          {
            model: OrderItem,
            as: 'orderItems',
            attributes: ['id', 'quantity', 'itemId', 'itemFeatureId', 'featureOptionId'],
            include: [
              {
                model: Item,
                as: 'item',
                attributes: ['id', 'name', 'price']
              },
              {
                model: ItemFeature,
                as: 'itemFeature',
                attributes: ['id'],
                include: [
                  {
                    model: Feature,
                    as: 'feature',
                    attributes: ['id', 'name']
                  }
                ]
              },
              {
                model: FeatureOption,
                as: 'featureOption',
                attributes: ['id', 'name']
              }
            ]
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      // 🔹 Para cada pedido, processar seus itens com quantidades
      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          const orderItemsWithQuantities = await Promise.all(
            order.orderItems.map(async (orderItem) => {
              // Quantidade expedida (BoxItem)
              const expedidaData = await BoxItem.findAll({
                where: { orderItemId: orderItem.id },
                attributes: [[sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty']],
                raw: true
              });
              const qtdExpedida = expedidaData[0]?.totalQty || 0;

              // Quantidade em ordem de produção (filtrando pelo projeto)
              const productionData = await ProductionOrderItem.findAll({
                where: {
                  itemId: orderItem.itemId,
                  itemFeatureId: orderItem.itemFeatureId || null,
                  featureOptionId: orderItem.featureOptionId || null
                },
                include: [
                  {
                    model: ProductionOrder,
                    as: 'productionOrder',
                    where: { projectId },
                    attributes: []
                  }
                ],
                attributes: [[sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty']],
                raw: true
              });
              const qtdProducao = productionData[0]?.totalQty || 0;

              // Quantidade em estoque
              const stockData = await StockItem.findAll({
                where: {
                  itemId: orderItem.itemId,
                  itemFeatureId: orderItem.itemFeatureId || null,
                  featureOptionId: orderItem.featureOptionId || null
                },
                attributes: [[sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty']],
                raw: true
              });
              const qtdEstoque = stockData[0]?.totalQty || 0;

              return {
                id: orderItem.id,
                orderId: orderItem.orderId,
                item: {
                  id: orderItem.item.id,
                  name: orderItem.item.name,
                  price: orderItem.item.price
                },
                feature: orderItem.itemFeature?.feature ? {
                  id: orderItem.itemFeature.feature.id,
                  name: orderItem.itemFeature.feature.name
                } : null,
                featureOption: orderItem.featureOption ? {
                  id: orderItem.featureOption.id,
                  name: orderItem.featureOption.name
                } : null,
                qtdOrdenada: orderItem.quantity,
                qtdExpedida,
                qtdProducao,
                qtdEstoque
              };
            })
          );

          return {
            id: order.id,
            referralId: order.referralId,
            deliveryDate: order.deliveryDate,
            createdAt: order.createdAt,
            customer: order.customer ? {
              id: order.customer.id,
              name: order.customer.name
            } : null,
            items: orderItemsWithQuantities
          };
        })
      );

      // 🔹 Estruturar resposta completa do projeto
      const reportData = {
        project: {
          id: project.id,
          name: project.name,
          referralId: project.referralId,
          deliveryDate: project.deliveryDate,
          totalQuantity: project.totalQuantity,
          createdAt: project.createdAt
        },
        company: project.company ? {
          id: project.company.id,
          name: project.company.name,
          cnpj: project.company.cnpj,
          address: project.company.address,
          city: project.company.city,
          state: project.company.state,
          zipcode: project.company.zipcode,
          country: project.company.country,
          phone: project.company.phone,
          email: project.company.email
        } : null,
        branch: project.branch ? {
          id: project.branch.id,
          name: project.branch.name,
          cnpj: project.branch.cnpj,
          address: project.branch.address,
          city: project.branch.city,
          state: project.branch.state,
          zipcode: project.branch.zipcode,
          country: project.branch.country,
          phone: project.branch.phone,
          email: project.branch.email
        } : null,
        customer: project.customer ? {
          id: project.customer.id,
          name: project.customer.name,
          address: project.customer.address,
          city: project.customer.city,
          state: project.customer.state,
          zipcode: project.customer.zipcode,
          country: project.customer.country,
          phone: project.customer.phone,
          email: project.customer.email
        } : null,
        orders: ordersWithDetails
      };

      return res.json({ success: true, data: reportData });

    } catch (error) {
      console.error('Erro ao buscar dados do relatório do projeto:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}


export default OrderReportController;