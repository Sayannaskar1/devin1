// backend/routes/project.routes.js
import express from 'express';
const router = express.Router();
import { body } from 'express-validator';

import * as projectController from '../controllers/project.controller.js'; // Corrected path
import { authUser } from '../middleware/auth.middleware.js'; // Corrected path


router.post('/create',
    authUser,
    body('name').isString().withMessage('Name is required'),
    projectController.createProject
);

router.get('/all',
    authUser,
    projectController.getAllProject
);

router.put('/add-user',
    authUser,
    body('projectId').isString().withMessage('Project ID is required'),
    body('users').isArray({ min: 1 }).withMessage('Users must be an array of strings').bail()
        .custom((users) => users.every(user => typeof user === 'string')).withMessage('Each user must be a string'),
    projectController.addUserToProject
);

router.get('/:projectId', // Route to get a single project by ID
    authUser,
    projectController.getProjectById
);

router.put('/update-file-tree',
    authUser,
    body('projectId').isString().withMessage('Project ID is required'),
    body('fileTree').isObject().withMessage('File tree is required'),
    projectController.updateFileTree
);

router.put('/:projectId', // Route to update a project (e.g., name)
    authUser,
    body('name').isString().notEmpty().withMessage('Project name is required'),
    projectController.updateProject
);

router.delete('/:projectId', // Route to delete a project
    authUser,
    projectController.deleteProject
);


export default router;
