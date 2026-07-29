require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const makeAdmin = async () => {
    const email = process.argv[2];

    if(!email) {
        console.log('Usage: node src/scripts/makeAdmin.js <email>');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);

        const user = await User.findOne({ email });

        if(!user) {
            console.log(`No user found with email: ${email}`);
            process.exit(1);
        }

        user.role = 'admin';
        await user.save();

        console.log(`Success: ${user.name} (${user.email}) is now an admin`);
        process.exit(0);

    } 
    catch(error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

makeAdmin();