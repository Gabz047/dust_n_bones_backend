import { Box, BoxItem, Item, DeliveryNote } from '../models/index.js';

/**
 * Calcula quantidade e preço total de uma DeliveryNote
 * com base nos BoxItems e no preço de cada Item.
 *
 * @param {string} deliveryNoteId
 * @param {object} transaction - Transação do Sequelize
 * @returns {Promise<{ totalQuantity: number, totalPrice: number }>}
 */
export async function calculateQuantityAndPrice(deliveryNoteId, transaction) {
  const deliveryNote = await DeliveryNote.findByPk(deliveryNoteId, {
    attributes: ['id'],
    include: [
      {
        model: Box,
        as: 'boxes',
        attributes: ['id'],
        include: [
          {
            model: BoxItem,
            as: 'items',
            attributes: ['quantity'],
            include: [
              {
                model: Item,
                as: 'item',
                attributes: ['id', 'price']
              }
            ]
          }
        ]
      }
    ],
    transaction
  });

  let totalQuantity = 0;
  let totalPrice = 0;

  if (deliveryNote?.boxes) {
    for (const box of deliveryNote.boxes) {
      for (const boxItem of box.items) {
        const quantity = boxItem.quantity || 0;
        const price = boxItem.item?.price || 0;

        totalQuantity += quantity;
        totalPrice += quantity * price;
      }
    }
  }

  return { totalQuantity, totalPrice };
}
