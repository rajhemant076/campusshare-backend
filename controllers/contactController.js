const nodemailer = require("nodemailer");

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

    // Log contact form submission (for development)
    console.log("\n📧 CONTACT FORM SUBMISSION:");
    console.log(`   From: ${name} <${email}>`);
    console.log(`   Category: ${category || "General"}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Message: ${message}`);
    console.log("---\n");

    // TODO: In production, integrate with email service
    // Example with Nodemailer (uncomment and configure):
    
    // const transporter = nodemailer.createTransport({
    //   service: 'gmail',
    //   auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASS
    //   }
    // });
    //
    // const mailOptions = {
    //   from: `"CampusShare Contact" <${process.env.EMAIL_USER}>`,
    //   to: "support@campusshare.com",
    //   replyTo: email,
    //   subject: `[Contact Form] ${subject}`,
    //   html: `
    //     <h3>New Contact Form Submission</h3>
    //     <p><strong>Name:</strong> ${name}</p>
    //     <p><strong>Email:</strong> ${email}</p>
    //     <p><strong>Category:</strong> ${category || "General"}</p>
    //     <p><strong>Subject:</strong> ${subject}</p>
    //     <p><strong>Message:</strong></p>
    //     <p>${message.replace(/\n/g, '<br>')}</p>
    //   `
    // };
    //
    // await transporter.sendMail(mailOptions);

    // Send auto-reply to user
    // const autoReplyOptions = {
    //   from: `"CampusShare Support" <${process.env.EMAIL_USER}>`,
    //   to: email,
    //   subject: "We received your message - CampusShare",
    //   html: `
    //     <h3>Hello ${name},</h3>
    //     <p>Thank you for contacting CampusShare. We have received your message and will get back to you within 24-48 hours.</p>
    //     <p><strong>Your message:</strong></p>
    //     <p>${message.replace(/\n/g, '<br>')}</p>
    //     <br>
    //     <p>Best regards,</p>
    //     <p><strong>CampusShare Team</strong></p>
    //   `
    // };
    //
    // await transporter.sendMail(autoReplyOptions);

    res.status(200).json({
      success: true,
      message: "Message sent successfully! We'll get back to you within 24-48 hours.",
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