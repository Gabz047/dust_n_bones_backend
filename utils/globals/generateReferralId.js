import { Op } from 'sequelize'

/**
 * Gera um referralId incremental.
 * - Se branchId é nulo: incrementa todo o número do último registro.
 * - Se branchId existe: incrementa apenas o sufixo da filial.
 */
export async function generateReferralId({
  model,
  transaction,
  companyId,
  branchId = null,
  referralField = 'referral_id',
  suffixLength = 3
}) {
  if (!model) throw new Error('Model é obrigatório')

  const companyPrefix = String(companyId || '').padStart(2, '0')
  const branchPrefix = branchId != null ? String(branchId).padStart(2, '0') : ''
  const basePrefix = `${companyPrefix}${branchPrefix}`

  // Pega o último registro da model
  const lastItem = await model.findOne({
    order: [[referralField, 'DESC']],
    transaction,

  })

  let nextSuffix = 1
 console.log('LASTTTT', lastItem)
  if (lastItem) {
    const lastStr = String(lastItem.referralId)
   
    if (branchId != null) {
      // Pega apenas o sufixo da filial
      const suffixStr = lastStr.slice(-suffixLength)
      const suffixNum = Number(suffixStr)
      nextSuffix = isNaN(suffixNum) ? 1 : suffixNum + 1
    } else {
      // Pega todo o número do último referralId e incrementa
      const num = Number(lastStr)
      nextSuffix = isNaN(num) ? 1 : num + 1
    }
  }

  const referralId = branchId != null
    ? `${basePrefix}${String(nextSuffix).padStart(suffixLength, '0')}`
    : String(nextSuffix).padStart(suffixLength, '0')

  return referralId
}
