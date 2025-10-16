const express = require("express");
const router = express.Router();

const {
  logIn,
  signUp,
  logOut,
  verifyJWT,
  googleLogin,
  forgotPWD,
  resetPWD,
} = require("../controllers/authController");

router.post("/login", logIn);
router.post("/signup", signUp);
router.post("/forgot-pwd", forgotPWD)
router.post("/reset-pwd", resetPWD)
router.post("/logout", logOut);
router.post("/verifyJWT", verifyJWT);
// Google OAuth Route
router.post("/google", googleLogin);

module.exports = router;
