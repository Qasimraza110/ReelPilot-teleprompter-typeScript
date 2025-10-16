const mongoose = require("mongoose");
require("dotenv").config();
const url = process.env.MONGODB_URL;

const client = () =>
  mongoose
    .connect(url)
    .then(() => console.log("MongoDB Connected..."))
    .catch((err) => console.error(err));

module.exports = client;
