// frontend/src/context/user.context.jsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from '../config/axios'; // Import your configured axios instance

// Create the UserContext
export const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {
    const [user, setUserState] = useState(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true); // New loading state for auth check

    // Function to set user and sync token to localStorage
    // This function is called by login/register pages
    const setUserAndToken = useCallback((userData, token) => {
        setUserState(userData);
        if (userData && token) {
            localStorage.setItem('token', token); // Store the token
        } else {
            localStorage.removeItem('token'); // Remove token on logout or if invalid
        }
    }, []);

    // Effect to perform initial authentication check on mount
    useEffect(() => {
        const checkAuthStatus = async () => {
            setIsLoadingAuth(true); // Start loading
            const token = localStorage.getItem('token');

            if (token) {
                try {
                    // Make a request to the backend to validate the token and get user profile
                    const res = await axios.get('/users/profile');
                    if (res.data.user) {
                        setUserState(res.data.user); // Set user from validated profile
                    } else {
                        // Token might be invalid but API returned 200 with no user
                        localStorage.removeItem('token');
                        setUserState(null);
                    }
                } catch (error) {
                    console.error("Failed to re-authenticate user:", error);
                    // Token is invalid or expired, clear it
                    localStorage.removeItem('token');
                    setUserState(null);
                }
            } else {
                // No token found in localStorage
                setUserState(null);
            }
            setIsLoadingAuth(false); // Auth check complete
        };

        checkAuthStatus();
    }, []); // Empty dependency array means this runs once on mount

    // Expose a simplified setUser for components to use (e.g., for logout)
    // This function will also handle token removal
    const setUser = useCallback((userData) => {
        // If userData is null (e.g., logout), clear token
        if (!userData) {
            localStorage.removeItem('token');
        }
        setUserState(userData);
    }, []);


    return (
        <UserContext.Provider value={{ user, setUser, isLoadingAuth, setUserAndToken }}>
            {children}
        </UserContext.Provider>
    );
};

// Optional: helper hook
// export const useUser = () => useContext(UserContext); // Not explicitly used in provided files
