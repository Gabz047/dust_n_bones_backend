import { sequelize, DeliveryNote, DeliveryNoteItem, MovementLogEntity, MovementLogEntityItem, Box, BoxItem, OrderItem, FeatureOption, Item, ItemFeature, Feature, Invoice, Company, Branch, Project, Order, Customer, Expedition, Package, User, InvoiceItem, Stock, StockItem, ItemFeatureOption } from '../models/index.js';
import { generateDeliveryNotePDF } from '../services/generate-pdf/delivery-note/delivery-note-pdf.js';
import { generateLabelsZPL } from '../services/generate-pdf/delivery-note/box-label-pdf.js';
import { Op } from 'sequelize';

class DeliveryNoteController {

  // Cria um novo Delivery Note
  // Cria um novo Delivery Note
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { invoiceId, projectId, companyId, branchId, customerId, orderId, expeditionId, userId, boxes } = req.body;

      const deliveryNote = await DeliveryNote.create({
        invoiceId,
        projectId,
        companyId: companyId || null,
        branchId: branchId || (companyId ? null : /* pegar branch do user */ null),
        customerId,
        orderId,
        expeditionId,
        totalQuantity: 0,
        boxQuantity: 0
      }, { transaction });

      const movementLog = await MovementLogEntity.create({
        userId,
        method: 'criação',
        entity: 'romaneio',
        entityId: deliveryNote.id,
        status: 'finalizado'
      }, { transaction });

      // Associa as caixas ao DeliveryNote
      for (const boxId of boxes) {
        // Cria item no romaneio
        await DeliveryNoteItem.create(
          { deliveryNoteId: deliveryNote.id, boxId },
          { transaction }
        );

        // Atualiza a caixa para apontar pro romaneio
        await Box.update(
          { deliveryNoteId: deliveryNote.id },
          { where: { id: boxId }, transaction }
        );

        // Log de movimentação
        await MovementLogEntityItem.create({
          entity: 'romaneio',
          entityId: deliveryNote.id,
          quantity: 1,
          movementLogEntityId: movementLog.id,
          date: new Date()
        }, { transaction });
      }

      // Atualiza totais
      const totalQuantity = await Box.sum('totalQuantity', {
        where: { id: boxes },
        transaction
      });
      await deliveryNote.update(
        { boxQuantity: boxes.length, totalQuantity },
        { transaction }
      );

      await transaction.commit();
      return res.status(201).json(deliveryNote);
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  // Atualiza um Delivery Note
  // Atualiza um Delivery Note
  // Atualiza um Delivery Note
  static async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { invoiceId, projectId, companyId, branchId, customerId, orderId, expeditionId, userId, boxes = [] } = req.body;

      const deliveryNote = await DeliveryNote.findByPk(id, { transaction });
      if (!deliveryNote) return res.status(404).json({ error: 'DeliveryNote não encontrado' });

      // Atualiza campos básicos
      await deliveryNote.update({
        invoiceId,
        projectId,
        companyId,
        branchId,
        customerId,
        orderId,
        expeditionId
      }, { transaction });

      // Pegar todas as caixas atualmente associadas
      const currentItems = await DeliveryNoteItem.findAll({
        where: { deliveryNoteId: id },
        transaction
      });
      const currentBoxIds = currentItems.map(item => item.boxId);

      // 1️⃣ Remover caixas que não foram enviadas pelo frontend
      const boxesToRemove = currentBoxIds.filter(bid => !boxes.includes(bid));
      if (boxesToRemove.length) {
        await DeliveryNoteItem.destroy({
          where: { deliveryNoteId: id, boxId: boxesToRemove },
          transaction
        });

        // Atualiza o deliveryNoteId das caixas removidas para null
        await Box.update(
          { deliveryNoteId: null },
          { where: { id: boxesToRemove }, transaction }
        );
      }

      // 2️⃣ Adicionar novas caixas enviadas pelo frontend
      const boxesToAdd = boxes.filter(bid => !currentBoxIds.includes(bid));
      for (const boxId of boxesToAdd) {
        await DeliveryNoteItem.create({ deliveryNoteId: id, boxId }, { transaction });

        // Atualiza o deliveryNoteId da caixa adicionada
        await Box.update(
          { deliveryNoteId: id },
          { where: { id: boxId }, transaction }
        );
      }

      // Rebuscar todas as caixas após adições/removidas
      const updatedItems = await DeliveryNoteItem.findAll({
        where: { deliveryNoteId: id },
        transaction
      });
      const updatedBoxIds = updatedItems.map(item => item.boxId);

      // Recalcular totais
      const totalQuantity = updatedBoxIds.length
        ? await Box.sum('totalQuantity', { where: { id: updatedBoxIds }, transaction }) || 0
        : 0;

      await deliveryNote.update({
        boxQuantity: updatedBoxIds.length,
        totalQuantity
      }, { transaction });

      // Criar movimentação
      await MovementLogEntity.create({
        userId,
        method: 'edição',
        entity: 'romaneio',
        entityId: deliveryNote.id,
        status: 'finalizado'
      }, { transaction });

