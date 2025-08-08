// // backend/db/db.js
// import mongoose from 'mongoose'; // Import mongoose

// const connectDB = async () => {
//     try {
//         await mongoose.connect(process.env.DB_URL, {
//             useNewUrlParser: true,
//             useUnifiedTopology: true
//         });
//         console.log('MongoDB connected successfully!');
//     } catch (err) {
//         console.error('MongoDB connection failed:', err.message);
//         // Exit process with failure
//         process.exit(1);
//     }
// };

// export default connectDB; // Export the connection function
// backend/db/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully!');
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        process.exit(1); // Exit process with failure
    }
};

export default connectDB; // Export the connection function
