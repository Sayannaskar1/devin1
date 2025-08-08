// backend/routes/ai.routes.js
import express from 'express';
const router = express.Router();
import * as aiController from '../controllers/ai.controller.js'; // Corrected path

router.get('/get-result', aiController.getResult);

export default router;
