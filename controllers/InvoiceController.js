import { sequelize, Invoice, DeliveryNote, MovementLogEntity, Project, InvoiceItem, Box, BoxItem, ItemFeature, Item, FeatureOption, Feature, Order, Customer, OrderItem, MovementLogEntityItem, Company, Branch, DeliveryNoteItem, } from '../models/index.js';
import { calculateQuantityAndPrice } from '../utils/invoice.js';
import { generateInvoicePDF } from '../services/generate-pdf/invoice/invoice-pdf.js';
import { Op } from 'sequelize';

class InvoiceController {

  // Cria uma nova fatura
  // dentro do InvoiceController
  // Cria uma nova fatura
static async create(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { projectId, type, userId, companyId, branchId } = req.body;
    if (!projectId || !type || !userId) {
      return res.status(400).json({ error: 'projectId, type e userId são obrigatórios' });
    }

    // Verifica se já existe fatura para o projeto
    const existingInvoice = await Invoice.findOne({ where: { projectId }, transaction });
    if (existingInvoice) return res.status(400).json({ error: 'Este projeto já possui uma fatura vinculada' });

    // Verifica se há romaneio já vinculado a outra fatura
    const linkedDN = await DeliveryNote.findOne({
      where: { projectId, invoiceId: { [Op.ne]: null } },
      transaction
    });
    if (linkedDN) return res.status(400).json({ error: 'Existe um romaneio deste projeto vinculado a uma fatura' });

    // Cria a fatura
    const invoice = await Invoice.create({
      projectId,
      type,
      totalPrice: 0,
      companyId: companyId || null,
      branchId: branchId || (companyId ? null : null),
    }, { transaction });

    // Cria o movimento da fatura
    const movementLog = await MovementLogEntity.create({
      entity: 'fatura',
      entityId: invoice.id,
      method: 'criação',
      status: 'aberto',
      userId,
      date: new Date()
    }, { transaction });

    let totalInvoicePrice = 0;

    // Só cria InvoiceItems automaticamente se o tipo for "project"
    if (type === 'project') {
      // Busca todos os romaneios do projeto
      const deliveryNotes = await DeliveryNote.findAll({ where: { projectId }, transaction });

      for (const dn of deliveryNotes) {
        const { totalQuantity, totalPrice } = await calculateQuantityAndPrice(dn.id, transaction);

        const invoiceItem = await InvoiceItem.create({
          invoiceId: invoice.id,
          deliveryNoteId: dn.id,
          orderId: dn.orderId || null,
          price: totalPrice
        }, { transaction });

        // Cria log dos itens
        await MovementLogEntityItem.create({
          movementLogEntityId: movementLog.id,
          entity: 'fatura',
          entityId: invoiceItem.id,
          quantity: totalQuantity,
          date: new Date()
        }, { transaction });

        // Atualiza o romaneio com a fatura
        await DeliveryNote.update(
          { invoiceId: invoice.id },
          { where: { id: dn.id }, transaction }
        );

        totalInvoicePrice += totalPrice;
      }
    }

    // Atualiza a fatura com o total calculado (se não for project, fica 0)
    await invoice.update({ totalPrice: totalInvoicePrice }, { transaction });

    await transaction.commit();
    return res.status(201).json(invoice);
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ error: error.message });
  }
}


  // Atualiza fatura existente
  static async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { totalPrice, userId, companyId, branchId } = req.body;

      const invoice = await Invoice.findByPk(id, { transaction });
      if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada' });

      await invoice.update({ totalPrice }, { transaction });

      const deliveryNotes = await DeliveryNote.findAll({ where: { invoiceId: invoice.id }, transaction });
      for (const dn of deliveryNotes) {
        await dn.update({ invoiceId: invoice.id }, { transaction });
      }

      await MovementLogEntity.create({
        entity: 'fatura',
        entityId: invoice.id,
        method: 'edição',
        status: 'aberto',
        userId,
        companyId,
        branchId,
        date: new Date()
      }, { transaction });

      await transaction.commit();
      return res.json(invoice);
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  // Deleta fatura
  static async delete(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const invoice = await Invoice.findByPk(id, { transaction });
      if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada' });

      await invoice.destroy({ transaction });

      await MovementLogEntity.create({
        entity: 'fatura',
        entityId: id,
        method: 'remoção',
        status: 'aberto',
        userId,
        date: new Date()
      }, { transaction });

      await transaction.commit();
      return res.json({ message: 'Fatura deletada com sucesso' });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca todas as faturas
  static async getAll(req, res) {
    try {
      const invoices = await Invoice.findAll({
        attributes: ['id', 'projectId', 'type', 'totalPrice'],
        include: [
          { model: Project, as: 'project', attributes: ['id', 'name'] },
          { model: DeliveryNote, as: 'deliveryNotes', attributes: ['id', 'referralId'] }
        ]
      });

      const result = await Promise.all(
        invoices.map(async inv => {
          const lastMovement = await MovementLogEntity.findOne({
            where: { entity: 'fatura', entityId: inv.id },
            order: [['date', 'DESC']],
            attributes: ['id']
          });
          return { ...inv.toJSON(), lastMovementLogEntityId: lastMovement ? lastMovement.id : null };
        })
      );

      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca fatura por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const invoice = await Invoice.findByPk(id, {
        attributes: ['id', 'projectId', 'type', 'totalPrice'],
        include: [
          { model: Project, as: 'project', attributes: ['id', 'name'] },
          { model: DeliveryNote, as: 'deliveryNotes', attributes: ['id', 'referralId'] }
        ]
      });

      if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada' });

      const lastMovement = await MovementLogEntity.findOne({
        where: { entity: 'fatura', entityId: id },
        order: [['date', 'DESC']],
        attributes: ['id']
      });

      return res.json({ ...invoice.toJSON(), lastMovementLogEntityId: lastMovement ? lastMovement.id : null });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca faturas por projeto
  static async getByProject(req, res) {
    try {
      const { projectId } = req.params;
      const invoices = await Invoice.findAll({
        where: { projectId },
        attributes: ['id', 'projectId', 'type', 'totalPrice'],
        include: [
          { model: Project, as: 'project', attributes: ['id', 'name'] },
          { model: DeliveryNote, as: 'deliveryNotes', attributes: ['id', 'referralId'] }
        ]
      });

      const result = await Promise.all(
        invoices.map(async inv => {
          const lastMovement = await MovementLogEntity.findOne({
            where: { entity: 'fatura', entityId: inv.id },
            order: [['date', 'DESC']],
            attributes: ['id']
          });
          return { ...inv.toJSON(), lastMovementLogEntityId: lastMovement ? lastMovement.id : null };
        })
      );

      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca faturas por tipo
  static async getByType(req, res) {
    try {
      const { type } = req.params;
      const invoices = await Invoice.findAll({
        where: { type },
        attributes: ['id', 'projectId', 'type', 'totalPrice'],
        include: [
          { model: Project, as: 'project', attributes: ['id', 'name'] },
          { model: DeliveryNote, as: 'deliveryNotes', attributes: ['id', 'referralId'] }
        ]
      });

      const result = await Promise.all(
        invoices.map(async inv => {
          const lastMovement = await MovementLogEntity.findOne({
            where: { entity: 'fatura', entityId: inv.id },
            order: [['date', 'DESC']],
            attributes: ['id']
          });
          return { ...inv.toJSON(), lastMovementLogEntityId: lastMovement ? lastMovement.id : null };
        })
      );

      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async generatePDF(req, res) {
    try {
      const { id } = req.params;

      const invoice = await Invoice.findByPk(id, {
        attributes: ['id', 'createdAt', 'totalPrice', 'type'],
        include: [
          { model: Project, as: 'project', attributes: ['id', 'name'], include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'address', 'city', 'state', ['zip_code', 'zipcode'], 'country', 'document'] }] },
          { model: Company, as: 'company', attributes: ['id', 'name', 'cnpj', 'email', 'phone', 'address', 'city', 'state', ['zip_code', 'zipcode'], 'country'] },
          { model: Branch, as: 'branch', attributes: ['id', 'name', 'cnpj', 'email', 'phone', 'address', 'city', 'state', ['zip_code', 'zipcode'], 'country'] },
          {
            model: DeliveryNote, as: 'deliveryNotes', attributes: ['id', 'referralId'], include: [
              { model: Customer, as: 'customer', attributes: ['id', 'name'] },
              {
                model: Box, as: 'boxes', include: [
                  {
                    model: BoxItem, as: 'items', include: [
                      { model: Item, as: 'item', attributes: ['id', 'name', 'price'] },
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

      if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada' });
      console.log(invoice.deliveryNotes[0])
      const slimInvoice = {
        id: invoice.id,
        issueDate: invoice.createdAt,
        totalPrice: invoice.totalPrice,
        type: invoice.type,
        company: invoice.company ? { name: invoice.company.name, cnpj: invoice.company.cnpj, email: invoice.company.email, phone: invoice.company.phone, address: invoice.company.address, city: invoice.company.city, state: invoice.company.state, zipcode: invoice.company.get('zipcode'), country: invoice.company.country } : null,
        branch: invoice.branch ? { name: invoice.branch.name, cnpj: invoice.branch.cnpj, email: invoice.branch.email, phone: invoice.branch.phone, address: invoice.branch.address, city: invoice.branch.city, state: invoice.branch.state, zipcode: invoice.branch.get('zipcode'), country: invoice.branch.country } : null,
        project: invoice.project ? {
          id: invoice.project.id,
          name: invoice.project.name,
          customer: invoice.project.customer ? { id: invoice.project.customer.id, name: invoice.project.customer.name, address: invoice.project.customer.address, city: invoice.project.customer.city, state: invoice.project.customer.state, zipcode: invoice.project.customer.get('zipcode'), country: invoice.project.customer.country, document: invoice.project.customer.document } : null
        } : null,
        deliveryNotes: (invoice.deliveryNotes || []).map(dn => {
          let dnTotal = 0;
          const itemsMap = {}; // Mapa temporário para agrupar itens

          (dn.boxes || []).forEach(box => {
  (box.items || []).forEach(bi => {
    // Se bi.itemFeature for array, percorre todos
    const features = Array.isArray(bi.itemFeature) ? bi.itemFeature : [bi.itemFeature];
    
    features.forEach(f => {
      // Cada feature pode ter uma featureOption
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
            items: Object.values(itemsMap) // Converte o map em array
          };
        })

      };

      await generateInvoicePDF(slimInvoice, res);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }



}

export default InvoiceController;
