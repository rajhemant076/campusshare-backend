const Resource = require("../models/Resource");
const User = require("../models/User");

// @desc    Get about page information
// @route   GET /api/about
// @access  Public
exports.getAboutInfo = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "student", accountStatus: "active" });
    const totalResources = await Resource.countDocuments({ status: "approved" });
    const totalDownloads = await Resource.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, total: { $sum: "$downloadCount" } } }
    ]);

    const aboutInfo = {
      mission: "Empowering students to share knowledge, collaborate, and succeed together. We're on a mission to make quality education accessible to everyone.",
      vision: "To build the largest student-driven academic library where knowledge flows freely and every student has equal access to quality educational resources.",
      story: [
        {
          year: "2023",
          title: "The Idea",
          description: "CampusShare was born from a simple idea: students helping students. Founders noticed the lack of centralized academic resource sharing platform.",
          icon: "FiCoffee"
        },
        {
          year: "2024",
          title: "First Launch",
          description: "Beta version launched with 100+ students from CSE branch. Received overwhelming response with 500+ resource uploads in first month.",
          icon: "FiZap"
        },
        {
          year: "2025",
          title: "Expansion",
          description: "Expanded to all engineering branches (CSE, ECE, EEE, MECH, CIVIL, IT). Crossed 1000+ active users milestone.",
          icon: "FiTrendingUp"
        },
        {
          year: "2026",
          title: "Today",
          description: `Now serving ${totalUsers}+ students with ${totalResources}+ resources. Building the largest student-driven academic library.`,
          icon: "FiGlobe"
        }
      ],
      values: [
        {
          title: "Student First",
          description: "Every decision we make is driven by what's best for students. Your success is our success.",
          icon: "FiHeart",
          color: "from-red-500 to-pink-500"
        },
        {
          title: "Quality Assured",
          description: "All resources go through rigorous review process to ensure accuracy and relevance.",
          icon: "FiShield",
          color: "from-blue-500 to-cyan-500"
        },
        {
          title: "Community Driven",
          description: "Built by students, for students. We grow and learn together as a community.",
          icon: "FiUsers",
          color: "from-purple-500 to-indigo-500"
        },
        {
          title: "Excellence",
          description: "We strive for excellence in everything we do, from code quality to user experience.",
          icon: "FiAward",
          color: "from-yellow-500 to-orange-500"
        },
        {
          title: "Accessibility",
          description: "Free and equal access to quality educational resources for every student.",
          icon: "FiTarget",
          color: "from-green-500 to-emerald-500"
        },
        {
          title: "Innovation",
          description: "Constantly evolving with new technologies and features to serve you better.",
          icon: "FiGlobe",
          color: "from-teal-500 to-cyan-500"
        }
      ],
      team: [
        {
          name: "Dr. Sarah Johnson",
          role: "Founder & CEO",
          department: "Computer Science",
          bio: "PhD in Educational Technology. Passionate about democratizing education through technology.",
          image: "https://images.unsplash.com/photo-1494790108755-2519345b8c2e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
          social: {
            linkedin: "https://linkedin.com/in/sarahjohnson",
            twitter: "https://twitter.com/sarahjohnson",
            github: "https://github.com/sarahjohnson"
          }
        },
        {
          name: "Prof. Michael Chen",
          role: "CTO",
          department: "Information Technology",
          bio: "Full-stack developer with 10+ years experience. Previously at Google and Microsoft.",
          image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
          social: {
            linkedin: "https://linkedin.com/in/michaelchen",
            twitter: "https://twitter.com/michaelchen",
            github: "https://github.com/michaelchen"
          }
        },
        {
          name: "Dr. Priya Patel",
          role: "Head of Content",
          department: "Electronics Engineering",
          bio: "Former professor with expertise in curriculum development and quality assurance.",
          image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
          social: {
            linkedin: "https://linkedin.com/in/priyapatel",
            twitter: "https://twitter.com/priyapatel",
            github: "https://github.com/priyapatel"
          }
        },
        {
          name: "Alex Rodriguez",
          role: "Lead Developer",
          department: "Computer Science",
          bio: "MERN stack specialist. Open source contributor and hackathon winner.",
          image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
          social: {
            linkedin: "https://linkedin.com/in/alexrodriguez",
            twitter: "https://twitter.com/alexrodriguez",
            github: "https://github.com/alexrodriguez"
          }
        },
        {
          name: "Emily Zhang",
          role: "UX/UI Designer",
          department: "Design",
          bio: "Creates intuitive and accessible user experiences. Winner of multiple design awards.",
          image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
          social: {
            linkedin: "https://linkedin.com/in/emilyzhang",
            twitter: "https://twitter.com/emilyzhang",
            github: "https://github.com/emilyzhang"
          }
        },
        {
          name: "Rajesh Kumar",
          role: "Community Manager",
          department: "Student Relations",
          bio: "Former student representative. Ensures every voice is heard in our community.",
          image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
          social: {
            linkedin: "https://linkedin.com/in/rajeshkumar",
            twitter: "https://twitter.com/rajeshkumar",
            github: "https://github.com/rajeshkumar"
          }
        }
      ],
      achievements: {
        users: totalUsers,
        resources: totalResources,
        downloads: totalDownloads[0]?.total || totalResources * 3.5,
        branches: 7,
        semesters: 8
      },
      techStack: [
        { name: "React", icon: "FaReact", color: "text-blue-400" },
        { name: "Node.js", icon: "FaNodeJs", color: "text-green-600" },
        { name: "MongoDB", icon: "FaMongodb", color: "text-green-500" },
        { name: "Express", icon: "SiExpress", color: "text-gray-600" },
        { name: "JavaScript", icon: "FaJs", color: "text-yellow-500" },
        { name: "JWT", icon: "SiJwt", color: "text-purple-600" },
        { name: "TailwindCSS", icon: "SiTailwindcss", color: "text-cyan-500" },
        { name: "Redux", icon: "SiRedux", color: "text-purple-500" }
      ]
    };

    res.json({
      success: true,
      data: aboutInfo
    });

  } catch (error) {
    console.error("Get about info error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching about information",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
};

// @desc    Get team members
// @route   GET /api/about/team
// @access  Public
exports.getTeamMembers = async (req, res) => {
  try {
    const team = [
      {
        name: "Dr. Sarah Johnson",
        role: "Founder & CEO",
        department: "Computer Science",
        bio: "PhD in Educational Technology. Passionate about democratizing education through technology.",
        image: "https://images.unsplash.com/photo-1494790108755-2519345b8c2e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
      },
      {
        name: "Prof. Michael Chen",
        role: "CTO",
        department: "Information Technology",
        bio: "Full-stack developer with 10+ years experience. Previously at Google and Microsoft.",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
      },
      {
        name: "Dr. Priya Patel",
        role: "Head of Content",
        department: "Electronics Engineering",
        bio: "Former professor with expertise in curriculum development and quality assurance.",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
      }
    ];

    res.json({
      success: true,
      data: team
    });

  } catch (error) {
    console.error("Get team members error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching team members",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
};