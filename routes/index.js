import express from 'express';
import specieRoutes from './specie.js';
import boneRoutes from './bone.js';

const router = express.Router();

// Rota de teste da API (pública)
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: "API Dust n' Bones funcionando!",
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Rotas principais
router.use('/species', specieRoutes);
router.use('/bones', boneRoutes);

export default router;
