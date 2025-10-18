import { v4 as uuidv4 } from 'uuid';
import { sequelize, DeliveryNote, DeliveryNoteItem, MovementLogEntity, MovementLogEntityItem, Box, BoxItem, OrderItem, FeatureOption, Item, ItemFeature, Feature, Invoice, Company, Branch, Project, Order, Customer, Expedition, Package, User, Account, InvoiceItem, Stock, StockItem, ItemFeatureOption } from '../models/index.js';
import { generateDeliveryNotePDF } from '../services/generate-pdf/delivery-note/delivery-note-pdf.js';
import { generateLabelsZPL } from '../services/generate-pdf/delivery-note/box-label-pdf.js';
import { Op } from 'sequelize';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';
import { generateReferralId } from '../utils/globals/generateReferralId.js';

class DeliveryNoteController {

  // 🔒 Filtro de acesso por empresa/filial (via projeto)
  static projectAccessFilter(req) {
    const { companyId, branchId } = req.context || {}
    return {
      companyId,
      ...(branchId ? { branchId } : {})
    }
  }

  // Cria um novo Delivery Note
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { invoiceId, projectId, companyId, branchId, customerId, orderId, expeditionId, userId, boxes } = req.body;

           

      // 🔍 Verifica se o projeto existe e valida acesso
      const project = await Project.findOne({
        where: {
          id: projectId,
          ...DeliveryNoteController.projectAccessFilter(req)
        }
      });

