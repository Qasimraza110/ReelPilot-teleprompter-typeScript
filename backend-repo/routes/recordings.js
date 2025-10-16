const express = require("express");
const router = express.Router();
const multer = require('multer')

const upload = multer({
  storage: multer.memoryStorage() // Store the file in memory as a Buffer
});

const {
  getSavedRecordings,
  saveRecording,
  deleteRecording,
} = require("../controllers/recordingsController");
const { analyzeRecording, analyzeDirect } = require("../controllers/analysisController");

router.get("/getAll", getSavedRecordings);
router.post("/upload", upload.single("video"), saveRecording);
router.delete("/delete", deleteRecording)
router.post("/:id/analyze", analyzeRecording)
// New: analyze video directly without saving to DB
router.post("/analyze-direct", upload.single("video"), analyzeDirect)

module.exports = router;
