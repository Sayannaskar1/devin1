// backend/controllers/ai.controller.js
import * as aiService from '../services/ai.service.js'; // Corrected: Use import, .service.js

export const getResult = async (req, res) => {
    try {
        const { prompt } = req.query;
        const result = await aiService.generateResult(prompt);
        res.send(result);
    } catch (error) {
        console.error('Error in AI controller getResult:', error);
        res.status(500).send({ message: error.message || 'Error generating AI result.' });
    }
};
