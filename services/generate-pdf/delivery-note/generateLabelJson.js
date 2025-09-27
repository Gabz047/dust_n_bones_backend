export function generateLabelsJSON(slimNote) {
  if (!slimNote || !slimNote.items) return [];

  const labels = [];

  slimNote.items.forEach(boxItem => {
    const box = boxItem.box;
    if (!box || !box.items?.length) return;

    // Divide os itens da caixa em blocos de 4
    const chunks = [];
    for (let i = 0; i < box.items.length; i += 4) {
      chunks.push(box.items.slice(i, i + 4));
    }

    chunks.forEach((chunk, index) => {
      labels.push({
        boxId: box.id,
        boxReferral: box.referralId,
        totalQuantity: box.totalQuantity,
        items: chunk.map(i => ({
          name: i.item,
          quantity: i.quantity,
          itemFeature: i.itemFeature
            ? {
                feature: i.itemFeature.feature?.name || null,
                featureOption: i.featureOption?.name || null
              }
            : null
        })),
        labelIndex: index + 1,
        totalLabels: chunks.length
      });
    });
  });

  return labels;
}
