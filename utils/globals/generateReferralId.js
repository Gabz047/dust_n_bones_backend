import { Op } from 'sequelize'

export async function generateReferralId({
  model,
  transaction,
  companyId,
  referralField = 'referral_id',
  suffixLength = 3
}) {
  if (!model) throw new Error('Model é obrigatório')
  if (!companyId) throw new Error('companyId é obrigatório')

  console.log('🟢 [generateReferralId] Iniciando geração...')
  console.log('➡️ companyId:', companyId)
 

  // 🔹 CORRIGIDO: usa "company_id" (como está no banco)
  const lastItem = await model.findOne({
    where: { company_id: companyId },
    order: [[referralField, 'DESC']],
    transaction,
  })

  console.log('📦 Último item retornado:', lastItem ? lastItem.toJSON?.() ?? lastItem : 'Nenhum encontrado')

  let nextSuffix = 1

 if (lastItem) {
  const lastStr = String(lastItem.referralId) // 👈 usa a propriedade camelCase do model
  console.log('🔹 Valor bruto do último referralId:', lastStr)

  const num = parseInt(lastStr.replace(/\D/g, ''), 10)
  console.log('🔸 Número convertido:', num, '| isNaN?', isNaN(num))

  nextSuffix = isNaN(num) ? 1 : num + 1
  console.log('🔹 Próximo número calculado:', nextSuffix)
}

  const referralId = String(nextSuffix).padStart(suffixLength, '0')
  console.log('✅ referralId final gerado:', referralId)
  console.log('------------------------------')

  return referralId
}
