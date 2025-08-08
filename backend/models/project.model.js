// backend/models/project.model.js
import mongoose from 'mongoose';


const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        lowercase: true,
        required: true,
        trim: true,
        unique: [ true, 'Project name must be unique' ], // Keep unique constraint as is for now
    },

    owner: { // Added owner field as discussed in routes/projects.js
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', // Reference to the 'user' model (lowercase 'user' as defined in user.model.js)
        required: true
    },
    users: { // Collaborators on the project
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user' // Reference to the 'user' model (lowercase 'user')
        }],
        default: []
    },
    fileTree: { // Stores the project's file structure and content
        type: Object, // Flexible schema for nested files/folders
        default: {}
    },

}, {
    timestamps: true // Added timestamps option for createdAt/updatedAt
});


const Project = mongoose.model('Project', projectSchema); // Model name to 'Project' (capitalized)
export default Project;
