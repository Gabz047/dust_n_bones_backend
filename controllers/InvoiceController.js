import { sequelize, Invoice, DeliveryNote, MovementLogEntity } from '../models/index.js';
import { Op } from 'sequelize';

class InvoiceController {

  // Cria uma nova fatura
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { projectId, type, totalPrice, userId } = req.body;

      if (!projectId || !type || !userId) {
        return res.status(400).json({ error: 'projectId, type e userId são obrigatórios' });
      }

      // Validação: projeto não pode ter fatura já existente
      const existingInvoice = await Invoice.findOne({ where: { projectId }, transaction });
      if (existingInvoice) {
        return res.status(400).json({ error: 'Este projeto já possui uma fatura vinculada' });
      }

      // Validação: nenhum romaneio do projeto pode ter fatura vinculada
      const linkedDN = await DeliveryNote.findOne({
        where: { projectId, invoiceId: { [Op.ne]: null } },
        transaction
      });
      if (linkedDN) {
        return res.status(400).json({ error: 'Existe um romaneio deste projeto vinculado a uma fatura' });
      }

      const invoice = await Invoice.create({
        projectId,
        type,
        totalPrice: totalPrice || 0
      }, { transaction });

      // Cria movimentação
      await MovementLogEntity.create({
        entity: 'fatura',
        entityId: invoice.id,
        method: 'criação',
        status: 'aberto',
        userId,
        date: new Date()
      }, { transaction });

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
      const { totalPrice, userId } = req.body;

      const invoice = await Invoice.findByPk(id, { transaction });
      if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada' });

      await invoice.update({ totalPrice }, { transaction });

      await MovementLogEntity.create({
        entity: 'fatura',
        entityId: invoice.id,
        method: 'edição',
        status: 'aberto',
        userId,
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
      const invoices = await Invoice.findAll();
      return res.json(invoices);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca fatura por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const invoice = await Invoice.findByPk(id);
      if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada' });
      return res.json(invoice);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca faturas por projeto
  static async getByProject(req, res) {
    try {
      const { projectId } = req.params;
      const invoices = await Invoice.findAll({ where: { projectId } });
      return res.json(invoices);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Busca faturas por tipo
  static async getByType(req, res) {
    try {
      const { type } = req.params;
      const invoices = await Invoice.findAll({ where: { type } });
      return res.json(invoices);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export default InvoiceController;
