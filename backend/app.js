// backend/app.js
import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors'; // Import cors

// --- IMPORTANT: Import your Mongoose models ---
import userModel from './models/user.model.js';
import projectModel from './models/project.model.js';

// --- Route imports ---
import userRoutes from './routes/user.routes.js';
import projectRoutes from './routes/project.routes.js';
import aiRoutes from './routes/ai.routes.js';

// --- Middleware for Authentication Check ---
import { authUser } from './middleware/auth.middleware.js';

// --- Express App Setup ---
const app = express();

// --- CORS Configuration - ROBUST FIX ---
const allowedOrigin = process.env.FRONTEND_URL; // Get the URL from environment variable

console.log('DEBUG: CORS Allowed Origin (from .env):', allowedOrigin); // DEBUG LOG

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow requests from the specific FRONTEND_URL set in environment variables
        if (origin === allowedOrigin) {
            console.log('DEBUG: CORS Origin MATCHED:', origin); // DEBUG LOG
            callback(null, true);
        } else {
            console.warn('CORS: Origin NOT ALLOWED:', origin); // DEBUG LOG
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Allow cookies/authorization headers to be sent
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow methods
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'] // Explicitly allow headers
}));

// Handle preflight requests for all routes
app.options('*', cors());


// --- Middleware ---
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Static files (Removed as per your instruction - no public folder) ---
// If you decide to re-add static files, you'll need a 'public' folder
// and uncomment the following lines:
// import path from 'path';
// import { fileURLToPath } from 'url';
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// app.use(express.static(path.join(__dirname, 'public')));


// --- Routes ---
app.use('/users', userRoutes);
app.use('/projects', projectRoutes);
app.use("/ai", aiRoutes);

// Root route - for frontend to hit or simple backend message
app.get('/', (req, res) => {
    res.send('Devin Backend API is running!');
});

// Example of a protected backend route (for testing if needed)
app.get('/dashboard-backend-view', authUser, (req, res) => {
    res.send(`Welcome to the backend dashboard view, ${req.user.email}!`);
});


// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke on the server!');
});

export default app;
