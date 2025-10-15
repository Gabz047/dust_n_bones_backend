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
  console.log('➡️ model:', model.name)
  console.log('➡️ companyId:', companyId)
  console.log('➡️ referralField:', referralField)
  console.log('➡️ suffixLength:', suffixLength)

  let whereCondition = {}
  let include = []

  if (model.name === 'Movement') {
    // Movement → Item → Company
    whereCondition = { '$item.company_id$': companyId }
    include = [
      {
        model: model.sequelize.models.Item,
        as: 'item',
        required: true // força INNER JOIN
      }
    ]
    console.log('🔹 [Movement] whereCondition:', whereCondition)
    console.log('🔹 [Movement] include:', include)
  } else if (model.name === 'Expedition') {
    whereCondition = { '$project.company_id$': companyId }
    include = [
      {
        model: model.sequelize.models.Project,
        as: 'project',
        required: true // força INNER JOIN
      }
    ]
  } else if (model.name === 'Box') {
    whereCondition = { '$project.company_id$': companyId }
    include = [
      {
        model: model.sequelize.models.Project,
        as: 'project',
        required: true // força INNER JOIN
      }
    ]
  } else if (model.name === 'ProductionOrder') {
    whereCondition = { '$project.company_id$': companyId }
    include = [
      {
        model: model.sequelize.models.Project,
        as: 'project',
        required: true // força INNER JOIN
      }
    ]
  } else {
    // padrão: company_id direto
    whereCondition = { company_id: companyId }
    console.log('🔹 [Default] whereCondition:', whereCondition)
  }

  console.log('🔍 Procurando último item com order DESC...')
  const lastItem = await model.findOne({
    where: whereCondition,
    order: [[referralField, 'DESC']],
    transaction,
    include
  })

  if (!lastItem) {
    console.log('📦 Nenhum item encontrado, começando do 1')
  } else {
    console.log('📦 Último item retornado:')
    console.log('   - id:', lastItem.id)
    console.log('   - referralId (Movement):', lastItem.referralId)
    if (lastItem.item) {
      console.log('   - item.id:', lastItem.item.id)
      console.log('   - item.referralId:', lastItem.item.referralId)
      console.log('   - item.companyId:', lastItem.item.company_id || lastItem.item.companyId)
    }
  }

  let nextSuffix = 1
  if (lastItem) {
    const lastStr = String(lastItem.referralId)
    console.log('🔢 lastStr:', lastStr)
    const num = parseInt(lastStr.replace(/\D/g, ''), 10)
    console.log('🔢 num extraído do lastStr:', num)
    nextSuffix = isNaN(num) ? 1 : num + 1
    console.log('🔢 nextSuffix calculado:', nextSuffix)
  }

  const referralId = String(nextSuffix).padStart(suffixLength, '0')
  console.log('✅ referralId final gerado:', referralId)

  return referralId
}
