const express = require("express");
const router = express.Router();

const {
  getUserProfile,
  updateUserSettings,
  getUserSettings,
  getUserPlan,
  saveSettings,
  getSavedRecordings
} = require("../controllers/userController");

router.get("/profile", getUserProfile);
router.get("/settings", getUserSettings);
router.put("/updateSettings", updateUserSettings);
router.get("/getPlan", getUserPlan);
router.post("/saveSettings", saveSettings)
router.get("/getSavedRecordings", getSavedRecordings)

module.exports = router;
