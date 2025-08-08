// backend/services/user.service.js
import User from '../models/user.model.js'; // Corrected: Use import, .model.js extension


export const createUser = async (userData) => { // Expects an object with all user fields
    // Password hashing is now handled in user.model.js pre-save hook.
    // No need to hash here explicitly.
    if (!userData.email || !userData.password || !userData.name || !userData.username) {
        throw new Error('Email, password, name, and username are required.');
    }

    // The userModel.create will trigger the pre-save hook to hash the password
    const user = await User.create(userData);

    // Return the user object (password will be excluded if 'select: false' is used in schema)
    return user;
};

export const getAllUsers = async ({ userId }) => {
    if (!userId) {
        throw new Error('UserId is required');
    }
    // Find all users except the one with the provided userId
    // Removed 'profilepicture' from select as per your instruction (no public folder)
    const users = await User.find({ _id: { $ne: userId } }).select('email username');
    return users;
};

// Export functions using ES Module named exports
// This matches the import * as userService from ... in controllers
// and import { createUser, getAllUsers } from ... if used directly
// export {
//     createUser,
//     getAllUsers,
// };
