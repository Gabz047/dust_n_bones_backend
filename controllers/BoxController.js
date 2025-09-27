import { v4 as uuidv4 } from 'uuid';
import { sequelize, Box, BoxItem, DeliveryNote, Project, Customer, Order, Package, User, MovementLogEntity, StockItem, Stock, Item } from '../models/index.js';

class BoxController {

  // Helper para adicionar o último log em uma lista de boxes
  static async attachLastLog(boxes) {
  return Promise.all(boxes.map(async (box) => {
    // Último log
    const lastLog = await MovementLogEntity.findOne({
      where: { entity: 'caixa', entityId: box.id },
      order: [['createdAt', 'DESC']]
    });

    // Calcula peso total
    const boxItems = await BoxItem.findAll({
      where: { boxId: box.id },
      include: [{ model: Item, as: 'item' }] // precisa garantir o include Item no BoxItem model
    });

    const totalWeight = boxItems.reduce((sum, bi) => {
      const itemWeight = bi.item?.weight || 0;
      console.log('PESSOSOOOO',itemWeight, '-', bi.quantity, 'soma:', itemWeight * bi.quantity)
      
      return sum + (bi.quantity * itemWeight);
    }, 0);

    return { 
      ...box.toJSON(), 
      lastMovementLog: lastLog, 
      totalWeight 
    };
  }));
}

  // Cria um novo Box
  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { deliveryNoteId, projectId, customerId, orderId, packageId, userId } = req.body;

      // Validações
      const deliveryNote = await DeliveryNote.findByPk(deliveryNoteId);
      if (!deliveryNote && deliveryNote != null) return res.status(400).json({ success: false, message: 'Delivery Note não encontrada' });

      const project = await Project.findByPk(projectId);
      if (!project) return res.status(400).json({ success: false, message: 'Projeto não encontrado' });

      const customer = await Customer.findByPk(customerId);
      if (!customer) return res.status(400).json({ success: false, message: 'Cliente não encontrado' });

      const order = await Order.findByPk(orderId);
      if (!order) return res.status(400).json({ success: false, message: 'Pedido não encontrado' });

      const packageObj = await Package.findByPk(packageId);
      if (!packageObj) return res.status(400).json({ success: false, message: 'Embalagem não encontrada' });

      const user = await User.findByPk(userId);
      if (!user) return res.status(400).json({ success: false, message: 'Usuário não encontrado' });

      // Cria o Box
      const box = await Box.create({
        id: uuidv4(),
        deliveryNoteId,
        projectId,
        customerId,
        orderId,
        packageId,
        userId,
        qtdTotal: 0
      }, { transaction });

      // Cria log de movimentação
      const lastLog = await MovementLogEntity.create({
        id: uuidv4(),
        entity: 'caixa',
        entityId: box.id,
        method: 'criação',
        status: 'aberto',
        userId
      }, { transaction });

      // Atualiza qtdTotal baseado nos BoxItems (se houver)
      const boxItems = await BoxItem.findAll({ where: { boxId: box.id }, transaction });
      const totalQty = boxItems.reduce((sum, item) => sum + item.quantity, 0);
      await box.update({ qtdTotal: totalQty }, { transaction });

      await transaction.commit();
      return res.status(201).json({ success: true, data: { ...box.toJSON(), lastMovementLog: lastLog } });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar Box:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Atualiza um Box existente
  static async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const updates = req.body;

      const box = await Box.findByPk(id);
      if (!box) return res.status(404).json({ success: false, message: 'Box não encontrado' });

      // Validações opcionais
      if (updates.deliveryNoteId && !await DeliveryNote.findByPk(updates.deliveryNoteId))
        return res.status(400).json({ success: false, message: 'Delivery Note não encontrada' });

      if (updates.projectId && !await Project.findByPk(updates.projectId))
        return res.status(400).json({ success: false, message: 'Projeto não encontrado' });

      if (updates.customerId && !await Customer.findByPk(updates.customerId))
        return res.status(400).json({ success: false, message: 'Cliente não encontrado' });

      if (updates.orderId && !await Order.findByPk(updates.orderId))
        return res.status(400).json({ success: false, message: 'Pedido não encontrado' });

      if (updates.packageId && !await Package.findByPk(updates.packageId))
        return res.status(400).json({ success: false, message: 'Embalagem não encontrada' });

      if (updates.userId && !await User.findByPk(updates.userId))
        return res.status(400).json({ success: false, message: 'Usuário não encontrado' });

      // Atualiza o Box
      await box.update(updates, { transaction });

      // Cria log de movimentação
      const lastLog = await MovementLogEntity.create({
        id: uuidv4(),
        entity: 'caixa',
        entityId: box.id,
        method: 'edição',
        status: 'aberto',
        userId: updates.userId || box.userId
      }, { transaction });

      // Atualiza qtdTotal
      const boxItems = await BoxItem.findAll({ where: { boxId: box.id }, transaction });
      const totalQty = boxItems.reduce((sum, item) => sum + item.quantity, 0);
      await box.update({ qtdTotal: totalQty }, { transaction });

