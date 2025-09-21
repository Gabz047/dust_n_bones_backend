// controllers/StockController.js
import { StockItem, StockAdditionalItem, Item, ItemFeature, Feature, FeatureOption, Stock } from '../models/index.js';

class StockController {
  // Formatar dados
 static formatStock(stocks) {
  return stocks.map(stock => ({
    id: stock.id,
    quantity: stock.quantity,
    createdAt: stock.createdAt,  // ✅ Adicionado
    updatedAt: stock.updatedAt,  // ✅ Adicionado
    item: stock.item,
    stockItems: stock.stockItems?.map(si => ({
      id: si.id,
      quantity: si.quantity,
      createdAt: si.createdAt,    // ✅ Adicionado
      updatedAt: si.updatedAt,    // ✅ Adicionado
      itemFeature: si.itemFeature,
      featureOption: si.featureOption,
      additionalItems: si.additionalItems?.map(ai => ({
        stockId: ai.id,
        itemFeatureId: ai.itemFeature?.id,
        featureOptionId: ai.featureOption?.id,
        createdAt: ai.createdAt,   // ✅ Adicionado
        updatedAt: ai.updatedAt    // ✅ Adicionado
      })) || []
    })) || []
  }));
}

  // ==== INCLUDE PADRÃO ====
  static stockInclude(whereStockItem = {}) {
    return [
      { model: Item, as: 'item', attributes: ['id', 'name'] },
      {
        model: StockItem,
        as: 'stockItems',
        where: Object.keys(whereStockItem).length ? whereStockItem : undefined,
        required: Object.keys(whereStockItem).length > 0,
        include: [
          {
            model: ItemFeature,
            as: 'itemFeature',
            include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }]
          },
          { model: FeatureOption, as: 'featureOption', attributes: ['id', 'name'] },
          {
            model: StockAdditionalItem,
            as: 'additionalItems',
            include: [
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
    ];
  }

  static async getStockItemById(req, res) {
  try {
    const { id } = req.params;

    const stockItem = await StockItem.findByPk(id, {
      include: [
        {
          model: ItemFeature,
          as: 'itemFeature',
          include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }]
        },
        { model: FeatureOption, as: 'featureOption', attributes: ['id', 'name'] },
        {
          model: StockAdditionalItem,
          as: 'additionalItems',
          include: [
            {
              model: ItemFeature,
              as: 'itemFeature',
              include: [{ model: Feature, as: 'feature', attributes: ['id', 'name'] }]
            },
            { model: FeatureOption, as: 'featureOption', attributes: ['id', 'name'] }
          ]
        }
      ]
    });

    if (!stockItem) {
      return res.status(404).json({ success: false, message: 'StockItem não encontrado' });
    }

    // Formata o StockItem com createdAt / updatedAt
    const formattedItem = {
      id: stockItem.id,
      quantity: stockItem.quantity,
      createdAt: stockItem.createdAt,
      updatedAt: stockItem.updatedAt,
      itemFeature: stockItem.itemFeature,
      featureOption: stockItem.featureOption,
      additionalItems: stockItem.additionalItems?.map(ai => ({
        id: ai.id,
        stockId: ai.stockId,
        itemFeatureId: ai.itemFeature?.id,
        featureOptionId: ai.featureOption?.id,
        createdAt: ai.createdAt,
        updatedAt: ai.updatedAt
      })) || []
    };

    res.json({ success: true, data: formattedItem });
  } catch (error) {
    console.error('Erro ao buscar StockItem por ID:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}

  // Listar todos os estoques
  static async getAll(req, res) {
    try {
      const { itemId } = req.query;
      const where = {};
      if (itemId) where.itemId = itemId;

      const stocks = await Stock.findAll({
        where,
        include: StockController.stockInclude(),
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, data: StockController.formatStock(stocks) });
    } catch (error) {
      console.error('Erro ao buscar estoques:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Buscar estoque por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const stock = await Stock.findByPk(id, {
        include: StockController.stockInclude()
      });

      if (!stock) return res.status(404).json({ success: false, message: 'Estoque não encontrado' });

      res.json({ success: true, data: StockController.formatStock([stock])[0] });
    } catch (error) {
      console.error('Erro ao buscar estoque por ID:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // Buscar estoque por combinação Item + ItemFeature + FeatureOption
  static async getByItemFeatureOption(req, res) {
    try {
      const { itemId, itemFeatureId, featureOptionId } = req.params;

      const stock = await Stock.findOne({
        include: StockController.stockInclude({ itemId, itemFeatureId, featureOptionId })
      });

      if (!stock) {
        return res.status(404).json({
          success: false,
          message: 'Estoque não encontrado para essa combinação'
        });
      }

      res.json({ success: true, data: StockController.formatStock([stock])[0] });
    } catch (error) {
      console.error('Erro ao buscar estoque por itemFeatureOption:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

   static async getByMultipleItems(req, res) {
    try {
      // Pode receber itemIds no body ou na query
      let itemIds = req.body.itemIds || req.query.itemIds;

      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'É necessário enviar um array de itemIds.'
        });
      }

      // Converte para números se vierem como string
      itemIds = itemIds.map(id => id);

      const stocks = await Stock.findAll({
        where: {
          itemId: itemIds
        },
        include: StockController.stockInclude(),
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, data: StockController.formatStock(stocks) });
    } catch (error) {
      console.error('Erro ao buscar estoques por múltiplos itens:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}

export default StockController;
