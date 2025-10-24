import express from 'express';
import SpecieController from '../controllers/veterinary/SpecieController.js';

const router = express.Router();

// Criar uma nova espécie
router.post('/', SpecieController.create);

// Listar todas as espécies (com filtros e ordenação)
router.get('/', SpecieController.getAll);

// Obter uma espécie específica
router.get('/:id', SpecieController.getById);

// Atualizar uma espécie
router.put('/:id', SpecieController.update);

// Deletar uma espécie
router.delete('/:id', SpecieController.delete);

export default router;
