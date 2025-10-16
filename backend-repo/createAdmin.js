// createAdmin.js (temporary script to run once)
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User");

mongoose.connect(
  "mongodb+srv://ryanbaig:ReelPilot@cluster0.xogoeed.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
); // update this

const createAdmin = async () => {
  const existingAdmin = await User.findOne({ email: "admin@admin.com" });
  if (existingAdmin) {
    console.log("Admin already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash("S3cur3!Admin#2025$", 12);

  const admin = new User({
    name: "Super Admin",
    email: "admin@admin.com",
    password: hashedPassword,
    role: "admin",
  });

  await admin.save();
  console.log("Admin created successfully");
};

createAdmin().then(() => mongoose.disconnect());
