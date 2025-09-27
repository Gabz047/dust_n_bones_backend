// import puppeteer from 'puppeteer';

// /**
//  * Gera PDF de etiquetas compactas para uma lista de caixas
//  * @param {Object} slimNote - Romaneio com caixas e itens já filtrados
//  * @param {Response} res - Response do Express
//  */
// export async function generateLabelsPDF(slimNote, res) {
//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();

//   // Função para dividir os itens em grupos de 4
//   const buildLabels = (items) => {
//     const labels = [];
//     items.forEach(boxItem => {
//       const box = boxItem.box;
//       if (!box || !box.items?.length) return;

//       for (let i = 0; i < box.items.length; i += 4) {
//         const chunk = box.items.slice(i, i + 4);
//         labels.push({
//           boxId: box.id,
//           boxReferral: box.referralId,
//           totalQuantity: box.totalQuantity,
//           items: chunk,
//           boxIndex: Math.floor(i / 4) + 1,
//           boxTotalChunks: Math.ceil(box.items.length / 4)
//         });
//       }
//     });
//     return labels;
//   };

//   const labels = buildLabels(slimNote.items);

//   // Função para gerar HTML de cada etiqueta
//   const generateLabelHTML = (label) => `
//     <div class="label-container">
//       <div class="label-header">
//         <h2>Caixa: ${label.boxReferral}</h2>
//         <p>Total: ${label.totalQuantity}</p>
//       </div>
//       <div class="label-body">
//         ${label.items.map(i => `
//           <div class="item-details multiple">
//             <p class="item-description">${i.item}</p>
//             <p class="item-quantity">Qtd: ${i.quantity}</p>
//           </div>
//         `).join('')}
//       </div>
//       <div class="label-footer">
//         <p class="box-number">Etiqueta: ${label.boxIndex} / ${label.boxTotalChunks}</p>
//       </div>
//     </div>
//   `;

//   // Monta HTML completo
//   const html = `
//   <!DOCTYPE html>
//   <html lang="pt-BR">
//   <head>
//     <meta charset="UTF-8">
//     <title>Etiquetas - Estoquelogia</title>
//     <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@500;700&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
//     <style>
//       body { font-family: 'Roboto', sans-serif; background-color: #e9ecef; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
//       .label-container { width: 380px; background: #fff; border: 1px solid #dee2e6; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); display: flex; flex-direction: column; gap: 10px; }
//       .label-header { text-align: center; border-bottom: 1px solid #007bff; padding-bottom: 8px; }
//       .label-header h2 { margin: 0; font-size: 1.2em; font-weight: 700; }
//       .label-header p { margin: 3px 0 0 0; font-size: 0.9em; font-weight: 700; color: #495057; }
//       .label-body { flex-grow: 1; }
//       .item-details.multiple { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #ced4da; padding: 4px 0; margin: 0; }
//       .item-details.multiple:last-child { border-bottom: none; }
//       .item-description { font-size: 0.9em; font-weight: 700; margin: 0; text-align: left; }
//       .item-quantity { font-size: 0.9em; margin: 0; color: #495057; font-weight: 500; text-align: right; }
//       .label-footer { border-top: 1px solid #dee2e6; padding-top: 10px; font-family: 'Roboto Mono', monospace; font-size: 0.9em; }
//       .label-footer p { margin: 3px 0; display: flex; justify-content: space-between; }
//       .box-number { background-color: #212529; color: #fff; padding: 6px; font-size: 1.2em; text-align: center; font-weight: 700; display: block; margin-top: 8px; }
//     </style>
//   </head>
//   <body>
//     ${labels.map(generateLabelHTML).join('')}
//   </body>
//   </html>
//   `;

//   await page.setContent(html, { waitUntil: 'networkidle0' });

//   const pdfBuffer = await page.pdf({
//     format: 'A4',
//     printBackground: true,
//     margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' }
//   });

//   await browser.close();

//   res.writeHead(200, {
//     'Content-Type': 'application/pdf',
//     'Content-Disposition': `inline; filename=etiquetas-${slimNote.id}.pdf`,
//     'Content-Length': pdfBuffer.length
//   });
//   res.end(pdfBuffer);
// }