      if (!project) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Projeto não encontrado ou sem permissão de acesso' });
      }

      // ✅ companyId e branchId vêm do projeto
      const projectCompanyId = project.companyId;
      const projectBranchId = project.branchId || null;

      // ✅ GERA REFERRAL AUTOMÁTICO
      const referralId = await generateReferralId({
        model: DeliveryNote,
        transaction,
        companyId: projectCompanyId,
      });

      const deliveryNote = await DeliveryNote.create({
        invoiceId,
        projectId,
        companyId: projectCompanyId,
        branchId: projectBranchId,
        customerId,
        orderId,
        expeditionId,
        totalQuantity: 0,
        boxQuantity: 0,
        referralId
      }, { transaction });

      const MreferralId = await generateReferralId({
        model: MovementLogEntity,
        transaction,
        companyId: projectCompanyId,
      });

      // ✅ Criar movimentação
      let movementData = {
        method: 'criação',
        entity: 'romaneio',
        entityId: deliveryNote.id,
        status: 'aberto',
        companyId: projectCompanyId,
        branchId: projectBranchId,
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

      // Associa as caixas ao DeliveryNote
      for (const boxId of boxes) {
        await DeliveryNoteItem.create({ deliveryNoteId: deliveryNote.id, boxId }, { transaction });
        await Box.update({ deliveryNoteId: deliveryNote.id }, { where: { id: boxId }, transaction });

        await MovementLogEntityItem.create({
          entity: 'romaneio',
          entityId: deliveryNote.id,
          quantity: 1,
          status: 'aberto',
          movementLogEntityId: movementLog.id,
          date: new Date()
        }, { transaction });
      }

      const totalQuantity = await Box.sum('totalQuantity', { where: { id: boxes }, transaction });
      await deliveryNote.update({ boxQuantity: boxes.length, totalQuantity }, { transaction });

      await transaction.commit();
      return res.status(201).json(deliveryNote);
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getByDay(req, res) {
  try {
    const { date } = req.query; // formato esperado: "YYYY-MM-DD"
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetro "date" é obrigatório (ex: 2025-10-17)'
      });
    }

    // Cria intervalo do dia (UTC)
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    // 🔒 Filtro de acesso baseado em companyId e branchId do contexto
    const { companyId, branchId } = req.context || {};

    const where = {
      createdAt: { [Op.between]: [startOfDay, endOfDay] },
      companyId,
      ...(branchId ? { branchId } : {})
    };

    const deliveryNotes = await DeliveryNote.findAll({
      where,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'companyId', 'branchId'],
          where: {
            companyId,
            ...(branchId ? { branchId } : {})
          },
          include: [
            { model: Company, as: 'company', attributes: ['id', 'name'] },
            { model: Branch, as: 'branch', attributes: ['id', 'name'] }
          ]
        },
        { model: Customer, as: 'customer', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json({ success: true, data: deliveryNotes });
  } catch (error) {
    console.error('Erro ao buscar DeliveryNotes por dia:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

  static async getByCompanyOrBranch(req, res) {
    try {
      const { companyId, branchId } = req.query;
      const deliveryNotes = await DeliveryNote.findAll({
        where: { [Op.or]: [{ companyId }, { branchId }] }
      });
      return res.json(deliveryNotes);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }


  // Atualiza um Delivery Note
  static async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;

      if (!id) return res.status(400).json({ success: false, message: 'ID do DeliveryNote não informado' });

      const { invoiceId, projectId, customerId, orderId, expeditionId, userId, boxes = [] } = req.body;

      // 🔍 Busca o DeliveryNote com validação de acesso via projeto
      const deliveryNote = await DeliveryNote.findOne({
        where: { id },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: DeliveryNoteController.projectAccessFilter(req)
          }
        ],
        transaction
      });

           

      if (!deliveryNote) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'DeliveryNote não encontrado ou sem permissão de acesso' });
      }

      await deliveryNote.update({
        invoiceId,
        projectId,
        customerId,
        orderId,
        expeditionId
      }, { transaction });

      // Pegar todas as caixas atualmente associadas
      const currentItems = await DeliveryNoteItem.findAll({ where: { deliveryNoteId: id }, transaction });
      const currentBoxIds = currentItems.map(item => item.boxId);

      // 1️⃣ Remover caixas que não foram enviadas pelo frontend
      const boxesToRemove = currentBoxIds.filter(bid => !boxes.includes(bid));

      if (boxesToRemove.length) {
        await DeliveryNoteItem.destroy({ where: { deliveryNoteId: id, boxId: boxesToRemove }, transaction });
        await Box.update({ deliveryNoteId: null }, { where: { id: boxesToRemove }, transaction });
      }

      // 2️⃣ Adicionar novas caixas enviadas pelo frontend
      const boxesToAdd = boxes.filter(bid => !currentBoxIds.includes(bid));

      for (const boxId of boxesToAdd) {
        await DeliveryNoteItem.create({ deliveryNoteId: id, boxId }, { transaction });
        await Box.update({ deliveryNoteId: id }, { where: { id: boxId }, transaction });
      }

      const updatedItems = await DeliveryNoteItem.findAll({ where: { deliveryNoteId: id }, transaction });
      const updatedBoxIds = updatedItems.map(item => item.boxId);

      const totalQuantity = updatedBoxIds.length
        ? await Box.sum('totalQuantity', { where: { id: updatedBoxIds }, transaction }) || 0
        : 0;

      await deliveryNote.update({ boxQuantity: updatedBoxIds.length, totalQuantity }, { transaction });

      const referralId = await generateReferralId({
        model: MovementLogEntity,
        transaction,
        companyId: deliveryNote.project.companyId,
      });

      // ✅ Criar movimentação
      let movementData = {
        id: uuidv4(),
        method: 'edição',
        entity: 'romaneio',
        entityId: deliveryNote.id,
        status: 'aberto',
        companyId: deliveryNote.project.companyId,
        branchId: deliveryNote.project.branchId || null,
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
      return res.json(deliveryNote);

    } catch (error) {
      await transaction.rollback();
      console.error('Erro no update do DeliveryNote:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Deleta um Delivery Note
  static async delete(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const deliveryNote = await DeliveryNote.findOne({
        where: { id },
        include: [
          { model: DeliveryNoteItem, as: 'items', attributes: ['id'] },
          {
            model: Project,
            as: 'project',
            attributes: ['companyId', 'branchId'],
            where: DeliveryNoteController.projectAccessFilter(req)
          }
        ],
        transaction
      });

           

      if (!deliveryNote) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'DeliveryNote não encontrado ou sem permissão de acesso' });
      }

      // ✅ Verifica se há vínculos diretos
      const hasLinkedItems = deliveryNote.items.length > 0;

      if (hasLinkedItems) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Não é possível deletar: existem vínculos com caixas'
        });
      }

      await deliveryNote.destroy({ transaction });

      const referralId = await generateReferralId({
        model: MovementLogEntity,
        transaction,
        companyId: deliveryNote.project.companyId,
      });

      // Cria movimentação de remoção
      let movementData = {
        id: uuidv4(),
        method: 'remoção',
        entity: 'romaneio',
        entityId: id,
        status: 'finalizado',
        companyId: deliveryNote.project.companyId,
        branchId: deliveryNote.project.branchId || null,
        referralId,
      };

      const user = await User.findByPk(userId);
      if (user) {
        movementData.userId = userId;
      } else {
        const account = await Account.findByPk(userId);
        if (account) {
          movementData.accountId = userId;
        } else {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'O ID informado não corresponde a um User ou Account válido'
          });
        }
      }

      await MovementLogEntity.create(movementData, { transaction });
      await transaction.commit();
      return res.json({ message: 'DeliveryNote deletado com sucesso' });

    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getAll(req, res) {
    try {
      const { projectId, customerId, branchId, term, fields } = req.query
      const where = {}

      if (projectId) where.projectId = projectId
      if (customerId) where.customerId = customerId

      // 🔍 Filtro de pesquisa textual
      if (term && fields) {
        const searchFields = fields.split(',')
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${term}%` }
        }))
      }

      const result = await buildQueryOptions(req, DeliveryNote, {
        where,
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: {
              ...DeliveryNoteController.projectAccessFilter(req),
              ...(branchId ? { branchId } : {}) // filtro pelo branchId do front
            },
            include: [
              { model: Company, as: 'company', attributes: ['name'] },
              { model: Branch, as: 'branch', attributes: ['name'] },
            ]
          },
          { model: Customer, as: 'customer', attributes: ['id', 'name'] }
        ],
        order: [['createdAt', 'DESC']],
        distinct: true
      })

      res.json({ success: true, ...result })
    } catch (error) {
      console.error('Erro ao buscar notas de entrega:', error)
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message })
    }
  }

  static async search(req, res) {
    try {
      const { term, fields } = req.query
      const where = {}

      // Filtro de pesquisa textual
      if (term && fields) {
        const searchFields = fields.split(',')
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${term}%` }
        }))
      }

      const result = await buildQueryOptions(req, DeliveryNote, {
        where,
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name'],
            where: {
              ...DeliveryNoteController.projectAccessFilter(req),
              ...(term && fields?.includes('project.name')
                ? { name: { [Op.iLike]: `%${term}%` } }
                : {})
            }
          },
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'name'],
            where: term && fields?.includes('customer.name')
              ? { name: { [Op.iLike]: `%${term}%` } }
              : undefined
          }
        ],
        order: [['createdAt', 'DESC']]
      })

      res.json({ success: true, ...result })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;

      const deliveryNote = await DeliveryNote.findOne({
        where: { id },
        include: [
          { model: Expedition, as: 'expedition', attributes: ['id'] },
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name'],
            where: DeliveryNoteController.projectAccessFilter(req),
            include: [{ model: Customer, as: 'customer', attributes: ['id', 'name'] }]
          },
          {
            model: Customer,
            as: 'customer',
            attributes: ['name', 'address', 'city', 'state', ['zip_code', 'zipcode'], 'country', 'phone']
          },
          {
            model: Box,
            as: 'boxes',
            include: [
              {
                model: BoxItem,
                as: 'items',
                include: [
                  { model: Item, as: 'item', attributes: ['id', 'name', 'weight'] },
                  {
                    model: OrderItem,
                    as: 'orderItem',
                    include: [{ model: FeatureOption, as: 'featureOption', attributes: ['name'] }]
                  },
                  {
                    model: ItemFeature,
                    as: 'itemFeature',
                    include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }]
                  },
                  { model: FeatureOption, as: 'featureOption', attributes: ['id', 'name'] }
                ]
              }
            ]
          }
        ]
      });

      if (!deliveryNote)
        return res.status(404).json({ error: 'Romaneio não encontrado ou sem permissão' });

      // 🔹 Pegar todos os IDs das caixas
      const boxIds = deliveryNote.boxes.map(b => b.id);

      // 🔹 Buscar último log de cada box
      const logs = await MovementLogEntity.findAll({
        where: {
          entity: 'caixa',
          entityId: { [Op.in]: boxIds }
        },
        attributes: ['entityId', 'status'],
        order: [['createdAt', 'DESC']]
      });

      const lastLogsMap = {};
      for (const log of logs) {
        if (!lastLogsMap[log.entityId]) lastLogsMap[log.entityId] = log.status;
      }

      // 🔹 Anexar lastMovementLog a cada box
      const boxesWithLogs = deliveryNote.boxes.map(box => ({
        ...box.toJSON(),
        lastMovementLog: lastLogsMap[box.id] || null
      }));

      const deliveryNoteWithLogs = {
        ...deliveryNote.toJSON(),
        boxes: boxesWithLogs
      };

      return res.json(deliveryNoteWithLogs);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getByInvoice(req, res) {
    try {
      const { invoiceId } = req.params

      const result = await buildQueryOptions(req, DeliveryNote, {
        where: { invoiceId },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: DeliveryNoteController.projectAccessFilter(req)
          },
          { model: Customer, as: 'customer', attributes: ['name'] }
        ]
      })

      res.json({ success: true, ...result })
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async getByCustomer(req, res) {
    try {
      const { customerId } = req.params

      const result = await buildQueryOptions(req, DeliveryNote, {
        where: { customerId },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: DeliveryNoteController.projectAccessFilter(req)
          }
        ]
      })

      res.json({ success: true, ...result })
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async getByOrder(req, res) {
    try {
      const { orderId } = req.params

      const result = await buildQueryOptions(req, DeliveryNote, {
        where: { orderId },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: DeliveryNoteController.projectAccessFilter(req)
          }
        ]
      })

      res.json({ success: true, ...result })
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async getByExpedition(req, res) {
    try {
      const { expeditionId } = req.params

      // 1️⃣ Busca os romaneios normalmente
      const result = await buildQueryOptions(req, DeliveryNote, {
        where: { expeditionId },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: DeliveryNoteController.projectAccessFilter(req)
          },
          {
            model: Box,
            as: 'boxes',
            include: [
              {
                model: BoxItem,
                as: 'items',
                include: [
                  {
                    model: OrderItem,
                    as: 'orderItem',
                    include: [
                      { model: FeatureOption, as: 'featureOption', attributes: ['name'] }
                    ]
                  },
                  { model: Item, as: 'item', attributes: ['name', 'price'] },
                  {
                    model: ItemFeature,
                    as: 'itemFeature',
                    include: [{ model: Feature, as: 'feature', attributes: ['name'] }]
                  }
                ]
              }
            ]
          },
          { model: Customer, as: 'customer', attributes: ['id', 'name'] },
        ],
      })

      const deliveryNoteIds = result.data.map(dn => dn.id)

      // 3️⃣ Busca o último log de cada romaneio
      const logs = await MovementLogEntity.findAll({
        where: {
          entity: 'romaneio',
          entityId: { [Op.in]: deliveryNoteIds },
        },
        attributes: ['entityId', 'status'],
        order: [['createdAt', 'DESC']],
      })

      // 4️⃣ Cria um map: entityId -> último log
      const lastLogs = {}
      for (const log of logs) {
        if (!lastLogs[log.entityId]) {
          lastLogs[log.entityId] = log
        }
      }

      // 5️⃣ Anexa o último log a cada DeliveryNote
      const enrichedRows = result.data.map(dn => ({
        ...dn.toJSON(),
        lastMovementLog: lastLogs[dn.id] || null,
      }))

      // 6️⃣ Substitui apenas o data e retorna o mesmo formato
      res.json({
        success: true,
        ...result,
        data: enrichedRows,
      })

    } catch (error) {
      console.error(error)
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async generatePDF(req, res) {
    try {
      const { id } = req.params;

      const deliveryNote = await DeliveryNote.findOne({
        where: { id },
        attributes: ['id', 'createdAt', 'referralId'],
        include: [
          {
            model: Invoice,
            as: 'invoice',
            attributes: ['referralId']
          },
          {
            model: Project,
            as: 'project',
            attributes: ['name'],
            where: DeliveryNoteController.projectAccessFilter(req),
            include: [
              {
                model: Customer,
                as: 'customer',
                attributes: ['id', 'name']
              }
            ]
          },
          {
            model: Company,
            as: 'company',
            attributes: [
              ['zip_code', 'zipcode'],
              'cnpj', 'address', 'city', 'state', 'country', 'email', 'phone', 'name', 'email', 'phone'
            ]
          },
          {
            model: Branch,
            as: 'branch',
            attributes: [
              ['zip_code', 'zipcode'],
              'cnpj', 'address', 'city', 'state', 'country', 'email', 'phone', 'name'
            ]
          },
          {
            model: Customer,
            as: 'customer',
            attributes: ['name', 'address', 'city', 'state', ['zip_code', 'zipcode'], 'country', 'phone']
          },
          {
            model: Expedition,
            as: 'expedition',
            attributes: ['referralId']
          },
          {
            model: DeliveryNoteItem,
            as: 'items',
            attributes: ['id'],
            include: [
              {
                model: Box,
                as: 'box',
                attributes: ['id', 'totalQuantity', 'referralId', 'orderReferralId'],
                include: [
                  {
                    model: Package,
                    as: 'package',
                    attributes: ['width', 'length', 'height']
                  },
                  {
                    model: BoxItem,
                    as: 'items',
                    attributes: ['id', 'quantity'],
                    include: [
                      {
                        model: Item,
                        as: 'item',
                        attributes: ['weight', 'name']
                      },
                      {
                        model: ItemFeature,
                        as: 'itemFeature',
                        attributes: ['id'],
                        include: [
                          { model: Feature, as: 'feature', attributes: ['name'] },
                        ]
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

      if (!deliveryNote) return res.status(404).json({ error: 'Romaneio não encontrado ou sem permissão' });

      let totalWeight = 0;
      (deliveryNote.items || []).forEach(i => {
        if (!i.box || !i.box.items) return;
        i.box.items.forEach(bi => {
          const itemWeight = bi.item?.weight || 0;
          totalWeight += bi.quantity * itemWeight;
        });
      });

      let totalVolume = 0; // m³

      (deliveryNote.items || []).forEach(i => {
        const pkg = i.box?.package;
        if (pkg && pkg.width && pkg.height && pkg.length) {
          totalVolume += (pkg.width * pkg.height * pkg.length) / 1_000_000; // cm³ → m³
        }
      });

      totalWeight = (totalWeight / 1000)

      const slimNote = {
        id: deliveryNote.id,
        createdAt: deliveryNote.createdAt,
        referralId: deliveryNote.referralId,
        totalWeight,
        totalVolume,
        invoice: deliveryNote.invoice
          ? { referralId: deliveryNote.invoice.referralId }
          : null,

        project: deliveryNote.project
          ? {
            name: deliveryNote.project.name,
            customer: deliveryNote.project.customer
              ? { id: deliveryNote.project.customer.id, name: deliveryNote.project.customer.name }
              : null
          }
          : null,

        company: deliveryNote.company
          ? {
            cnpj: deliveryNote.company.cnpj,
            address: deliveryNote.company.address,
            city: deliveryNote.company.city,
            state: deliveryNote.company.state,
            zipcode: deliveryNote.company.get('zipcode'),
            country: deliveryNote.company.country,
            name: deliveryNote.company.name,
            phone: deliveryNote.company.phone,
            email: deliveryNote.company.email,
          }
          : null,

        branch: deliveryNote.branch
          ? {
            cnpj: deliveryNote.branch.cnpj,
            address: deliveryNote.branch.address,
            city: deliveryNote.branch.city,
            state: deliveryNote.branch.state,
            zipcode: deliveryNote.branch.zipcode,
            country: deliveryNote.branch.country
          }
          : null,

        customer: deliveryNote.customer
          ? {
            name: deliveryNote.customer.name,
            address: deliveryNote.customer.address,
            city: deliveryNote.customer.city,
            state: deliveryNote.customer.state,
            zipcode: deliveryNote.customer.zipcode,
            country: deliveryNote.customer.country,
            phone: deliveryNote.customer.phone
          }
          : null,

        expedition: deliveryNote.expedition
          ? { referralId: deliveryNote.expedition.referralId }
          : null,

        items: (deliveryNote.items || []).map(i => ({
          box: i.box
            ? {
              totalQuantity: i.box.totalQuantity,
              referralId: i.box.referralId,
              orderReferralId: i.box.orderReferralId,
              items: (i.box.items || []).map(bi => ({
                quantity: bi.quantity,
                item: bi.item?.name,
                itemFeature: bi.itemFeature
                  ? {
                    feature: bi.itemFeature.feature
                      ? { name: bi.itemFeature.feature.name }
                      : null,
                    featureOption: bi.featureOption
                      ? { name: bi.featureOption.name }
                      : null
                  }
                  : null
              }))
            }
            : null
        }))
      };

      res.json({ success: true, data: slimNote })

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  static async generateLabels(req, res) {
    try {
      const { id } = req.params;

      // Buscar romaneio com caixas e itens
      const deliveryNote = await DeliveryNote.findOne({
        where: { id },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: DeliveryNoteController.projectAccessFilter(req)
          },
          {
            model: DeliveryNoteItem,
            as: 'items',
            include: [
              {
                model: Box,
                as: 'box',
                include: [
                  {
                    model: BoxItem,
                    as: 'items',
                    include: [
                      { model: Item, as: 'item', attributes: ['name'] },
                      { model: ItemFeature, as: 'itemFeature', include: [{ model: Feature, as: 'feature', attributes: ['name'] }] },
                      { model: FeatureOption, as: 'featureOption', attributes: ['name'] }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      });

      if (!deliveryNote) return res.status(404).json({ error: 'Romaneio não encontrado ou sem permissão' });

      const slimNote = {
        items: (deliveryNote.items || []).map(dnItem => ({
          box: dnItem.box
            ? {
              referralId: dnItem.box.referralId,
              totalQuantity: dnItem.box.totalQuantity,
              items: (dnItem.box.items || []).map(bi => ({
                quantity: bi.quantity,
                item: bi.item?.name,
                itemFeature: bi.itemFeature
                  ? { feature: bi.itemFeature.feature?.name, featureOption: bi.featureOption?.name }
                  : null
              }))
            }
            : null
        }))
      };

      res.json({ success: true, data: slimNote })

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

}

export default DeliveryNoteController;