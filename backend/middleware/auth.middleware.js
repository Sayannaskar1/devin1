// backend/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';

const authUser = (req, res, next) => {
    let token = req.headers.authorization;

    if (token && token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    } else if (req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.SESSION_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Token verification failed:', err.message);
        res.clearCookie('token');
        res.status(401).json({ message: 'Token is not valid or expired' });
    }
};

export { authUser };
