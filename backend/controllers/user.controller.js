// backend/controllers/user.controller.js
import User from '../models/user.model.js';
import * as userService from '../services/user.service.js';
import { validationResult } from 'express-validator';
import redisClient from '../services/redis.service.js'; // Corrected: Use default import for redisClient


export const createUserController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const newUser = await userService.createUser(req.body);

        const token = newUser.generateJWT();

        const userWithoutPassword = newUser.toObject();
        delete userWithoutPassword.password;

        res.status(201).json({ user: userWithoutPassword, token });
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(400).send({ message: error.message || 'Error creating user.' });
    }
};

export const loginController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        const isMatch = await user.isValidPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        const token = user.generateJWT();

        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;

        res.status(200).json({ user: userWithoutPassword, token });

    } catch (err) {
        console.error("Error during login:", err);
        res.status(400).send({ message: err.message || 'Error during login.' });
    }
};

export const profileController = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json({ user });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
};

export const logoutController = async (req, res) => {
    try {
        const token = req.cookies.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);

        if (!token) {
            return res.status(400).json({ message: 'No token provided for logout.' });
        }

        // Use redisClient directly as a default import
        await redisClient.set(`blacklist:${token}`, 'true', 'EX', 60 * 60 * 24);

        res.clearCookie('token');

        res.status(200).json({
            message: 'Logged out successfully'
        });

    } catch (err) {
        console.error("Error during logout:", err);
        res.status(400).send({ message: err.message || 'Error during logout.' });
    }
};

export const getAllUsersController = async (req, res) => {
    try {
        const loggedInUser = await User.findById(req.user.id);
        if (!loggedInUser) {
            return res.status(404).json({ message: 'Logged in user not found.' });
        }

        const allUsers = await userService.getAllUsers({ userId: loggedInUser._id });

        return res.status(200).json({
            users: allUsers
        });

    } catch (err) {
        console.error("Error getting all users:", err);
        res.status(400).json({ error: err.message || 'Error fetching all users.' });
    }
};
