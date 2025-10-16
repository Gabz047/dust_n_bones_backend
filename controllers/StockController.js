import { Stock, StockItem, StockAdditionalItem, MovementItem, ProductionOrderItemAdditionalFeatureOption, Item, ItemFeature, FeatureOption, Feature } from '../models/index.js';
import { buildQueryOptions } from '../utils/filters/buildQueryOptions.js';
import { Op } from 'sequelize';

class StockController {
  // Formatar dados
  static formatStock(stocks) {
    return stocks.map(stock => ({
      id: stock.id,
      quantity: stock.quantity,
      createdAt: stock.createdAt,
      updatedAt: stock.updatedAt,
      item: stock.item,
      stockItems: stock.stockItems?.map(si => ({
        id: si.id,
        quantity: si.quantity,
        createdAt: si.createdAt,
        updatedAt: si.updatedAt,
        itemFeature: si.itemFeature,
        featureOption: si.featureOption,
        additionalItems: si.additionalItems?.map(ai => ({
          stockId: ai.id,
          itemFeatureId: ai.itemFeature?.id,
          featureOptionId: ai.featureOption?.id,
          createdAt: ai.createdAt,
          updatedAt: ai.updatedAt
        })) || []
      })) || []
    }));
  }

  // INCLUDE PADRÃO PARA RELACIONAMENTOS
  static stockInclude(whereStockItem = {}) {
    return [
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

  // 🔒 Filtro de acesso por empresa/filial
  static itemAccessFilter(req) {
    const { companyId, branchId } = req.context || {}
    return {
      companyId
    }
  }

  // GET StockItem por ID (não filtra company/branch porque vem via Stock já filtrado)
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

  static async getAll(req, res) {
  try {
    const { itemId, term } = req.query;
    const where = {};
    const itemWhere = StockController.itemAccessFilter(req); // filtro company/branch

    if (itemId) where.itemId = itemId;

    // Se tiver term, aplicamos direto no include de Item
    if (term) {
      itemWhere.name = { [Op.iLike]: `%${term}%` };
    }

    const result = await buildQueryOptions(req, Stock, {
      where,
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'companyId', 'branchId', 'referralId'],
          where: itemWhere
        },
        ...StockController.stockInclude()
      ],
      order: [['createdAt', 'DESC']],
      distinct: true, // garante que o count conte Stock e não StockItem
    });

    const formattedData = StockController.formatStock(result.data);

    res.json({
      success: true,
      data: formattedData,
      count: result.count,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Erro ao buscar estoques:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}

  // 🔍 Buscar estoque por ID (sem paginação)
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const stock = await Stock.findByPk(id, {
        include: [
          {
            model: Item,
            as: 'item',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: StockController.itemAccessFilter(req)
          },
          ...StockController.stockInclude()
        ]
      });

      if (!stock) return res.status(404).json({ success: false, message: 'Estoque não encontrado' });

      res.json({ success: true, data: StockController.formatStock([stock])[0] });
    } catch (error) {
      console.error('Erro ao buscar estoque por ID:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  // 🔗 Buscar estoque por Item + ItemFeature + FeatureOption (sem paginação)
  static async getByItemFeatureOption(req, res) {
    try {
      const { itemId, itemFeatureId, featureOptionId } = req.params;

      const stock = await Stock.findOne({
        include: [
          {
            model: Item,
            as: 'item',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: {
              id: itemId,
              ...StockController.itemAccessFilter(req)
            }
          },
          ...StockController.stockInclude({ itemFeatureId, featureOptionId })
        ]
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

  // 📋 Buscar estoques por múltiplos itens COM PAGINAÇÃO
  static async getByMultipleItems(req, res) {
    try {
      let itemIds = req.body.itemIds || req.query.itemIds;

      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ success: false, message: 'É necessário enviar um array de itemIds.' });
      }

      itemIds = itemIds.map(id => id);

      const result = await buildQueryOptions(req, Stock, {
        where: {
          itemId: itemIds
        },
        include: [
          {
            model: Item,
            as: 'item',
            attributes: ['id', 'name', 'companyId', 'branchId'],
            where: StockController.itemAccessFilter(req)
          },
          ...StockController.stockInclude()
        ],
        order: [['createdAt', 'DESC']]
      });

      // Formatar os dados antes de retornar
      const formattedData = StockController.formatStock(result.data);

      res.json({
        success: true,
        data: formattedData,
        count: result.count,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Erro ao buscar estoques por múltiplos itens:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

 static async delete(req, res) {
  try {
    const { id } = req.params;

    // Buscar stock com StockItems
    const stock = await Stock.findOne({
      where: { id },
      include: [
        {
          model: StockItem,
          as: 'stockItems',
        }
      ]
    });

    if (!stock) {
      return res.status(404).json({ success: false, message: 'Estoque não encontrado.' });
    }

    const linkedRecords = [];

    // Iterar stockItems e checar vínculos via MovementItem
    for (const si of stock.stockItems) {
      const movementCount = await MovementItem.count({
        where: {
          itemId: stock.itemId,
          itemFeatureId: si.itemFeatureId,
          featureOptionId: si.featureOptionId
        }
      });

      if (movementCount > 0) {
        linkedRecords.push(`Items do Estoque possui movimentações`);
      } else {
        await si.destroy(); // deletar StockItem sem adicionais
      }
    }

    if (linkedRecords.length > 0) {
      return res.status(500).json({
        success: false,
        message: `Não é possível deletar totalmente. Alguns Items do Estoque possuem vínculos: ${linkedRecords.join(', ')}.`
      });
    }

    await stock.destroy();
    return res.json({ success: true, message: 'Estoque deletado com sucesso.' });

  } catch (error) {
    console.error('Erro ao deletar estoque:', error);
    return res.status(500).json({ success: false, message: 'Erro ao deletar estoque.', error: error.message });
  }
}

}

export default StockController;