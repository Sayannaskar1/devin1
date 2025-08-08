



// backend/services/project.service.js
import Project from '../models/project.model.js'; // Corrected: Use import, .model.js
import mongoose from 'mongoose';
import User from '../models/user.model.js'; // Corrected: Use import, .model.js


const createProject = async ({ name, userId }) => {
    if (!name) {
        throw new Error('Name is required');
    }
    if (!userId) {
        throw new Error('UserId is required');
    }

    let project;
    try {
        project = await Project.create({
            name,
            owner: userId, // Assign the user creating the project as the owner
            users: [userId] // Add the owner as the first collaborator
        });
    } catch (error) {
        if (error.code === 11000) {
            throw new Error('Project name already exists');
        }
        throw error;
    }

    return project;
};


const getAllProjectByUserId = async ({ userId }) => {
    if (!userId) {
        throw new Error('UserId is required');
    }

    // Find projects where the userId is either the owner or a collaborator
    const allUserProjects = await Project.find({
        $or: [
            { owner: userId },
            { users: userId }
        ]
    }).populate('users', 'email username'); // Populate collaborator details (removed profilepicture)

    return allUserProjects;
};

const addUsersToProject = async ({ projectId, users, userId }) => { // 'userId' is the ID of the user performing the action
    if (!projectId) {
        throw new Error("projectId is required");
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId");
    }
    if (!users || !Array.isArray(users) || users.length === 0) {
        throw new Error("Users array is required and must not be empty");
    }
    if (users.some(id => !mongoose.Types.ObjectId.isValid(id))) {
        throw new Error("Invalid userId(s) in users array");
    }
    if (!userId) {
        throw new Error("userId (of the acting user) is required");
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid acting userId");
    }

    // Find the project and ensure the acting user is authorized (owner or existing collaborator)
    const project = await Project.findOne({
        _id: projectId,
        $or: [
            { owner: userId },
            { users: userId }
        ]
    });

    if (!project) {
        throw new Error("Project not found or user not authorized to modify it.");
    }

    // Filter out users who are already collaborators
    const currentCollaboratorIds = new Set(project.users.map(u => u.toString()));
    const newUsersToAdd = users.filter(id => !currentCollaboratorIds.has(id));

    if (newUsersToAdd.length === 0) {
        throw new Error("No new users to add or all specified users are already collaborators.");
    }

    // Add new users to the project's users array
    const updatedProject = await Project.findOneAndUpdate(
        { _id: projectId },
        { $addToSet: { users: { $each: newUsersToAdd } } }, // $addToSet prevents duplicates
        { new: true }
    ).populate('users', 'email username'); // Populate to return updated collaborator list

    // Also update the 'projects' array for each newly added user
    await User.updateMany(
        { _id: { $in: newUsersToAdd } },
        { $addToSet: { projects: projectId } }
    );

    return updatedProject;
};

const getProjectById = async ({ projectId }) => {
    if (!projectId) {
        throw new Error("projectId is required");
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId");
    }

    const project = await Project.findOne({ _id: projectId }).populate('users', 'email username'); // Populate users (removed profilepicture)
    return project;
};

const updateFileTree = async ({ projectId, fileTree }) => {
    if (!projectId) {
        throw new Error("projectId is required");
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId");
    }
    if (!fileTree) {
        throw new Error("fileTree is required");
    }

    const project = await Project.findOneAndUpdate(
        { _id: projectId },
        { fileTree },
        { new: true }
    );

    return project;
};

const updateProject = async ({ projectId, name, userId }) => {
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId");
    }
    if (!name || name.trim() === '') {
        throw new Error("Project name is required");
    }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid userId for update authorization");
    }

    const project = await Project.findOne({
        _id: projectId,
        owner: userId // Only owner can update name
    });

    if (!project) {
        throw new Error("Project not found or user not authorized to update.");
    }

    project.name = name.trim();
    await project.save();
    return project;
};

const deleteProject = async ({ projectId, userId }) => {
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId");
    }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid userId for delete authorization");
    }

    const project = await Project.findOne({
        _id: projectId,
        owner: userId // Only owner can delete
    });

    if (!project) {
        throw new Error("Project not found or user not authorized to delete.");
    }

    // Remove project from all associated users' project lists
    await User.updateMany({ projects: projectId }, { $pull: { projects: projectId } });

    await project.deleteOne(); // Use deleteOne()
    return true;
};


export {
    createProject,
    getAllProjectByUserId,
    addUsersToProject,
    getProjectById,
    updateFileTree,
    updateProject,
    deleteProject
};
