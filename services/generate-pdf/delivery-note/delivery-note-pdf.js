import puppeteer from 'puppeteer'

/**
 * Gera PDF de um romaneio usando Puppeteer
 * @param {Object} deliveryNote - Romaneio completo com relacionamentos
 * @param {Response} res - Response do Express
 */
export async function generateDeliveryNotePDF(deliveryNote, res) {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  console.log(deliveryNote)
  console.log(deliveryNote.items[0].box.itemFeature)

  // Helpers
  const formatDate = (d) => new Date(d).toLocaleDateString('pt-BR')
  const formatDateTime = (d) => new Date(d).toLocaleString('pt-BR')
  const safe = (value) => (value ? value : '')

  // Monta HTML dinâmico
  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <title>Romaneio - Estoquelogia</title>
  
    <style>
      body {
        font-family: 'Roboto', sans-serif;
        background-color: #f4f7f9;
        color: #333;
        margin: 0;
        padding: 20px;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
        background-color: #fff;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
      header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #e9ecef;
        padding-bottom: 20px;
        margin-bottom: 20px;
      }
      .logo h1 {
        margin: 0;
        font-size: 2.5em;
        color: #007bff;
        font-weight: 700;
      }
      .company-info { text-align: right; }
      .company-info h2 { margin: 0 0 5px 0; font-size: 1.1em; color: #495057; }
      .company-info p { margin: 2px 0; font-size: 0.9em; color: #6c757d; }
      main section {
        background-color: #fdfdfd;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        padding: 20px;
        margin-bottom: 20px;
      }
      main section h3 {
        margin-top: 0;
        margin-bottom: 15px;
        font-size: 1.2em;
        color: #007bff;
        border-bottom: 1px solid #dee2e6;
        padding-bottom: 10px;
      }
      .item-category { margin-bottom: 25px; }
      .item-category h4 { margin-bottom: 10px; font-size: 1.1em; color: #495057; }
      table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
      th, td { border: 1px solid #dee2e6; padding: 10px; text-align: center; }
      thead { background-color: #f8f9fa; }
      th { font-weight: 500; color: #495057; }
      td strong { font-weight: 700; }
      tbody tr:nth-child(odd) { background-color: #fdfdfd; }
      td:last-child, th:last-child { background-color: #e9ecef; font-weight: 700; }
      footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 2px solid #e9ecef;
        padding-top: 20px;
        margin-top: 30px;
        font-size: 0.9em;
        color: #6c757d;
      }
      .signature p, .contact p { margin: 5px 0; }

      .total-row td {
  background-color: #fff; /* branco */
}
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <div class="logo">
          <h1>Estoquelogia</h1>
        </div>
        <div class="company-info">
          <h2>${safe(deliveryNote.company?.name)}</h2>
          <p>CNPJ: ${safe(deliveryNote.company?.cnpj)}</p>
          <p>Endereço: ${safe(deliveryNote.company?.address)} - ${safe(deliveryNote.company?.city)} - ${safe(deliveryNote.company?.state)} </p>
          <p>CEP: ${safe(deliveryNote.company?.zipcode)} </p>
        </div>
      </header>

      <main>
        <section class="destination-info">
          <h3>DESTINATÁRIO</h3>
          <p>Cliente Do Projeto: ${safe(deliveryNote.project?.customer?.name)}</p>
          <p>Cliente Do Pedido: <strong>${safe(deliveryNote.customer?.name)}</strong></p>
          <p><strong>${safe(deliveryNote.customer?.document)}</strong></p>
          <p><strong>Endereço:</strong> ${safe(deliveryNote.customer?.address)} - ${safe(deliveryNote.customer?.city)} - ${safe(deliveryNote.customer?.state)}</p>
          <p><strong>Telefone:</strong> ${safe(deliveryNote.customer?.phone)}</p>
        </section>

        <section class="dispatch-info">
          <h3>INFORMAÇÕES DO DESPACHO</h3>
          <p><strong>Documento de Despacho Nº:</strong> ${deliveryNote.id}</p>
          <p><strong>Emissão:</strong> ${formatDateTime(deliveryNote.createdAt)}</p>
          <p><strong>Romaneio:</strong> ${safe(deliveryNote.referralId)}</p>
          <p><strong>Volumes:</strong> ${deliveryNote.items?.length || 0}</p>
          <p><strong>Peso:</strong> ${deliveryNote.totalWeight ? deliveryNote.totalWeight.toFixed(2) : '0.00'} Kg</p>
          <p><strong>Cubagem:</strong> ${deliveryNote.totalVolume || 0} m³</p>
        </section>

        <section class="items-grid">
          <h3>ITENS</h3>

          ${deliveryNote.items.map(item => `
              <div class="item-category">
                <h4>${safe(item.box?.name || 'Caixa ' + item.box.referralId)}</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qtd.</th>
                      <th>Tamanho</th>
                      
                    </tr>
                  </thead>
                  <tbody>
  ${item.box?.items?.map(bi => `
    <tr>
      <td>${safe(bi.item)}</td>
      <td>${bi.quantity}</td>
      <td>${safe(bi.itemFeature?.featureOption.name || '-')}</td>
    </tr>
  `).join('')}
  <tr class="total-row">
    <td colspan="2"><strong>Total</strong></td>
    <td><strong>${item.box.totalQuantity}</strong></td>
  </tr>
</tbody>
                </table>
              </div>
            `).join('')
    }
        </section>
      </main>

      <footer>
        <div class="signature">
          <p><strong>Data:</strong> ____/____/______</p>
          <p><strong>Assinatura / Carimbo:</strong> _________________________</p>
        </div>
        <div class="contact">
          <p>Email: ${safe(deliveryNote.company?.email)}</p>
          <p>Fone: ${safe(deliveryNote.company?.phone)}</p>
        </div>
      </footer>
    </div>
  </body>
  </html>
  `

  await page.setContent(html, { waitUntil: 'networkidle0' })

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
  })

  await browser.close()

  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename=romaneio-${deliveryNote.id}.pdf`,
    'Content-Length': pdfBuffer.length
  })
  res.end(pdfBuffer)
}
