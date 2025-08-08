// backend/controllers/project.controller.js
import Project from '../models/project.model.js'; // Corrected: Use import, .model.js
import User from '../models/user.model.js'; // Corrected: Use import, .model.js
import * as projectService from '../services/project.service.js'; // Corrected: Use import, .service.js
import { validationResult } from 'express-validator'; // Corrected: Use import


export const createProject = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name } = req.body;
        const loggedInUser = await User.findById(req.user.id);
        if (!loggedInUser) {
            return res.status(404).json({ message: 'Logged in user not found.' });
        }
        const userId = loggedInUser._id;

        const newProject = await projectService.createProject({ name, userId });

        res.status(201).json(newProject);

    } catch (err) {
        console.error("Error creating project:", err);
        res.status(400).send({ message: err.message || 'Error creating project.' });
    }
};

export const getAllProject = async (req, res) => {
    try {
        const loggedInUser = await User.findById(req.user.id);
        if (!loggedInUser) {
            return res.status(404).json({ message: 'Logged in user not found.' });
        }

        const allUserProjects = await projectService.getAllProjectByUserId({
            userId: loggedInUser._id
        });

        return res.status(200).json({
            projects: allUserProjects
        });

    } catch (err) {
        console.error("Error getting all projects:", err);
        res.status(400).json({ error: err.message || 'Error fetching projects.' });
    }
};

export const addUserToProject = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId, users } = req.body;
        const loggedInUser = await User.findById(req.user.id);
        if (!loggedInUser) {
            return res.status(404).json({ message: 'Logged in user not found.' });
        }

        const project = await projectService.addUsersToProject({
            projectId,
            users, // 'users' here is an array of user IDs
            userId: loggedInUser._id // The ID of the user performing the action
        });

        return res.status(200).json({
            project,
        });

    } catch (err) {
        console.error("Error adding user to project:", err);
        res.status(400).json({ error: err.message || 'Error adding collaborators.' });
    }
};

export const getProjectById = async (req, res) => {
    const { projectId } = req.params;

    try {
        const project = await projectService.getProjectById({ projectId });
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        return res.status(200).json({
            project
        });

    } catch (err) {
        console.error("Error getting project by ID:", err);
        res.status(400).json({ error: err.message || 'Error fetching project by ID.' });
    }
};

export const updateFileTree = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId, fileTree } = req.body;

        const project = await projectService.updateFileTree({
            projectId,
            fileTree
        });
        if (!project) {
            return res.status(404).json({ message: 'Project not found after update attempt.' });
        }

        return res.status(200).json({
            project
        });

    } catch (err) {
        console.error("Error updating file tree:", err);
        res.status(400).json({ error: err.message || 'Error updating file tree.' });
    }
};

export const updateProject = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId } = req.params;
        const { name } = req.body;
        const loggedInUser = await User.findById(req.user.id);
        if (!loggedInUser) {
            return res.status(404).json({ message: 'Logged in user not found.' });
        }

        const updatedProject = await projectService.updateProject({ projectId, name, userId: loggedInUser._id });
        if (!updatedProject) {
            return res.status(404).json({ message: 'Project not found or user unauthorized to update.' });
        }
        res.status(200).json({ message: 'Project updated successfully!', project: updatedProject });
    } catch (err) {
        console.error("Error updating project:", err);
        res.status(400).json({ error: err.message || 'Error updating project.' });
    }
};

export const deleteProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const loggedInUser = await User.findById(req.user.id);
        if (!loggedInUser) {
            return res.status(404).json({ message: 'Logged in user not found.' });
        }

        const result = await projectService.deleteProject({ projectId, userId: loggedInUser._id });
        if (!result) {
            return res.status(404).json({ message: 'Project not found or user unauthorized to delete.' });
        }
        res.status(200).json({ message: 'Project deleted successfully!' });
    } catch (err) {
        console.error("Error deleting project:", err);
        res.status(400).json({ error: err.message || 'Error deleting project.' });
    }
};
