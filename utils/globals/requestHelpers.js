// src/utils/globals/requestHelpers.js
import { UserBranch } from '../../models/index.js';
import { Op } from 'sequelize';
/**
 * Resolve o companyId a partir do request ou de um fallback.
 * Pode ser usada em qualquer controller.
 */
export function resolveCompanyId(req, fallbackId = null) {
  return req.body?.companyId || req.context?.companyId || fallbackId
}

/**
 * Cria um filtro de acesso baseado no tenant do usuário logado.
 * - Se for company, filtra por companyId.
 * - Se for branch, filtra por branchId e companyId.
 */
export async function userAccessFilter(req) {
  const filter = {}
  const user = req.user
  const tenant = req.userTenant

  // 🔸 fallback: se não tiver contexto, retorna filtro vazio (nenhum acesso)
  if (!tenant && !user) return { companyId: 'BLOCKED' }

  // 🔸 Se veio tenant do tipo empresa → acesso total da empresa
  if (tenant?.type === 'company') {
    filter.companyId = tenant.data.id
    return filter
  }

  // 🔸 Se veio tenant do tipo filial → acesso apenas àquela filial
  if (tenant?.type === 'branch') {
    filter.companyId = tenant.data.companyId
    filter.branchId = tenant.data.id
    return filter
  }

  // 🔸 Se for user comum (sem tenant explícito), busca branches dele
  if (user) {
    const userBranches = await UserBranch.findAll({
      where: { userId: user.id },
      attributes: ['branchId'],
      raw: true
    })

    // Usuário sem branches → vê apenas projetos da empresa
    if (!userBranches.length) {
      filter.companyId = user.companyId
    } else {
      const branchIds = userBranches.map(ub => ub.branchId)
      filter.companyId = user.companyId
      filter.branchId = { [Op.in]: branchIds }
    }

    return filter
  }

  // fallback (nenhum acesso)
  return { companyId: 'BLOCKED' }
}
