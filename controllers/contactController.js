const nodemailer = require("nodemailer");
const Contact = require("../models/Contact"); // Add this import

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message, category } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // ✅ SAVE TO DATABASE
    const contactMessage = await Contact.create({
      name,
      email,
      subject,
      message,
      category: category || 'general',
      status: 'unread'
    });

    console.log("\n📧 CONTACT FORM SUBMISSION SAVED:");
    console.log(`   ID: ${contactMessage._id}`);
    console.log(`   From: ${name} <${email}>`);
    console.log(`   Category: ${category || "General"}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Status: unread`);
    console.log("---\n");

    res.status(200).json({
      success: true,
      message: "Message sent successfully! We'll get back to you within 24-48 hours.",
      messageId: contactMessage._id
    });

  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get contact information
// @route   GET /api/contact/info
// @access  Public
exports.getContactInfo = async (req, res) => {
  try {
    const contactInfo = {
      email: {
        support: "support@campusshare.com",
        admin: "admin@campusshare.com",
        tech: "tech@campusshare.com",
      },
      phone: {
        support: "+1 (555) 123-4567",
        office: "+1 (555) 987-6543",
      },
      address: {
        street: "123 Education Street",
        city: "Tech City",
        state: "TC",
        zip: "12345",
        country: "United States",
      },
      hours: {
        weekday: "9:00 AM - 6:00 PM",
        saturday: "10:00 AM - 4:00 PM",
        sunday: "Closed",
        timezone: "EST",
      },
      social: {
        github: "https://github.com/campusshare",
        twitter: "https://twitter.com/campusshare",
        linkedin: "https://linkedin.com/company/campusshare",
        discord: "https://discord.gg/campusshare",
        instagram: "https://instagram.com/campusshare",
      },
      team: [
        {
          name: "Support Team",
          role: "General Support & Queries",
          email: "support@campusshare.com",
          responseTime: "24 hours",
        },
        {
          name: "Admin Team",
          role: "Resource Approval & Moderation",
          email: "admin@campusshare.com",
          responseTime: "48 hours",
        },
        {
          name: "Technical Team",
          role: "Bugs & Technical Issues",
          email: "tech@campusshare.com",
          responseTime: "12 hours",
        },
      ],
      faqs: [
        {
          id: 1,
          question: "How do I upload a resource?",
          answer: "Login to your account, click on 'Upload' in the navigation menu, fill in the resource details, and upload your PDF file. Your resource will be reviewed by an admin before being published.",
          category: "upload",
        },
        {
          id: 2,
          question: "What file formats are supported?",
          answer: "Currently, we support PDF files only. Maximum file size is 10MB.",
          category: "upload",
        },
        {
          id: 3,
          question: "How long does approval take?",
          answer: "Resources are typically reviewed within 24-48 hours. You'll receive a notification once your resource is approved.",
          category: "general",
        },
        {
          id: 4,
          question: "Is my data secure?",
          answer: "Yes! We use JWT authentication, bcrypt password hashing, and secure HTTPS connections.",
          category: "security",
        },
        {
          id: 5,
          question: "What branches are supported?",
          answer: "We support CSE, ECE, EEE, MECH, CIVIL, IT, and OTHER branches.",
          category: "resources",
        },
        {
          id: 6,
          question: "Can I become an admin?",
          answer: "Admin positions are currently by invitation only. Active contributors may be considered for admin roles in the future.",
          category: "account",
        },
      ],
    };

    res.json({
      success: true,
      data: contactInfo,
    });

  } catch (error) {
    console.error("Get contact info error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching contact information",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// @desc    Subscribe to newsletter
// @route   POST /api/contact/newsletter
// @access  Public
exports.newsletterSubscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email address",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // TODO: Store email in database or connect to newsletter service
    console.log(`📧 Newsletter subscription: ${email}`);

    res.status(200).json({
      success: true,
      message: "Successfully subscribed to newsletter!",
    });

  } catch (error) {
    console.error("Newsletter subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to subscribe. Please try again later.",
    });
  }
};