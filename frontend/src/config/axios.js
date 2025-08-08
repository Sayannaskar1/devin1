// frontend/src/config/axios.js
import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', // Use VITE_API_BASE_URL
    withCredentials: true // Important for sending cookies with requests
});

axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Optional: Add a response interceptor to handle token expiration/invalidity
axiosInstance.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid, clear local storage and redirect to login
            localStorage.removeItem('token');
            // This assumes your UserContext would also react to token removal
            // or you might dispatch a global logout action here.
            // For a direct redirect, you'd need history/navigate outside a React component.
            // In UserContext, the checkAuthStatus useEffect handles this on load.
            console.log('Authentication expired or invalid. Redirecting to login.');
            // window.location.href = '/login'; // Direct browser redirect if needed immediately
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
