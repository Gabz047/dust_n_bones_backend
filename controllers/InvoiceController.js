import { sequelize, Invoice, DeliveryNote, MovementLogEntity, Project, InvoiceItem, Box, BoxItem, ItemFeature, Item, FeatureOption, Feature, Order, Customer, OrderItem, User, Account, MovementLogEntityItem, Company, Branch } from '../models/index.js';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';
import { Op } from 'sequelize';
import { generateReferralId } from '../utils/globals/generateReferralId.js';
class InvoiceController {

  // Cria uma nova fatura
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { projectId, type, deliveryNoteIds, userId } = req.body;
      const { companyId, branchId } = req.context;

      let romaneios = [];
      const dnWhere = {
        ...(deliveryNoteIds?.length ? { id: deliveryNoteIds } : { projectId }),
        ...(companyId ? { companyId } : {}),
        ...(branchId ? { branchId } : {})
      };

      romaneios = await DeliveryNote.findAll({ where: dnWhere, transaction });
      if (romaneios.length === 0) {
        return res.status(400).json({ error: 'Nenhum romaneio encontrado para gerar a fatura' });
      }

       const company = await Company.findOne({ where: { id: companyId } });
            const branch = branchId ? await Branch.findOne({ where: { id: branchId } }) : null;
      
            const companyRef = company?.referralId;
            const branchRef = branch?.referralId ?? null;
      
            const referralId = await generateReferralId({
              model: Invoice,
              transaction,
              companyId: companyRef,
              branchId: branchRef,
            });

      const invoice = await Invoice.create({
        projectId,
        type,
        referralId,
        companyId: companyId || null,
        branchId: branchId || null,
        date: new Date(),
        totalPrice: 0
      }, { transaction });

      
            const MreferralId = await generateReferralId({
              model: Invoice,
              transaction,
              companyId: companyRef,
              branchId: branchRef,
            });

      // Preparar dados do log
      let movementData = {
        method: 'criação',
        entity: 'fatura',
        entityId: invoice.id,
        status: 'aberto',
        date: new Date(),
         companyId: companyId || null,
        branchId: branchId || null,
        referralId: MreferralId,
      };

