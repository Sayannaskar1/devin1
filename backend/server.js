// backend/server.js
import 'dotenv/config'; // ES Module way to load dotenv

console.log('--- server.js: Starting execution ---');
console.log('DEBUG: process.env.DB_URL =', process.env.DB_URL);
console.log('DEBUG: process.env.SESSION_SECRET =', process.env.SESSION_SECRET);
console.log('DEBUG: process.env.GEMINI_API_KEY =', process.env.GEMINI_API_KEY);
console.log('DEBUG: process.env.FRONTEND_URL =', process.env.FRONTEND_URL);


import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import app from './app.js';
import connectDB from './db/db.js';
import Project from './models/project.model.js';
import { generateResult, initializeAIModel } from './services/ai.service.js';

const port = process.env.PORT || 5000;

connectDB();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];
        const projectId = socket.handshake.query.projectId;

        console.log('Socket Auth Middleware: Token present:', !!token, 'ProjectId:', projectId);

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            console.error('Socket Auth Middleware: Invalid projectId received:', projectId);
            return next(new Error('Invalid projectId'));
        }

        socket.project = await Project.findById(projectId);

        if (!socket.project) {
            console.error('Socket Auth Middleware: Project not found for ID:', projectId);
            return next(new Error('Project not found'));
        }

        if (!token) {
            console.error('Socket Auth Middleware: No token provided.');
            return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.SESSION_SECRET);

        if (!decoded) {
            console.error('Socket Auth Middleware: Invalid token received.');
            return next(new Error('Authentication error: Invalid token'));
        }

        socket.user = decoded;

        if (!socket.project.users.some(user => user.toString() === socket.user.id)) {
            console.error('Socket Auth Middleware: User not authorized for project:', socket.user.id, projectId);
            return next(new Error('Unauthorized access to project socket'));
        }

        console.log('Socket Auth Middleware: Connection authorized for user:', socket.user.email, 'project:', projectId);
        next();

    } catch (error) {
        console.error('Socket.IO authentication error:', error.message);
        next(new Error(`Authentication failed: ${error.message}`));
    }
});

io.on('connection', socket => {
    socket.roomId = socket.project._id.toString();

    console.log('A user connected to Socket.IO:', socket.id, 'to room:', socket.roomId);

    socket.join(socket.roomId);

    // --- Unified Message Handler ---
    // Listen for both 'project-message' (regular chat) and 'ai-prompt' events
    socket.on('project-message', async data => {
        console.log('Socket Event: project-message received:', data); // DEBUG LOG
        // Broadcast regular message to others in the room
        socket.broadcast.to(socket.roomId).emit('project-message', data);
    });

    socket.on('ai-prompt', async data => { // NEW: Listen for 'ai-prompt' directly
        console.log('Socket Event: ai-prompt received:', data); // DEBUG LOG
        const messageContent = data.message;
        const prompt = messageContent.trim(); // Prompt is already extracted by frontend

        console.log('Socket Event: AI prompt detected. Extracted prompt:', prompt);

        try {
            const result = await generateResult(prompt);
            console.log('Socket Event: AI response generated. Result:', result.substring(0, 100) + '...');

            io.to(socket.roomId).emit('project-message', { // Emit AI response as a 'project-message'
                message: result, // This is expected to be stringified JSON from ai.service.js
                sender: {
                    _id: 'ai',
                    email: 'AI'
                },
                projectId: socket.roomId
            });
        } catch (aiError) {
            console.error('Socket Event: Error generating AI response:', aiError);
            io.to(socket.roomId).emit('project-message', {
                message: JSON.stringify({ type: 'text', content: `AI Error: ${aiError.message || 'Failed to get AI response.'}` }),
                sender: {
                    _id: 'ai',
                    email: 'AI'
                },
                projectId: socket.roomId
            });
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('User disconnected from Socket.IO:', socket.id, 'Reason:', reason);
        socket.leave(socket.roomId);
    });
});

// Start the HTTP server
server.listen(port, () => {
    console.log(`Backend server is running on http://localhost:${port}`);
    initializeAIModel(); // Initialize AI model after server starts
});
