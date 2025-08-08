// backend/routes/user.routes.js
import express from 'express';
const router = express.Router();
import { body } from 'express-validator';

import * as userController from '../controllers/user.controller.js';
import { authUser } from '../middleware/auth.middleware.js';

router.post('/register',
    body('email').isEmail().withMessage('Email must be a valid email address'),
    body('password').isLength({ min: 3 }).withMessage('Password must be at least 3 characters long'),
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('username').isString().notEmpty().withMessage('Username is required'),
    body('age').isInt({ min: 0, max: 120 }).withMessage('Age must be a number between 0 and 120'),
    userController.createUserController
);

router.post('/login',
    body('email').isEmail().withMessage('Email must be a valid email address'),
    body('password').isLength({ min: 3 }).withMessage('Password must be at least 3 characters long'),
    userController.loginController
);

router.get('/profile', authUser, userController.profileController);

router.get('/all', authUser, userController.getAllUsersController);

router.get('/logout', authUser, userController.logoutController);

export default router; // CHANGED: Use export default
