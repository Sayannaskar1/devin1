import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/user.context';
import axios from '../config/axios'; // Assuming this is your configured axios instance

const Register = () => {
    // State for all form fields
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [age, setAge] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(''); // State to hold error messages from backend

    const { setUser, setUserAndToken } = useContext(UserContext); // Get setUserAndToken for full auth flow
    const navigate = useNavigate();

    const submitHandler = async (e) => {
        e.preventDefault();
        setError(''); // Clear any previous error messages on new submission

        try {
            const res = await axios.post('/users/register', {
                name,
                username,
                email,
                age: Number(age), // Ensure age is sent as a number
                password,
            });

            console.log('Registration successful:', res.data);
            // Use setUserAndToken from context to handle both user state and localStorage
            setUserAndToken(res.data.user, res.data.token);
            navigate('/'); // Navigate to home or dashboard on success

        } catch (err) {
            console.error('Registration error:', err);
            // Handle and display error messages from the backend
            if (err.response && err.response.data) {
                if (err.response.data.errors && Array.isArray(err.response.data.errors) && err.response.data.errors.length > 0) {
                    // Display the first validation error message from express-validator
                    setError(err.response.data.errors[0].msg);
                } else if (err.response.data.message) {
                    // Display a general error message from the backend (e.g., "User already exists")
                    setError(err.response.data.message);
                } else {
                    // Fallback for unexpected error response format
                    setError('Registration failed. Please check your input or try again.');
                }
            } else {
                // Network error or other unexpected error
                setError('Registration failed. Could not connect to the server.');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 font-inter">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">Register</h2>
                <form onSubmit={submitHandler}>
                    {error && ( // Display error message if `error` state is not empty
                        <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
                    )}
                    
                    <div className="mb-4">
                        <label className="block text-gray-400 mb-2" htmlFor="name">Name</label>
                        <input
                            onChange={(e) => setName(e.target.value)}
                            type="text"
                            id="name"
                            className="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your full name"
                            value={name}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-400 mb-2" htmlFor="username">Username</label>
                        <input
                            onChange={(e) => setUsername(e.target.value)}
                            type="text"
                            id="username"
                            className="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Choose a username"
                            value={username}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-400 mb-2" htmlFor="email">Email</label>
                        <input
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                            id="email"
                            className="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your email"
                            value={email}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-400 mb-2" htmlFor="age">Age</label>
                        <input
                            onChange={(e) => setAge(e.target.value)}
                            type="number"
                            id="age"
                            className="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your age"
                            value={age}
                            required
                            min="0"
                            max="120"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-400 mb-2" htmlFor="password">Password</label>
                        <input
                            onChange={(e) => setPassword(e.target.value)}
                            type="password"
                            id="password"
                            className="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your password"
                            value={password}
                            required
                            minLength="6" // Matches backend rule
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full p-3 rounded bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                        Register
                    </button>
                </form>
                <p className="text-gray-400 mt-4 text-center">
                    Already have an account? <Link to="/login" className="text-blue-500 hover:underline">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
