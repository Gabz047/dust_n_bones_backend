// controllers/StockController.js
import { StockItem, StockAdditionalItem, Item, ItemFeature, Feature, FeatureOption, Stock } from '../models/index.js';

class StockController {
  // Formatar dados
  static formatStock(stocks) {
    return stocks.map(stock => ({
      id: stock.id,
      quantity: stock.quantity,
      item: stock.item,
      stockItems: stock.stockItems?.map(si => ({
        id: si.id,
        quantity: si.quantity,
        itemFeature: si.itemFeature,
        featureOption: si.featureOption,
        additionalItems: si.additionalItems?.map(ai => ({
          stockId: ai.id,
          itemFeatureId: ai.itemFeature?.id,
          featureOptionId: ai.featureOption?.id
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
}

export default StockController;
