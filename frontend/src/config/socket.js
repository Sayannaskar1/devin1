// frontend/src/config/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket; // Singleton socket instance

export const initializeSocket = (projectId) => {
    // Only create a new socket if one doesn't exist or if we need to re-initialize for a new project
    if (!socket || (socket && socket.io.opts.query.projectId !== projectId)) { // Re-initialize if projectId changes
        // Disconnect existing socket if projectId changes to prevent old connections
        if (socket) {
            socket.disconnect();
            socket = null; // Clear old socket
        }

        socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            query: { // NEW: Pass projectId as a query parameter during handshake
                projectId: projectId
            },
            // Add auth token to handshake if available, for backend middleware
            auth: {
                token: localStorage.getItem('token') // Pass JWT token for authentication
            }
        });

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            // No need to emit 'join-project' here anymore, as projectId is in handshake query
            // The backend middleware will handle joining the room based on the handshake query.
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
        });
    }
    // If socket already exists and is for the same projectId, just return it.
    return socket;
};

export const sendMessage = (event, data) => {
    if (socket && socket.connected) {
        socket.emit(event, data);
    } else {
        console.warn('Socket not connected. Message not sent:', event, data);
    }
};

export const receiveMessage = (event, callback) => {
    if (socket) {
        socket.on(event, callback);
    } else {
        console.warn('Socket not initialized. Cannot set up message listener.');
    }
};

export const removeMessageListener = (event, callback) => {
    if (socket) {
        socket.off(event, callback);
    }
};

export const getSocket = () => {
    return socket;
};
