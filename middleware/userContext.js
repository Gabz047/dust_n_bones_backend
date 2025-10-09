import { Branch, UserBranch } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Middleware que identifica e injeta a company e branch do usuário logado
 * - Deve ser executado após o authenticateToken
 * - Suporta usuários que têm companyId e branchId ao mesmo tempo
 */
export const resolveEntityContext = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
    }

    let companyId = null;
    let branchId = null;

    if (req.entityType === 'account') {
      // Accounts sempre têm company
      companyId = req.user.companyId;

    } else if (req.entityType === 'user') {
      // Primeiro tenta company direto
      if (req.user.companyId) companyId = req.user.companyId;

      // Depois tenta branch direto
      if (req.user.branchId) branchId = req.user.branchId;

      // Ou pega o primeiro branch atribuído via UserBranch
      if (!branchId && req.user.id) {
        const userBranch = await UserBranch.findOne({
          where: { userId: req.user.id },
          include: [{ model: Branch, as: 'branch' }]
        });
        if (userBranch) {
          branchId = userBranch.branch.id;
          if (!companyId && userBranch.branch.companyId) companyId = userBranch.branch.companyId;
        }
      }
    }

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Não foi possível determinar a empresa do usuário.' });
    }

    /**
     * Ajuste para suportar filtros de estoque:
     * - branchId pode existir
     * - Se branchId existir, vamos permitir que o filtro pegue tanto os itens da filial quanto os da empresa (branchId null)
     */
    req.context = { 
      companyId, 
      branchId // branchId vai existir, mas os filtros devem usar [branchId, null]
    };
    req.companyId = companyId;
    req.branchId = branchId;

    next();

  } catch (error) {
    console.error('Erro ao resolver contexto de empresa/filial:', error);
    return res.status(500).json({ success: false, message: 'Erro ao determinar empresa/filial.' });
  }
};
