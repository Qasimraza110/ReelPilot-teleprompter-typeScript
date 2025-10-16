const express = require("express");
const router = express.Router();

const { stripe } = require("../controllers/webhookController");

router.post("/stripe", stripe);
router.get("/test", (req, res) => {
  res.json({ message: "webhook test route hit" });
});

module.exports = router;