      // Verifica User ou Account
      const user = await User.findByPk(userId);
      if (user) {
        movementData.userId = userId;
      } else {
        const account = await Account.findByPk(userId);
        if (account) {
          movementData.accountId = userId;
        } else {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'O ID informado não corresponde a um User ou Account válido' });
        }
      }

      const movementLog = await MovementLogEntity.create(movementData, { transaction });

      let totalInvoicePrice = 0;

      for (const dn of romaneios) {
        // ⚠️ Ignora romaneios que já estão vinculados a alguma fatura
        if (dn.invoiceId) {
          console.log(`Romaneio ${dn.id} já vinculado à fatura ${dn.invoiceId}, ignorando...`);
          continue;
        }

        let dnTotalPrice = 0;
        let dnTotalQuantity = 0;

        const boxes = await Box.findAll({
          where: { deliveryNoteId: dn.id },
          include: [
            {
              model: BoxItem,
              as: 'items',
              include: [
                { model: Item, as: 'item', attributes: ['id', 'name', 'price'] }
              ]
            }
          ],
          transaction
        });

        for (const box of boxes) {
          for (const bi of box.items) {
            const unitPrice = bi.item?.price || 0;
            const lineTotal = unitPrice * bi.quantity;
            dnTotalPrice += lineTotal;
            dnTotalQuantity += bi.quantity;
          }
        }

        // 🔒 Só cria itens e atualiza romaneio se for fatura de projeto
        if (type === 'project') {
          const invoiceItem = await InvoiceItem.create({
            invoiceId: invoice.id,
            deliveryNoteId: dn.id,
            orderId: dn.orderId || null,
            price: dnTotalPrice
          }, { transaction });

          // Marca o romaneio como faturado
          await dn.update({ invoiceId: invoice.id }, { transaction });

          // Log do item da fatura
          const movementItemData = {
            method: 'criação',
            entity: 'fatura',
            entityId: invoiceItem.id,
            movementLogEntityId: movementLog.id,
            quantity: dnTotalQuantity,
            status: 'aberto',
            date: new Date()
          };

          // Associa ao User ou Account
          const userItem = await User.findByPk(userId);
          if (userItem) {
            movementItemData.userId = userId;
          } else {
            const accountItem = await Account.findByPk(userId);
            if (accountItem) {
              movementItemData.accountId = userId;
            } else {
              await transaction.rollback();
              return res.status(400).json({ success: false, message: 'O ID informado não corresponde a um User ou Account válido' });
            }
          }

          await MovementLogEntityItem.create(movementItemData, { transaction });
        }

        totalInvoicePrice += dnTotalPrice;
      }

      await invoice.update({ totalPrice: totalInvoicePrice }, { transaction });
      await transaction.commit();
      return res.status(201).json({ success: true, data: invoice });

    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ success: false, error: 'Erro ao criar fatura' });
    }
  }

  // Atualiza fatura existente
  static async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { totalPrice, userId } = req.body;
      const { companyId, branchId } = req.context;

      const invoice = await Invoice.findOne({
        where: { id, ...(companyId ? { companyId } : {}), ...(branchId ? { branchId } : {}) },
        transaction
      });
      if (!invoice) return res.status(404).json({ success: false, error: 'Fatura não encontrada' });

      await invoice.update({ totalPrice }, { transaction });

      const company = await Company.findOne({ where: { id: companyId } });
            const branch = branchId ? await Branch.findOne({ where: { id: branchId } }) : null;
      
            const companyRef = company?.referralId;
            const branchRef = branch?.referralId ?? null;
      
            const referralId = await generateReferralId({
              model: Invoice,
              transaction,
              companyId: companyRef,
              branchId: branchRef,
            });

      const movementData = {
        method: 'edição',
        entity: 'fatura',
        entityId: invoice.id,
        status: 'aberto',
        date: new Date(),
         companyId: companyId || null,
        branchId: branchId || null,
        referralId,
      };

      // Verifica User ou Account
      const user = await User.findByPk(userId);
      if (user) {
        movementData.userId = userId;
      } else {
        const account = await Account.findByPk(userId);
        if (account) {
          movementData.accountId = userId;
        } else {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'O ID informado não corresponde a um User ou Account válido' });
        }
      }

      await MovementLogEntity.create(movementData, { transaction });
      await transaction.commit();
      return res.json({ success: true, data: invoice });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // Deleta fatura
 // Deleta fatura apenas se não houver vínculos diretos
