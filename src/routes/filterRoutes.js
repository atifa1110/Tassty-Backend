import express from 'express'
import { FilterController } from '../controllers/filterController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js'

const router = express.Router()
const authMiddleware = new AuthMiddleware();

router.get('/', authMiddleware.authenticate, FilterController.getFilterMetadata)

export default router
