// backend/models/user.model.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 100
    },
    username: {
        type: String,
        required: true,
        unique: true, // Ensures username is unique
        minlength: 3,
        maxlength: 30,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true, // Ensures email is unique
        match: /^([a-zA-Z0-9_\-.]+)@([a-zA-Z0-9_\-.]+)\.([a-zA-Z]{2,5})$/, // Basic email regex validation
        index: true
    },
    age: {
        type: Number,
        min: 0, // Minimum age
        max: 120 // Maximum age
    },
    password: {
        type: String,
        required: true,
        select: false, // Exclude password from query results by default
        minlength: 6 // Minimum password length
    },
    projects: { // This is the correct field name for user's associated projects
        type: [{ // This specifies that 'projects' is an array of ObjectIds
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project' // Reference to the 'Project' model (capitalized as per convention)
        }],
        default: [] // Correct placement for default empty array
    }
    // REMOVED: profilepicture field as per your instruction (no public folder for uploads)
}, {
    timestamps: true // This automatically adds createdAt and updatedAt fields (createdAt, updatedAt)
});

// Middleware to hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Method to compare password (instance method)
userSchema.methods.isValidPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Method to generate JWT (instance method)
userSchema.methods.generateJWT = function () {
    // Ensure process.env.SESSION_SECRET is accessible and defined
    if (!process.env.SESSION_SECRET) {
        console.error("SESSION_SECRET is not defined in environment variables!");
        throw new Error("JWT secret not configured.");
    }
    return jwt.sign(
        { id: this._id, email: this.email }, // Include user ID in JWT payload
        process.env.SESSION_SECRET,
        { expiresIn: '24h' }
    );
};

const User = mongoose.model('user', userSchema);
export default User;
