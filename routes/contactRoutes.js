const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");

// Public routes
router.post("/", contactController.submitContactForm);
router.get("/info", contactController.getContactInfo);
router.post("/newsletter", contactController.newsletterSubscribe);

module.exports = router;