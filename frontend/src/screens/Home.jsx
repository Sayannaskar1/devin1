



// frontend/src/screens/Home.jsx
import React, { useContext, useState, useEffect, useRef } from 'react';
import { UserContext } from '../context/user.context';
import axios from "../config/axios";
import { useNavigate } from 'react-router-dom';

const Home = () => {
    // Destructure user and setUser from UserContext
    // setUser is crucial for logging out
    const { user, setUser } = useContext(UserContext);
    const navigate = useNavigate();

    // State for modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);

    // State for project data
    const [projectName, setProjectName] = useState(''); // For new project input
    const [projects, setProjects] = useState([]);
    const [projectToEdit, setProjectToEdit] = useState(null); // Stores project object when editing
    const [projectToDelete, setProjectToDelete] = useState(null); // Stores project object when deleting

    // State for user feedback messages
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' or 'error'

    // State for managing open/closed state of individual project menus
    const [openMenuId, setOpenMenuId] = useState(null);
    const menuRef = useRef(null); // Ref for detecting clicks outside menu

    // New state for dynamic column layout
    const [gridCols, setGridCols] = useState(4); // Default to 4 columns

    // Function to show temporary messages
    const showMessage = (text, type) => {
        setMessage(text);
        setMessageType(type);
        setTimeout(() => {
            setMessage('');
            setMessageType('');
        }, 3000); // Message disappears after 3 seconds
    };

    // --- API Calls ---

    // Fetches all projects from the backend
    const fetchProjects = async () => {
        try {
            const res = await axios.get('/projects/all');
            setProjects(res.data.projects || []);
        } catch (err) {
            console.error('Error fetching projects:', err);
            showMessage('Failed to load projects.', 'error');
        }
    };

    // Creates a new project
    const createProject = async (e) => {
        e.preventDefault();
        if (!projectName.trim()) {
            showMessage('Project name cannot be empty.', 'error');
            return;
        }

        try {
            const res = await axios.post('/projects/create', {
                name: projectName.trim(),
            });

            // Close modal and reset form
            setIsCreateModalOpen(false);
            setProjectName('');

            // Optimistically add new project to list
            const newProject = res.data.project;
            if (newProject) {
                setProjects(prev => [...prev, newProject]);
                showMessage('Project created successfully!', 'success');
            } else {
                // Fallback: fetch fresh list from server if response format uncertain
                fetchProjects();
            }
        } catch (error) {
            console.error('Error creating project:', error);
            showMessage('Could not create the project. Please try again.', 'error');
        }
    };

    // Updates an existing project
    const updateProject = async (e) => {
        e.preventDefault();
        if (!projectToEdit || !projectToEdit.name.trim()) {
            showMessage('Project name cannot be empty.', 'error');
            return;
        }

        try {
            const res = await axios.put(`/projects/${projectToEdit._id}`, {
                name: projectToEdit.name.trim(),
            });

            // Close modal
            setIsEditModalOpen(false);
            setProjectToEdit(null);

            // Update project in local state
            setProjects(prev =>
                prev.map(p => (p._id === res.data.project._id ? res.data.project : p))
            );
            showMessage('Project updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating project:', error);
            showMessage('Could not update the project. Please try again.', 'error');
        }
    };

    // Deletes a project
    const deleteProject = async () => {
        if (!projectToDelete) return;

        try {
            await axios.delete(`/projects/${projectToDelete._id}`);

            // Close modal and clear projectToDelete
            setIsConfirmDeleteModalOpen(false);
            setProjectToDelete(null);

            // Remove project from local state
            setProjects(prev => prev.filter(p => p._id !== projectToDelete._id));
            showMessage('Project deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting project:', error);
            showMessage('Could not delete the project. Please try again.', 'error');
        }
    };

    // --- Handlers for UI interactions ---

    const handleEditClick = (project) => {
        setProjectToEdit({ ...project }); // Create a copy to avoid direct state mutation
        setIsEditModalOpen(true);
        setOpenMenuId(null); // Close menu after action
    };

    const handleDeleteClick = (project) => {
        setProjectToDelete(project);
        setIsConfirmDeleteModalOpen(true);
        setOpenMenuId(null); // Close menu after action
    };

    const toggleMenu = (projectId, event) => {
        event.stopPropagation(); // Prevent card click from firing
        setOpenMenuId(openMenuId === projectId ? null : projectId);
    };

    // --- Logout Function ---
    const handleLogout = () => {
        // Call setUser from context with null to clear user state and token
        setUser(null);
        navigate('/login'); // Redirect to login page
    };

    // --- Effects ---

    // Fetch projects on component mount
    useEffect(() => {
        fetchProjects();
    }, []);

    // Effect to handle clicks outside the menu to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openMenuId]); // Re-run effect if menu state changes

    // --- Render ---

    // Dynamically generate grid column classes
    const gridClass = `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-${gridCols}`;

    return (
        <main className="min-h-screen bg-gray-900 text-gray-100 p-8 font-inter">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <h1 className="text-4xl font-extrabold text-blue-400">Your Projects</h1>
                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300
                                   focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                        Logout
                    </button>
                </div>

                {/* Message Display */}
                {message && (
                    <div className={`fixed top-6 right-6 p-4 rounded-lg shadow-xl z-50 transition-all duration-300 transform
                        ${messageType === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}
                        ${message ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
                        {message}
                    </div>
                )}

                {/* Column Layout Controls */}
                <div className="flex justify-end mb-6 space-x-2">
                    <span className="text-gray-400 text-sm mr-2 self-center">View as:</span>
                    {[1, 2, 3, 4].map((cols) => (
                        <button
                            key={cols}
                            onClick={() => setGridCols(cols)}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-200
                                        ${gridCols === cols ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
                                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900`}
                            title={`${cols} Column View`}
                        >
                            {cols} Col
                        </button>
                    ))}
                </div>

                <div className={`grid ${gridClass} gap-8`}>
                    {/* New Project Button */}
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-blue-600 rounded-2xl
                                   text-blue-400 hover:bg-blue-900/20 transition-all duration-300 cursor-pointer
                                   min-h-[180px] shadow-lg hover:shadow-xl group
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                        <i className="ri-add-line text-5xl mb-3 group-hover:scale-110 transition-transform"></i>
                        <span className="text-xl font-semibold">New Project</span>
                    </button>

                    {/* Existing Projects */}
                    {projects.map((project) => (
                        <div
                            key={project._id}
                            className="relative flex flex-col justify-between p-7 bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl
                                       transition-all duration-300 border border-gray-700 hover:border-blue-600 min-h-[180px]"
                        >
                            {/* Project Info - Clickable area */}
                            <div
                                onClick={() => navigate('/project', { state: { project } })}
                                className="cursor-pointer flex-grow pb-4" // Added padding-bottom to separate from menu
                            >
                                <h2 className="text-2xl font-bold mb-2 text-blue-300">{project.name}</h2>
                                <div className="flex items-center text-sm text-gray-400">
                                    <i className="ri-user-line mr-2"></i>
                                    <span>{project.users?.length || 0} Collaborators</span>
                                </div>
                            </div>

                            {/* Three-dot menu */}
                            <div className="absolute top-4 right-4" ref={openMenuId === project._id ? menuRef : null}>
                                <button
                                    onClick={(e) => toggleMenu(project._id, e)}
                                    className="p-2 rounded-full text-gray-400 hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    title="More options"
                                >
                                    <i className="ri-more-2-fill text-xl"></i>
                                </button>
                                {openMenuId === project._id && (
                                    <div className="absolute right-0 mt-2 w-40 bg-gray-700 rounded-lg shadow-xl py-2 z-10 border border-gray-600 animate-fade-in">
                                        <button
                                            onClick={() => handleEditClick(project)}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 transition-colors"
                                        >
                                            <i className="ri-edit-line mr-2"></i> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(project)}
                                            className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-600 transition-colors"
                                        >
                                            <i className="ri-delete-bin-line mr-2"></i> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Create Project Modal */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-40 p-4">
                        <div className="bg-gray-800 p-10 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
                            <h2 className="text-3xl font-bold mb-8 text-blue-300 text-center">Create New Project</h2>
                            <form onSubmit={createProject}>
                                <div className="mb-6">
                                    <label htmlFor="newProjectName" className="block text-sm font-medium text-gray-300 mb-2">
                                        Project Name
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            id="newProjectName"
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                            className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg shadow-sm
                                                       text-gray-100 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                                            required
                                            placeholder="Enter project name"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-4">
                                    <button
                                        type="button"
                                        className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors duration-300
                                                   focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                                        onClick={() => {
                                            setIsCreateModalOpen(false);
                                            setProjectName(''); // Clear input on cancel
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300
                                                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                                    >
                                        Create
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Project Modal */}
                {isEditModalOpen && projectToEdit && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-40 p-4">
                        <div className="bg-gray-800 p-10 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
                            <h2 className="text-3xl font-bold mb-8 text-blue-300 text-center">Edit Project</h2>
                            <form onSubmit={updateProject}>
                                <div className="mb-6">
                                    <label htmlFor="editProjectName" className="block text-sm font-medium text-gray-300 mb-2">
                                        Project Name
                                    </label>
                                    <input
                                        type="text"
                                        id="editProjectName"
                                        value={projectToEdit.name}
                                        onChange={(e) => setProjectToEdit({ ...projectToEdit, name: e.target.value })}
                                        className="mt-1 block w-full p-3 bg-gray-700 border border-gray-600 rounded-lg shadow-sm
                                                   text-gray-100 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end space-x-4">
                                    <button
                                        type="button"
                                        className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors duration-300
                                                   focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                                        onClick={() => {
                                            setIsEditModalOpen(false);
                                            setProjectToEdit(null); // Clear project to edit on cancel
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300
                                                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {isConfirmDeleteModalOpen && projectToDelete && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-40 p-4">
                        <div className="bg-gray-800 p-10 rounded-xl shadow-2xl w-full max-w-sm text-center border border-gray-700">
                            <h2 className="text-3xl font-bold mb-6 text-red-400">Confirm Deletion</h2>
                            <p className="text-gray-300 mb-8">
                                Are you sure you want to delete project "<span className="font-semibold text-blue-300">{projectToDelete.name}</span>"?
                                This action cannot be undone.
                            </p>
                            <div className="flex justify-center space-x-4">
                                <button
                                    type="button"
                                    className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors duration-300
                                                   focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                                    onClick={() => {
                                        setIsConfirmDeleteModalOpen(false);
                                        setProjectToDelete(null);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300
                                                   focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                                    onClick={deleteProject}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default Home;
