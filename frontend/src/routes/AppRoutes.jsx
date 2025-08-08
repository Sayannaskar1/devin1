// frontend/src/routes/AppRoutes.jsx
import React, { useContext } from 'react';
import { Route, BrowserRouter, Routes, Navigate } from 'react-router-dom';
import Login from '../screens/Login';
import Register from '../screens/Register';
import Home from '../screens/Home';
import Project from '../screens/Project';
import UserAuth from '../auth/UserAuth';
import { UserContext } from '../context/user.context'; // Import UserContext

const AppRoutes = () => {
    const { user, isLoadingAuth } = useContext(UserContext); // Get user and loading state from context

    return (
        <BrowserRouter>
            <Routes>
                {/* Global Loading State for Auth Check */}
                {isLoadingAuth ? (
                    <Route
                        path="*" // Match all paths while loading auth
                        element={
                            <div className="min-h-screen flex items-center justify-center bg-gray-950 font-inter text-emerald-400 text-2xl animate-pulse">
                                Checking authentication...
                            </div>
                        }
                    />
                ) : (
                    <>
                        {/* If NOT authenticated, redirect root to /login */}
                        {!user && (
                            <Route path="/" element={<Navigate to="/login" replace />} />
                        )}

                        {/* Public Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        {/* Protected Routes - only accessible if user is authenticated */}
                        {/* The UserAuth component will handle internal redirects if somehow accessed directly */}
                        <Route path="/" element={<UserAuth><Home /></UserAuth>} />
                        <Route path="/project" element={<UserAuth><Project /></UserAuth>} />

                        {/* Fallback for any unmatched routes */}
                        {/* If not authenticated and hits unknown route, send to login */}
                        {!user && (
                            <Route path="*" element={<Navigate to="/login" replace />} />
                        )}
                        {/* If authenticated and hits unknown route, send to Home */}
                        {user && (
                            <Route path="*" element={<Navigate to="/" replace />} />
                        )}
                    </>
                )}
            </Routes>
        </BrowserRouter>
    );
};

export default AppRoutes;
