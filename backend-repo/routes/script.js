const express = require("express");
const router = express.Router();

const {
getUserScripts,
  saveScript,
  getScript,
  deleteScript,
  updateScript,

} = require("../controllers/scriptController");


router.get("/getAll", getUserScripts);
router.post("/save", saveScript);
router.get("/getOne", getScript)
router.delete("/delete", deleteScript)
router.put("/update", updateScript)


module.exports = router;
