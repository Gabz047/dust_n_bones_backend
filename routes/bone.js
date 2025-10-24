import express from 'express';
import BoneController from '../controllers/veterinary/BoneController.js';

const router = express.Router();

// Criar um novo osso
router.post('/', BoneController.create);

// Listar todos os ossos (com filtros e ordenação)
router.get('/', BoneController.getAll);

router.get('/specie/:id', BoneController.getAllBySpecie);
// Obter um osso específico
router.get('/:id', BoneController.getById);

// Atualizar um osso
router.put('/:id', BoneController.update);

// Deletar um osso
router.delete('/:id', BoneController.delete);

export default router;