/**
 * Gera etiquetas em ZPL no estilo do HTML fornecido
 * @param {Object} romaneio - Romaneio com caixas e itens já filtrados
 * @returns {string} - Código ZPL para envio à impressora
 */
// export function generateLabelsZPL(romaneio) {
//   if (!romaneio || !romaneio.boxes) return '';

//   let zpl = '';

//   romaneio.boxes.forEach((box, boxIndex) => {
//     const chunks = [];
//     for (let i = 0; i < box.items.length; i += 4) {
//       chunks.push(box.items.slice(i, i + 4));
//     }

//     chunks.forEach((chunk, chunkIndex) => {
//       // Início da etiqueta
//       zpl += '^XA\n';

//       // Borda da etiqueta
//       zpl += '^FO0,0^GB380,480,2^FS\n';

//       // Cabeçalho azul
//       zpl += '^FO0,0^GB380,60,3^FS\n';
//       zpl += '^CF0,30\n';
//       zpl += `^FO10,15^FDCAIXA: ${box.referralId}^FS\n`;
//       zpl += '^CF0,20\n';
//       zpl += `^FO10,40^FDTOTAL: ${box.totalQuantity || 0}^FS\n`;

//       // Itens
//       chunk.forEach((item, idx) => {
//         const y = 70 + idx * 40;
//         zpl += '^FO10,' + y + '^GB360,0,1^FS\n'; // linha separadora
//         zpl += `^FO10,${y + 5}^A0N,20,20^FD${item.item.name} - ${item.itemFeature.feature.name}: ${item.orderItem?.featureOption?.name}^FS\n`;
//         zpl += `^FO300,${y + 5}^A0N,20,20^FD${item.quantity}^FS\n`;
//       });

//       // Rodapé
//       const footerY = 70 + chunk.length * 40 + 10;
//       zpl += '^FO0,' + footerY + '^GB380,1,1^FS\n';
//       zpl += '^CF0,20\n';
//       zpl += `^FO10,${footerY + 5}^FDEtiqueta: ${chunkIndex + 1}/${chunks.length}^FS\n`;

//       // Fim da etiqueta
//       zpl += '^XZ\n';
//     });
//   });

//   return zpl;
// }

/**
 * Gera ZPL apenas da primeira etiqueta do romaneio
 * @param {Object} romaneio - Romaneio com caixas e itens
 * @returns {string} - ZPL da primeira etiqueta
 */
export function generateLabelsZPL(romaneio) {
  if (!romaneio?.boxes?.length) return '';

  const firstBox = romaneio.boxes[0];
  const firstChunk = firstBox.items.slice(0, 4); // até 4 itens

  let zpl = '^XA\n';

  // Borda da etiqueta
  zpl += '^FO0,0^GB380,480,2^FS\n';

  // Cabeçalho azul
  zpl += '^FO0,0^GB380,60,3^FS\n';
  zpl += '^CF0,30\n';
  zpl += `^FO10,15^FDCAIXA: ${firstBox.referralId}^FS\n`;
  zpl += '^CF0,20\n';
  zpl += `^FO10,40^FDTOTAL: ${firstBox.totalQuantity || 0}^FS\n`;

  // Itens
  firstChunk.forEach((item, idx) => {
    const y = 70 + idx * 40;
    zpl += `^FO10,${y}^GB360,0,1^FS\n`; // linha separadora
    zpl += `^FO10,${y + 5}^A0N,20,20^FD${item.item.name} - ${item.itemFeature.feature.name}: ${item.orderItem?.featureOption?.name}^FS\n`;
    zpl += `^FO300,${y + 5}^A0N,20,20^FD${item.quantity}^FS\n`;
  });

  // Rodapé
  const footerY = 70 + firstChunk.length * 40 + 10;
  zpl += `^FO0,${footerY}^GB380,1,1^FS\n`;
  zpl += '^CF0,20\n';
  zpl += `^FO10,${footerY + 5}^FDEtiqueta: 1/1^FS\n`;

  zpl += '^XZ\n';

  return zpl;
}