      await transaction.commit();
      return res.json(deliveryNote);
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }



  // Deleta um Delivery Note
  static async delete(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const deliveryNote = await DeliveryNote.findByPk(id);
      if (!deliveryNote) return res.status(404).json({ error: 'DeliveryNote não encontrado' });

      await deliveryNote.destroy({ transaction });

      // Cria movimentação
      await MovementLogEntity.create({
        userId,
        method: 'remoção',
        entity: 'romaneio',
        entityId: id,
        status: 'finalizado'
      }, { transaction });

      await transaction.commit();
      return res.json({ message: 'DeliveryNote deletado com sucesso' });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }




  static async getAll(req, res) {
    try {
      const { companyId, branchId } = req.context;
      const deliveryNotes = await DeliveryNote.findAll({
        where: {
          [Op.or]: [
            { companyId: companyId || null },
            { branchId: branchId || null }
          ]
        },
        include: [
          { model: Project, as: 'project', attributes: ['id', 'name'] },
          { model: Customer, as: 'customer', attributes: ['id', 'name'] }
        ]
      });
      return res.json(deliveryNotes);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }


  static async getById(req, res) {
    try {
      const { id } = req.params;
      const { companyId, branchId } = req.context;

      const deliveryNote = await DeliveryNote.findOne({
        where: {
          id,
          [Op.or]: [
            { companyId: companyId || null },
            { branchId: branchId || null }
          ]
        },
        include: [
          {
            model: Expedition,
            as: 'expedition',
            attributes: ['id']
          },
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name'],
            include: [
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
            attributes: ['id', 'name', 'address', 'city', 'state', ['zip_code', 'zipcode'], 'country', 'phone']
          },
          {
            model: Box,
            as: 'boxes',
            attributes: ['id', 'referralId', 'totalQuantity'],
            include: [
              {
                model: BoxItem,
                as: 'items',
                attributes: ['id', 'quantity'],
                include: [
                  { model: Item, as: 'item', attributes: ['id', 'name', 'weight'] },
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
        return res.status(404).json({ error: 'DeliveryNote não encontrado ou sem permissão' });

      return res.json(deliveryNote);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getByInvoice(req, res) {
    try {
      const { invoiceId } = req.params;
      const { companyId, branchId } = req.context;

      const deliveryNotes = await DeliveryNote.findAll({
        where: {
          invoiceId,
          [Op.or]: [
            { companyId: companyId || null },
            { branchId: branchId || null }
          ]
        },
        include: [{ model: Customer, as: 'customer', attributes: ['name'] }]
      });
      return res.json(deliveryNotes);
    } catch (error) {
      return res.status(500).json({ error: error.message });
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

  static async getByCustomer(req, res) {
    try {
      const { customerId } = req.params;
      const { companyId, branchId } = req.context;

      const deliveryNotes = await DeliveryNote.findAll({
        where: {
          customerId,
          [Op.or]: [
            { companyId: companyId || null },
            { branchId: branchId || null }
          ]
        }
      });
      return res.json(deliveryNotes);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getByOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { companyId, branchId } = req.context;

      const deliveryNotes = await DeliveryNote.findAll({
        where: {
          orderId,
          [Op.or]: [
            { companyId: companyId || null },
            { branchId: branchId || null }
          ]
        }
      });
      return res.json(deliveryNotes);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }


  static async getByExpedition(req, res) {
    try {
      const { expeditionId } = req.params;
      const { companyId, branchId } = req.context;

      const deliveryNotes = await DeliveryNote.findAll({
        where: {
          expeditionId,
          [Op.or]: [
            { companyId: companyId || null },
            { branchId: branchId || null }
          ]
        },
        include: [
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
                    include: [{ model: FeatureOption, as: 'featureOption', attributes: ['name'] }]
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
          { model: Customer, as: 'customer', attributes: ['id', 'name'] }
        ]
      });

      return res.json(deliveryNotes);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async generatePDF(req, res) {
    try {
      const { id } = req.params;

      const deliveryNote = await DeliveryNote.findByPk(id, {
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
                attributes: ['id', 'totalQuantity', 'referralId'],
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

      console.log(deliveryNote.company)

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


      if (!deliveryNote) return res.status(404).json({ error: 'Romaneio não encontrado' });
      res.json({ success: true, data: slimNote })

      // await generateDeliveryNotePDF(slimNote, res);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  static async generateLabels(req, res) {
    try {
      const { id } = req.params;

      // Buscar romaneio com caixas e itens
      const deliveryNote = await DeliveryNote.findByPk(id, {
        include: [
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

      if (!deliveryNote) return res.status(404).json({ error: 'Romaneio não encontrado' });

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

      // const zpl = generateLabelsZPL(slimNote);
      res.json({ success: true, data: slimNote })
      // console.log(zpl)

      // res.setHeader('Content-Type', 'text/plain'); // Zebra aceita plain/text
      // res.send(zpl);

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }


  //   static async generatePDF(req, res) {
  //   try {
  //     generateDeliveryNotePDF(res);
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ error: error.message });
  //   }
  // }

}

export default DeliveryNoteController;
