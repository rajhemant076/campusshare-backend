const express = require("express");
const router = express.Router();
const aboutController = require("../controllers/aboutController");

// Public routes
router.get("/", aboutController.getAboutInfo);
router.get("/team", aboutController.getTeamMembers);

module.exports = router;