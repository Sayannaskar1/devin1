// frontend/src/auth/UserAuth.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { UserContext } from '../context/user.context'; // Import your UserContext

const UserAuth = ({ children }) => {
    const { user, isLoadingAuth } = useContext(UserContext);

    // If authentication check is still in progress, render a loading state.
    if (isLoadingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950 font-inter text-emerald-400 text-2xl animate-pulse">
                Checking authentication...
            </div>
        );
    }

    // If user is not authenticated, redirect to the login page
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If user is authenticated, render the children (the protected content)
    return children;
};

export default UserAuth;