static async delete(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const { companyId, branchId } = req.context;

    const invoice = await Invoice.findOne({
      where: { id, ...(companyId ? { companyId } : {}), ...(branchId ? { branchId } : {}) },
      include: [
        { model: InvoiceItem, as: 'items', attributes: ['id'] },
        { model: DeliveryNote, as: 'deliveryNotes', attributes: ['id'] }
      ],
      transaction
    });

    if (!invoice) return res.status(404).json({ success: false, error: 'Fatura não encontrada' });

    // Checa vínculos
    if ((invoice.items?.length || 0) > 0 || (invoice.deliveryNotes?.length || 0) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível deletar esta fatura, pois existem vínculos diretos com itens ou romaneios.'
      });
    }

    await invoice.destroy({ transaction });

    const company = await Company.findOne({ where: { id: companyId } });
            const branch = branchId ? await Branch.findOne({ where: { id: branchId } }) : null;
      
            const companyRef = company?.referralId;
            const branchRef = branch?.referralId ?? null;
      
            const referralId = await generateReferralId({
              model: Invoice,
              transaction,
              companyId: companyRef,
              branchId: branchRef,
            });

    const movementData = {
      method: 'remoção',
      entity: 'fatura',
      entityId: id,
      status: 'aberto',
      date: new Date(),
       companyId: companyId || null,
        branchId: branchId || null,
        referralId,
    };

    // Verifica User ou Account
    const user = await User.findByPk(userId);
    if (user) {
      movementData.userId = userId;
    } else {
      const account = await Account.findByPk(userId);
      if (account) {
        movementData.accountId = userId;
      } else {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'O ID informado não corresponde a um User ou Account válido' });
      }
    }

    await MovementLogEntity.create(movementData, { transaction });
    await transaction.commit();
    return res.json({ success: true, message: 'Fatura deletada com sucesso' });

  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, error: error.message });
  }
}


  // 🔒 Filtro de acesso por empresa/filial
  static projectAccessFilter(req) {
    const { companyId, branchId } = req.context || {};
    return {
      ...(companyId && { companyId }),
      ...(branchId && { branchId })
    };
  }

  // 📦 Buscar todas as faturas (COM PAGINAÇÃO)
  static async getAll(req, res) {
    try {
      const { projectId, type } = req.query;
      const where = {};

      if (projectId) where.projectId = projectId;
      if (type) where.type = type;

      const result = await buildQueryOptions(req, Invoice, {
        where,
        attributes: ['id', 'projectId', 'type', 'totalPrice', 'referralId', 'createdAt'],
        include: [
          {
            model: Project,
            as: 'project',
            where: InvoiceController.projectAccessFilter(req),
            attributes: ['id', 'name']
          },
          { model: DeliveryNote, as: 'deliveryNotes', attributes: ['id', 'referralId'] }
        ]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar faturas:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 🔍 Buscar fatura por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const invoice = await Invoice.findOne({
        where: { id },
        attributes: ['id', 'projectId', 'type', 'totalPrice', 'referralId', 'createdAt'],
        include: [
          {
            model: Project,
            as: 'project',
            where: InvoiceController.projectAccessFilter(req),
            include: [
              { model: Customer, as: 'customer', attributes: ['id', 'name'] }
            ]
          },
          {
            model: DeliveryNote,
            as: 'deliveryNotes',
            attributes: ['id', 'referralId', 'totalQuantity'],
            include: [
              { model: Customer, as: 'customer', attributes: ['id', 'name'] }
            ]
          }
        ]
      });

      if (!invoice) return res.status(404).json({ success: false, error: 'Fatura não encontrada' });

      const lastMovement = await MovementLogEntity.findOne({
        where: { entity: 'fatura', entityId: id },
        order: [['date', 'DESC']],
        attributes: ['id', 'status']
      });

      res.json({
        success: true,
        data: {
          ...invoice.toJSON(),
          lastMovementLogEntityId: lastMovement || null
        }
      });
    } catch (error) {
      console.error('Erro ao buscar fatura por ID:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 🏗️ Buscar faturas por projeto (COM PAGINAÇÃO)
  static async getByProject(req, res) {
    try {
      const { projectId } = req.params;

      const result = await buildQueryOptions(req, Invoice, {
        where: { projectId },
        attributes: ['id', 'projectId', 'type', 'totalPrice', 'referralId', 'createdAt'],
        include: [
          {
            model: Project,
            as: 'project',
            where: InvoiceController.projectAccessFilter(req),
            attributes: ['id', 'name']
          },
          { model: DeliveryNote, as: 'deliveryNotes', attributes: ['id', 'referralId'] }
        ]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar faturas por projeto:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 📋 Buscar faturas por tipo (COM PAGINAÇÃO)
  static async getByType(req, res) {
    try {
      const { type } = req.params;
      const { term, fields } = req.query;

      const where = { type };

      // 🔍 Filtro de pesquisa textual
      if (term && fields) {
        const searchFields = fields.split(',');
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${term}%` }
        }));
      }

      const result = await buildQueryOptions(req, Invoice, {
        where,
        attributes: ['id', 'projectId', 'type', 'totalPrice', 'referralId', 'createdAt'],
        include: [
          {
            model: Project,
            as: 'project',
            where: InvoiceController.projectAccessFilter(req),
            attributes: ['id', 'name']
          },
          { model: DeliveryNote, as: 'deliveryNotes', attributes: ['id', 'referralId'] }
        ]
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao buscar faturas por tipo:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 📄 Gerar PDF
  static async generatePDF(req, res) {
    try {
      const { id } = req.params;

      const invoice = await Invoice.findByPk(id, {
        attributes: ['id', 'createdAt', 'totalPrice', 'type'],
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name'],
            include: [
              {
                model: Customer,
                as: 'customer',
                attributes: ['id', 'name', 'address', 'city', 'state', ['zip_code', 'zipcode'], 'country', 'document']
              }
            ]
          },
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name', 'cnpj', 'email', 'phone', 'address', 'city', 'state', ['zip_code', 'zipcode'], 'country']
          },
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'cnpj', 'email', 'phone', 'address', 'city', 'state', ['zip_code', 'zipcode'], 'country']
          },
          {
            model: DeliveryNote,
            as: 'deliveryNotes',
            attributes: ['id', 'referralId'],
            include: [
              { model: Customer, as: 'customer', attributes: ['id', 'name'] },
              {
                model: Box,
                as: 'boxes',
                include: [
                  {
                    model: BoxItem,
                    as: 'items',
                    include: [
                      { model: Item, as: 'item', attributes: ['id', 'name', 'price'] },
                      {
                        model: ItemFeature,
                        as: 'itemFeature',
                        include: [{ model: Feature, as: 'feature', attributes: ['name'] }]
                      },
                      { model: FeatureOption, as: 'featureOption', attributes: ['name'] }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      });

      if (!invoice) return res.status(404).json({ success: false, error: 'Fatura não encontrada' });

      const slimInvoice = {
        id: invoice.id,
        issueDate: invoice.createdAt,
        totalPrice: invoice.totalPrice,
        type: invoice.type,
        company: invoice.company ? {
          name: invoice.company.name,
          cnpj: invoice.company.cnpj,
          email: invoice.company.email,
          phone: invoice.company.phone,
          address: invoice.company.address,
          city: invoice.company.city,
          state: invoice.company.state,
          zipcode: invoice.company.get('zipcode'),
          country: invoice.company.country
        } : null,
        branch: invoice.branch ? {
          name: invoice.branch.name,
          cnpj: invoice.branch.cnpj,
          email: invoice.branch.email,
          phone: invoice.branch.phone,
          address: invoice.branch.address,
          city: invoice.branch.city,
          state: invoice.branch.state,
          zipcode: invoice.branch.get('zipcode'),
          country: invoice.branch.country
        } : null,
        project: invoice.project ? {
          id: invoice.project.id,
          name: invoice.project.name,
          customer: invoice.project.customer ? {
            id: invoice.project.customer.id,
            name: invoice.project.customer.name,
            address: invoice.project.customer.address,
            city: invoice.project.customer.city,
            state: invoice.project.customer.state,
            zipcode: invoice.project.customer.get('zipcode'),
            country: invoice.project.customer.country,
            document: invoice.project.customer.document
          } : null
        } : null,
        deliveryNotes: (invoice.deliveryNotes || []).map(dn => {
          let dnTotal = 0;
          const itemsMap = {};

          (dn.boxes || []).forEach(box => {
            (box.items || []).forEach(bi => {
              const features = Array.isArray(bi.itemFeature) ? bi.itemFeature : [bi.itemFeature];

              features.forEach(f => {
                const featureOptionName = bi.featureOption?.name || f?.featureOption?.name || null;
                const key = `${bi.item?.id}-${featureOptionName || ''}`;

                const unitPrice = bi.item?.price || 0;
                const totalPriceItem = unitPrice * bi.quantity;

                if (!itemsMap[key]) {
                  itemsMap[key] = {
                    quantity: bi.quantity,
                    item: bi.item?.name,
                    unitPrice,
                    totalPrice: totalPriceItem,
                    itemFeature: f ? { feature: { name: f.feature?.name } } : null,
                    featureOption: featureOptionName
                  };
                } else {
                  itemsMap[key].quantity += bi.quantity;
                  itemsMap[key].totalPrice += totalPriceItem;
                }

                dnTotal += totalPriceItem;
              });
            });
          });

          return {
            id: dn.id,
            referralId: dn.referralId,
            customer: dn.customer ? { id: dn.customer.id, name: dn.customer.name } : null,
            total: dnTotal,
            items: Object.values(itemsMap)
          };
        })
      };

      res.json({ success: true, data: slimInvoice });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default InvoiceController;