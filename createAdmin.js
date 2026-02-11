require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User"); // Change from ../models/User to ./models/User

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "campusshare"
    });

    console.log("📦 Connected to MongoDB");

    const email = "admin@campusshare.com";

    const existing = await User.findOne({ email });
    if (existing) {
      console.log("✅ Admin already exists");
      await mongoose.connection.close();
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = await User.create({
      name: "Admin",
      email,
      password: hashedPassword,
      branch: "CSE",
      semester: 1,
      role: "admin",
    });

    console.log("✅ Admin created successfully:");
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: admin123`);
    console.log(`   Role: ${admin.role}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating admin:", err.message);
    await mongoose.connection.close().catch(console.error);
    process.exit(1);
  }
};

createAdmin();