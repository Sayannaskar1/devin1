// backend/services/redis.service.js
import Redis from 'ioredis';

// Ensure environment variables are loaded
if (!process.env.REDIS_HOST || !process.env.REDIS_PORT || !process.env.REDIS_PASSWORD) {
    console.warn("WARNING: Redis environment variables (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD) are not fully set. Redis client may not connect.");
}

const redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10), // Ensure port is parsed as a number
    password: process.env.REDIS_PASSWORD,
    tls: {
        // Required for Upstash Redis to connect securely
        rejectUnauthorized: false // Often needed for cloud Redis services with self-signed certs
    }
});


redisClient.on('connect', () => {
    console.log('Redis connected successfully!');
});

redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
});

export default redisClient; // Export the redisClient instance as a default export