      await transaction.commit();
      return res.status(200).json({ success: true, data: { ...box.toJSON(), lastMovementLog: lastLog } });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao atualizar Box:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Deleta um Box
  // Deleta um Box
static async delete(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const box = await Box.findByPk(id);
    if (!box) return res.status(404).json({ success: false, message: 'Box não encontrado' });

    // Pega todos os BoxItems dessa caixa
    const boxItems = await BoxItem.findAll({ where: { boxId: id }, transaction });

    // Para cada BoxItem, devolve a quantidade pro estoque
    for (const bi of boxItems) {
      const stockItem = await StockItem.findOne({
        where: {
          itemId: bi.itemId,
          itemFeatureId: bi.itemFeatureId,
          featureOptionId: bi.featureOptionId
        },
        transaction
      });
      if (stockItem) {
        await stockItem.update({ quantity: stockItem.quantity + bi.quantity }, { transaction });
      }
    }

    // Cria log de movimentação
    const lastLog = await MovementLogEntity.create({
      id: uuidv4(),
      entity: 'caixa',
      entityId: box.id,
      method: 'remoção',
      status: 'aberto',
      userId: box.userId
    }, { transaction });

    // Deleta os BoxItems
    await BoxItem.destroy({ where: { boxId: id }, transaction });

    // Deleta o Box
    await box.destroy({ transaction });

    await transaction.commit();
    return res.status(200).json({ success: true, message: 'Box removido com sucesso', lastMovementLog: lastLog });

  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao deletar Box:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}


  // Lista todos os Boxes
  static async getAll(req, res) {
    try {
      const boxes = await Box.findAll({
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
          { model: User, as: 'user' }
        ],
        order: [['createdAt', 'DESC']]
      });

      const boxesWithLastLog = await BoxController.attachLastLog(boxes);
      return res.json({ success: true, data: boxesWithLastLog });
    } catch (error) {
      console.error('Erro ao listar Boxes:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Busca Box por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const box = await Box.findByPk(id, {
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
          { model: User, as: 'user' }
        ]
      });
      if (!box) return res.status(404).json({ success: false, message: 'Box não encontrado' });

      const lastLog = await MovementLogEntity.findOne({
        where: { entity: 'caixa', entityId: box.id },
        order: [['createdAt', 'DESC']]
      });

      return res.json({ success: true, data: { ...box.toJSON(), lastMovementLog: lastLog } });
    } catch (error) {
      console.error('Erro ao buscar Box por ID:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Filtros reutilizando attachLastLog
  static async getByDeliveryNote(req, res) {
    try {
      const { deliveryNoteId } = req.params;
      const boxes = await Box.findAll({
        where: { deliveryNoteId },
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
          { model: User, as: 'user' }
        ]
      });

      const boxesWithLastLog = await BoxController.attachLastLog(boxes);
      return res.json({ success: true, data: boxesWithLastLog });
    } catch (error) {
      console.error('Erro ao buscar Boxes por deliveryNoteId:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getByProject(req, res) {
    try {
      const { projectId } = req.params;
      const boxes = await Box.findAll({
        where: { projectId },
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
          { model: User, as: 'user' }
        ]
      });

      const boxesWithLastLog = await BoxController.attachLastLog(boxes);
      return res.json({ success: true, data: boxesWithLastLog });
    } catch (error) {
      console.error('Erro ao buscar Boxes por projectId:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getByCustomer(req, res) {
    try {
      const { customerId } = req.params;
      const boxes = await Box.findAll({
        where: { customerId },
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
          { model: User, as: 'user' }
        ]
      });

      const boxesWithLastLog = await BoxController.attachLastLog(boxes);
      return res.json({ success: true, data: boxesWithLastLog });
    } catch (error) {
      console.error('Erro ao buscar Boxes por customerId:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getByOrder(req, res) {
    try {
      const { orderId } = req.params;
      const boxes = await Box.findAll({
        where: { orderId },
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
          { model: User, as: 'user' }
        ]
      });

      const boxesWithLastLog = await BoxController.attachLastLog(boxes);
      return res.json({ success: true, data: boxesWithLastLog });
    } catch (error) {
      console.error('Erro ao buscar Boxes por orderId:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getByPackage(req, res) {
    try {
      const { packageId } = req.params;
      const boxes = await Box.findAll({
        where: { packageId },
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
          { model: User, as: 'user' }
        ]
      });

      const boxesWithLastLog = await BoxController.attachLastLog(boxes);
      return res.json({ success: true, data: boxesWithLastLog });
    } catch (error) {
      console.error('Erro ao buscar Boxes por packageId:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getByUser(req, res) {
    try {
      const { userId } = req.params;
      const boxes = await Box.findAll({
        where: { userId },
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
          { model: User, as: 'user' }
        ]
      });

      const boxesWithLastLog = await BoxController.attachLastLog(boxes);
      return res.json({ success: true, data: boxesWithLastLog });
    } catch (error) {
      console.error('Erro ao buscar Boxes por userId:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  static async getByDate(req, res) {
    try {
      const { date } = req.params;
      const boxes = await Box.findAll({
        where: sequelize.where(sequelize.fn('DATE', sequelize.col('createdAt')), date),
        include: [
          { model: DeliveryNote, as: 'deliveryNote' },
          { model: Project, as: 'project' },
          { model: Customer, as: 'customer' },
          { model: Order, as: 'order' },
          { model: Package, as: 'package' },
          { model: User, as: 'user' }
        ]
      });

      const boxesWithLastLog = await BoxController.attachLastLog(boxes);
      return res.json({ success: true, data: boxesWithLastLog });
    } catch (error) {
      console.error('Erro ao buscar Boxes por data:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

}

export default BoxController;
