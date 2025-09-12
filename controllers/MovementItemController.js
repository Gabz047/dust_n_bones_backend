import { MovementItem, StockItem, StockAdditionalItem, Stock, ProductionOrder, Item, ItemFeature, FeatureOption, Feature } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.js';

class MovementItemController {

    // Criar único MovementItem
    static async create(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { movementId, itemId, itemFeatureId, quantity, additionalFeatures, productionOrderId, featureOptionId } = req.body;

            if (!movementId || !itemId || !itemFeatureId || typeof quantity !== 'number' || !featureOptionId) {
                return res.status(400).json({ success: false, message: 'Campos obrigatórios ausentes' });
            }

            const movementItem = await MovementItemController._createMovementItem(
                { movementId, itemId, itemFeatureId, quantity, additionalFeatures, productionOrderId, featureOptionId },
                transaction
            );

            await transaction.commit();

            const fullItem = await MovementItem.findByPk(movementItem.id, {
                include: [
                    { model: Item, as: 'item', attributes: ['id', 'name'] },
                    {
                        model: ItemFeature,
                        as: 'itemFeature',
                        attributes: ['id'],
                        include: [
                            { model: Feature, as: 'feature', attributes: ['id', 'name'] }
                        ]
                    },
                    {
                        model: StockAdditionalItem,
                        as: 'additionalItems',
                        include: [
                            { model: ItemFeature, as: 'itemFeature', include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }] },
                            { model: FeatureOption, as: 'featureOption', attributes: ['id', 'name'] }
                        ]
                    }
                ]
            });

            res.status(201).json({ success: true, data: fullItem });
        } catch (error) {
            if (!transaction.finished) await transaction.rollback();
            console.error('Erro ao criar MovementItem:', error);
            res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
        }
    }

    // Criar vários MovementItems em bulk
    static async bulkCreate(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const items = req.body;
            if (!Array.isArray(items) || !items.length) {
                return res.status(400).json({ success: false, message: 'Payload deve ser um array de MovementItems' });
            }

            const createdItems = [];
            for (const data of items) {
                if (!data.movementId || !data.itemId || !data.itemFeatureId || typeof data.quantity !== 'number' || !data.featureOptionId) continue;
                const movementItem = await MovementItemController._createMovementItem(data, transaction);
                createdItems.push(movementItem);
            }

            await transaction.commit();

            const fullItems = await MovementItem.findAll({
                where: { id: createdItems.map(i => i.id) },
                include: [
                    { model: Item, as: 'item', attributes: ['id', 'name'] },
                    {
                        model: ItemFeature,
                        as: 'itemFeature',
                        attributes: ['id'],
                        include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }]
                    },
                    {
                        model: StockAdditionalItem,
                        as: 'additionalItems',
                        include: [
                            { model: ItemFeature, as: 'itemFeature', include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }] },
                            { model: FeatureOption, as: 'featureOption', attributes: ['id', 'name'] }
                        ]
                    }
                ]
            });

            res.status(201).json({ success: true, data: fullItems });

        } catch (error) {
            if (!transaction.finished) await transaction.rollback();
            console.error('Erro ao criar MovementItems em bulk:', error);
            res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
        }
    }

    // Helper para criar MovementItem e atualizar estoque
   static async _createMovementItem({ movementId, itemId, itemFeatureId, quantity, additionalFeatures, productionOrderId, featureOptionId }, transaction) {

    // Busca item e opção para mensagens
    const [item, featureOption] = await Promise.all([
        Item.findByPk(itemId, { attributes: ['id', 'name'], transaction }),
        FeatureOption.findByPk(featureOptionId, { attributes: ['id', 'name'], transaction })
    ]);

    const itemName = item?.name || `ID ${itemId}`;
    const optionName = featureOption?.name || `ID ${featureOptionId}`;

    // ===== VALIDAÇÃO DE QUANTIDADE =====
    if (quantity < 0) {
        // Verifica estoque atual
        const stockItem = await StockItem.findOne({ where: { itemId, itemFeatureId, featureOptionId }, transaction });
        const currentQty = stockItem?.quantity || 0;

        if (!stockItem) {
            throw new Error(`Não é possível remover ${-quantity} unidades: ${itemName} (${optionName}) não existe no estoque.`);
        }

        if (-quantity > currentQty) {
            throw new Error(`Não é possível remover ${-quantity} unidades do item ${itemName} (${optionName}). Estoque atual: ${currentQty}.`);
        }
    }

    // ===== CRIA O MovementItem =====
    const movementItem = await MovementItem.create({
        id: uuidv4(),
        movementId,
        itemId,
        itemFeatureId,
        featureOptionId,
        quantity,
        additionalFeatures: additionalFeatures || []
    }, { transaction });

    // ===== ATUALIZA ESTOQUE =====
    let stock = await Stock.findOne({ where: { itemId }, transaction });
    if (!stock) stock = await Stock.create({ id: uuidv4(), itemId, quantity: 0 }, { transaction });

    let stockItem = await StockItem.findOne({ where: { itemId, itemFeatureId, featureOptionId }, transaction });
    if (stockItem) {
        await stockItem.update({ quantity: stockItem.quantity + quantity }, { transaction });
    } else {
        stockItem = await StockItem.create({
            id: uuidv4(),
            stockId: stock.id,
            itemId,
            itemFeatureId,
            featureOptionId,
            quantity
        }, { transaction });
    }

    // StockAdditionalItem
    if (Array.isArray(additionalFeatures)) {
        for (const af of additionalFeatures) {
            const { itemFeatureId: afFeatureId, featureOptionId: afOptionId } = af;
            if (!afFeatureId || !afOptionId) continue;

            const exists = await StockAdditionalItem.findOne({
                where: { stockId: stock.id, itemFeatureId: afFeatureId, featureOptionId: afOptionId },
                transaction
            });

            if (!exists) {
                await StockAdditionalItem.create({
                    id: uuidv4(),
                    stockId: stock.id,
                    stockItemId: stockItem.id,
                    movementItemId: movementItem.id,
                    itemFeatureId: afFeatureId,
                    featureOptionId: afOptionId
                }, { transaction });
            }
        }
    }

    // Atualiza quantidade total do Stock
    const totalQuantity = await StockItem.sum('quantity', { where: { itemId }, transaction });
    await stock.update({ quantity: totalQuantity }, { transaction });

    // Atualiza OP se houver
    if (productionOrderId) {
        const productionOrder = await ProductionOrder.findByPk(productionOrderId, { transaction });
        if (productionOrder) {
            await productionOrder.update({ deliveredQuantity: (productionOrder.deliveredQuantity || 0) + quantity }, { transaction });
        }
    }

    return movementItem;
}


    // Listar MovementItems
    static async getAll(req, res) {
        try {
            const { movementId, itemId, itemFeatureId } = req.query;
            const where = {};
            if (movementId) where.movementId = movementId;
            if (itemId) where.itemId = itemId;
            if (itemFeatureId) where.itemFeatureId = itemFeatureId;

            const items = await MovementItem.findAll({
                where,
                include: [
                    { model: Item, as: 'item', attributes: ['id', 'name'] },
                    { model: ItemFeature, as: 'itemFeature', attributes: ['id', 'name'] },
                    {
                        model: StockAdditionalItem,
                        as: 'additionalItems',
                        include: [{ model: FeatureOption, as: 'featureOption', attributes: ['id', 'name'] }]
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            res.json({ success: true, data: items });
        } catch (error) {
            console.error('Erro ao buscar MovementItems:', error);
            res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const movementItem = await MovementItem.findByPk(id, {
                include: [
                    { model: Item, as: 'item', attributes: ['id', 'name'] },
                    { model: ItemFeature, as: 'itemFeature', attributes: ['id', 'name'] },
                    {
                        model: StockAdditionalItem,
                        as: 'additionalItems',
                        include: [{ model: FeatureOption, as: 'featureOption', attributes: ['id', 'name'] }]
                    }
                ]
            });

            if (!movementItem) return res.status(404).json({ success: false, message: 'MovementItem não encontrado' });

            res.json({ success: true, data: movementItem });
        } catch (error) {
            console.error('Erro ao buscar MovementItem por ID:', error);
            res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
        }
    }

    static async getByMovement(req, res) {
        try {
            const { movementId } = req.params;
            const items = await MovementItem.findAll({
                where: { movementId },
                include: [
                    { model: Item, as: 'item', attributes: ['id', 'name'] },
                    { model: ItemFeature, as: 'itemFeature', attributes: ['id', 'name'] },
                    {
                        model: StockAdditionalItem,
                        as: 'additionalItems',
                        include: [{ model: FeatureOption, as: 'featureOption', attributes: ['id', 'name'] }]
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
            res.json({ success: true, data: items });
        } catch (error) {
            console.error('Erro ao buscar MovementItems por Movement:', error);
            res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
        }
    }
}

export default MovementItemController;
