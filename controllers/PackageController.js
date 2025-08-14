import Package from '../models/Package.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

class PackageController {
    static async create(req, res) {
        try {
            const { name, type, material, width, height, length, weight } = req.body;

            const packageItem = await Package.create({
                id: uuidv4(),
                name,
                type,
                material,
                width,
                height,
                length,
                weight,
            });

            return res.status(201).json({ success: true, data: packageItem });
        } catch (error) {
            console.error('Erro ao criar embalagem:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao criar embalagem',
                error: error.message
            });
        }
    }

    static async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const { search } = req.query;
            const where = {};

            if (search) {
                where[Op.or] = [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { type: { [Op.iLike]: `%${search}%` } },
                    { material: { [Op.iLike]: `%${search}%` } }
                ];
            }

            const { count, rows } = await Package.findAndCountAll({
                where,
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            res.json({
                success: true,
                data: {
                    packages: rows,
                    pagination: {
                        total: count,
                        page,
                        limit,
                        totalPages: Math.ceil(count / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao buscar embalagens:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;

            const packageItem = await Package.findByPk(id);

            if (!packageItem) {
                return res.status(404).json({
                    success: false,
                    message: 'Embalagem não encontrada'
                });
            }

            res.json({
                success: true,
                data: packageItem
            });
        } catch (error) {
            console.error('Erro ao buscar embalagem:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const packageItem = await Package.findByPk(id);

            if (!packageItem) {
                return res.status(404).json({
                    success: false,
                    message: 'Embalagem não encontrada'
                });
            }

            await packageItem.update(updates);

            res.json({
                success: true,
                message: 'Embalagem atualizada com sucesso',
                data: packageItem
            });
        } catch (error) {
            console.error('Erro ao atualizar embalagem:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;

            const packageItem = await Package.findByPk(id);

            if (!packageItem) {
                return res.status(404).json({
                    success: false,
                    message: 'Embalagem não encontrada'
                });
            }

            await packageItem.destroy();

            res.json({
                success: true,
                message: 'Embalagem removida com sucesso'
            });
        } catch (error) {
            console.error('Erro ao deletar embalagem:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }
}

export default PackageController;
