import { Sequelize, Op } from 'sequelize'

export async function buildQueryOptions(req, model = null, extraOptions = {}) {
  const { page, limit, sort = 'createdAt', order = 'DESC', fields, term } = req.query
  const where = {}

  // Campos categorizados
  const numericFields = ['id', 'referral_id']
  const textFields = ['observation', 'title', 'name', 'userId']
  const dateFields = ['date', 'createdAt', 'updatedAt']

  console.log('NUMERIC FIELDS:', numericFields)
  console.log('TEXT FIELDS:', textFields)
  console.log('DATE FIELDS:', dateFields)

  // 🔍 Filtro de busca
  if (fields && term) {
    // ✅ Compatível com string ou array
    const searchFields = Array.isArray(fields)
      ? fields
      : fields.split(',').map(f => f.trim())

    where[Op.or] = []

    searchFields.forEach(field => {
      if (numericFields.includes(field)) {
        const numericTerm = Number(term)
        if (!isNaN(numericTerm)) {
          where[Op.or].push({ [field]: numericTerm })
        }
      } else if (textFields.includes(field)) {
        where[Op.or].push(
          Sequelize.where(Sequelize.col(field), { [Op.iLike]: `%${term}%` })
        )
      } else if (dateFields.includes(field)) {
        const date = new Date(term)
        if (!isNaN(date.getTime())) {
          const nextDay = new Date(date)
          nextDay.setDate(nextDay.getDate() + 1)
          where[Op.or].push({
            [field]: {
              [Op.gte]: date,
              [Op.lt]: nextDay,
            },
          })
        }
      }
    })
  }

  // Paginação
  const pagination = {}
  if (page && limit) {
    pagination.page = parseInt(page)
    pagination.limit = parseInt(limit)
    pagination.offset = (pagination.page - 1) * pagination.limit
  }

  const orderBy = [[sort, order.toUpperCase()]]
  if (!model) return { where, pagination, orderBy }

  const findOptions = { where, order: orderBy, ...extraOptions }
  if (pagination.limit) {
    findOptions.limit = pagination.limit
    findOptions.offset = pagination.offset
  }

  const { count, rows } = await model.findAndCountAll(findOptions)
  const totalPages = pagination.limit ? Math.ceil(count / pagination.limit) : 1

  return {
    data: rows,
    count,
    pagination: pagination.limit
      ? { total: count, page: pagination.page, limit: pagination.limit, totalPages }
      : null,
  }
}
