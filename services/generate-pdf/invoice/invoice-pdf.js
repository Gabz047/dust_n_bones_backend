import puppeteer from 'puppeteer'

/**
 * Gera PDF de Fatura estilo Vue com features dinâmicas
 * @param {Object} invoice - Objeto da fatura com todos os dados necessários
 * @param {Response} res - Response do Express
 */
export async function generateInvoicePDF(invoice, res) {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  console.log(invoice)

  const formatMoney = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

  const safe = (value) => (value ? value : '')
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : ''

  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <title>Fatura - Estoquelogia</title>
    <style>
      body { font-family: 'Roboto', sans-serif; background-color: #f8f9fa; color: #343a40; margin:0; padding:20px; font-size:14px; }
      .invoice-container { max-width: 800px; margin: 20px auto; background-color: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
      header.invoice-header { display: flex; justify-content: space-between; align-items:flex-start; padding-bottom:20px; border-bottom:3px solid #007bff; }
      .logo h1 { margin:0; font-size:2.2em; color:#007bff; font-weight:700; }
      .logo p { margin:0; color:#6c757d; }
      .invoice-details { text-align:right; }
      .invoice-details h2 { margin:0; font-size:2em; color:#495057; }
      .invoice-details p { margin:5px 0 0; font-size:1.1em; font-family:'Roboto Mono', monospace; }
      .parties-info { display:flex; justify-content:space-between; padding:25px 0; }
      .company-info, .client-info { width:48%; }
      .parties-info h3 { font-size:0.9em; color:#6c757d; margin-bottom:8px; border-bottom:1px solid #e9ecef; padding-bottom:5px; }
      .parties-info p { margin:4px 0; line-height:1.5; }
      .item-section { margin-bottom:30px; }
      .section-title { background-color:#f8f9fa; padding:10px; border-radius:4px; font-size:1.1em; color:#495057; margin-bottom:15px; }
      table { width:100%; border-collapse: collapse; }
      th, td { padding:12px; text-align:center; border-bottom:1px solid #dee2e6; }
      thead th { background-color:#e9ecef; font-weight:700; color:#495057; text-align:center; }
      tbody td:first-child { text-align:left; }
      tfoot td { font-weight:700; }
      .subtotal-label { text-align:right; color:#495057; }
      .subtotal-value { text-align:right; font-family:'Roboto Mono', monospace; }
      .invoice-summary { display:flex; justify-content:flex-end; margin-top:20px; padding-top:20px; border-top:2px solid #dee2e6; }
      .summary-details { width:50%; }
      .summary-details p { display:flex; justify-content:space-between; margin:8px 0; font-size:1.1em; }
      .summary-details span:last-child { font-family:'Roboto Mono', monospace; font-weight:500; }
      .total-due { font-size:1.4em !important; font-weight:700; color:#007bff; margin-top:10px !important; }
      .invoice-footer { margin-top:30px; padding-top:20px; border-top:1px solid #e9ecef; font-size:0.9em; color:#6c757d; }
      .invoice-footer h4 { margin-bottom:10px; color:#495057; }
      .invoice-footer p { margin:3px 0; }
      .invoice-footer hr { border:0; border-top:1px solid #e9ecef; margin:15px 0; }
      .thank-you { text-align:center; margin-top:20px; font-style:italic; }
    </style>
  </head>
  <body>
    <div class="invoice-container">
      <header class="invoice-header">
        <div class="logo">
          <h1>Estoquelogia</h1>
          <p>Soluções em Gestão de Estoque</p>
        </div>
        <div class="invoice-details">
          <h2>FATURA</h2>
          <p><strong>Nº da Fatura:</strong> ${safe(invoice.number)}</p>
          <p><strong>Data de Emissão:</strong> ${formatDate(invoice.issueDate)}</p>
          <p><strong>Data de Vencimento:</strong> ${formatDate(invoice.dueDate)}</p>
        </div>
      </header>

      <section class="parties-info">
        <div class="company-info">
          <h3>DE:</h3>
          <p><strong>${safe(invoice.company?.name)}</strong></p>
          <p>${safe(invoice.company?.address)}</p>
          <p>${safe(invoice.company?.city)}, ${safe(invoice.company?.state)} - ${safe(invoice.company?.zipcode)}</p>
          <p>CNPJ: ${safe(invoice.company?.cnpj)}</p>
          <p>Email: ${safe(invoice.company?.email)}</p>
        </div>
        <div class="client-info">
          <h3>PARA:</h3>
          <p><strong>${safe(invoice.project.customer?.name)}</strong></p>
          <p>${safe(invoice.project.customer?.address)}</p>
          <p>${safe(invoice.project.customer?.city)}, ${safe(invoice.project.customer?.state)} - ${safe(invoice.project.customer?.zipcode)}</p>
          <p>${safe(invoice.project.customer?.document.length > 11 ? 'CNPJ' : 'CPF')}: ${safe(invoice.project.customer?.document || '')}</p>
        </div>
      </section>

      ${invoice.deliveryNotes?.map(dn => {
    let dnTotal = 0;
    const itemsMap = {}; // Agrupa por item + featureOption

    (dn.items || []).forEach(it => {
      const key = `${it.item}-${it.featureOption || ''}`;
      if (!itemsMap[key]) {
        itemsMap[key] = {
          quantity: it.quantity,
          item: it.item,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
          itemFeature: it.itemFeature,
          featureOption: it.featureOption
        };
      } else {
        itemsMap[key].quantity += it.quantity;
        itemsMap[key].totalPrice += it.totalPrice;
      }
      dnTotal += it.totalPrice;
    });

    const groupedItems = Object.values(itemsMap);

    // Descobre todas as features únicas para este romaneio
    const allFeatures = [...new Set(
      groupedItems
        .map(it => it.itemFeature?.feature?.name)
        .filter(Boolean)
    )];

    return `
    <section class="item-section">
      <h3 class="section-title">Itens do Romaneio: ${safe(dn.referralId)} - ${safe(dn.customer?.name)}</h3>
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            ${allFeatures.map(f => `<th>${safe(f)}</th>`).join('')}
            <th>Quantidade</th>
            <th>Valor Unitário (R$)</th>
            <th>Total (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${groupedItems.map(it => `
            <tr>
              <td>${safe(it.item)}</td>
              ${allFeatures.map(f => `
                <td>${it.itemFeature?.feature?.name === f ? safe(it.featureOption) : '-'}</td>
              `).join('')}
              <td>${safe(it.quantity)}</td>
              <td>${safe(it.unitPrice)}</td>
              <td>${safe(it.totalPrice.toFixed(2))}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="${1 + allFeatures.length + 2}" class="subtotal-label">Subtotal</td>
            <td class="subtotal-value">${safe(formatMoney(dnTotal))}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  `;
  }).join('')}


      <section class="invoice-summary">
        <div class="summary-details">
          <p><span>Subtotal Geral:</span> <span>R$ ${safe(formatMoney(invoice.totalPrice))}</span></p>
          <p><span>Descontos:</span> <span>- R$ ${safe(invoice.discount)}</span></p>
          <p><span>Frete/Impostos:</span> <span>R$ ${safe(invoice.taxShipping)}</span></p>
          <p class="total-due"><span>VALOR TOTAL:</span> <span>R$ ${safe(formatMoney(invoice.totalPrice))}</span></p>
        </div>
      </section>

      <footer class="invoice-footer">
        <h4>Informações de Pagamento</h4>
        <p><strong>Banco:</strong> ${safe(invoice.payment?.bank)}</p>
        <p><strong>Agência:</strong> ${safe(invoice.payment?.agency)} / <strong>Conta Corrente:</strong> ${safe(invoice.payment?.account)}</p>
        <p><strong>PIX (CNPJ):</strong> ${safe(invoice.company?.cnpj)}</p>
        <hr>
        <p class="terms"><strong>Termos e Condições:</strong> ${safe(invoice.terms)}</p>
        <p class="thank-you">Obrigado pela sua preferência!</p>
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
    'Content-Disposition': `inline; filename=fatura-${invoice.number}.pdf`,
    'Content-Length': pdfBuffer.length
  })
  res.end(pdfBuffer)
}
