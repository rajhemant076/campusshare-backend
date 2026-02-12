const express = require("express");
const router = express.Router();
const featuresController = require("../controllers/featuresController");

// Public routes
router.get("/", featuresController.getFeatures);
router.get("/stats", featuresController.getFeaturesStats);

module.exports = router;