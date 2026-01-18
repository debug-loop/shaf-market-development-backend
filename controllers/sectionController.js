const Section = require('../models/Section');
const Category = require('../models/Category');
const AdminLog = require('../models/AdminLog');

// Create new section (Admin)
exports.create = async (req, res) => {
  try {
    const { name, icon, description, order, attributeSchema } = req.body;

    const section = await Section.create({
      name,
      icon,
      description,
      order,
      attributeSchema,
    });

    // Log admin action
    await AdminLog.create({
      adminId: req.user._id,
      action: 'create_section',
      target: 'section',
      targetId: section._id,
      details: `Created section: ${section.name}`,
    });

    res.status(201).json({
      success: true,
      data: section,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all sections (Admin)
exports.getAll = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status === 'active') {
      filter.isActive = true;
    }

    const sections = await Section.find(filter).sort({ order: 1 });

    // Get category count for each section
    const sectionsWithCounts = await Promise.all(
      sections.map(async (section) => {
        const categoryCount = await Category.countDocuments({
          sectionId: section._id,
          isActive: true,
        });
        return {
          ...section.toObject(),
          categoryCount,
        };
      })
    );

    res.json({
      success: true,
      data: sectionsWithCounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all active sections (Public)
exports.getAllPublic = async (req, res) => {
  try {
    const sections = await Section.find({ isActive: true }).sort({ order: 1 });

    const sectionsWithCounts = await Promise.all(
      sections.map(async (section) => {
        const categoryCount = await Category.countDocuments({
          sectionId: section._id,
          isActive: true,
        });
        return {
          ...section.toObject(),
          categoryCount,
        };
      })
    );

    res.json({
      success: true,
      data: sectionsWithCounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get section by ID (Admin)
exports.getById = async (req, res) => {
  try {
    const section = await Section.findById(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    res.json({
      success: true,
      data: section,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update section (Admin)
exports.update = async (req, res) => {
  try {
    const { name, icon, description, order, attributeSchema, isActive } = req.body;

    const section = await Section.findByIdAndUpdate(
      req.params.id,
      { name, icon, description, order, attributeSchema, isActive },
      { new: true, runValidators: true }
    );

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    // Log admin action
    await AdminLog.create({
      adminId: req.user._id,
      action: 'update_section',
      target: 'section',
      targetId: section._id,
      details: `Updated section: ${section.name}`,
    });

    res.json({
      success: true,
      data: section,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete section (Admin)
exports.delete = async (req, res) => {
  try {
    // Check if section has categories
    const categoryCount = await Category.countDocuments({ sectionId: req.params.id });

    if (categoryCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete section with existing categories',
      });
    }

    const section = await Section.findByIdAndDelete(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    // Log admin action
    await AdminLog.create({
      adminId: req.user._id,
      action: 'delete_section',
      target: 'section',
      targetId: section._id,
      details: `Deleted section: ${section.name}`,
    });

    res.json({
      success: true,
      message: 'Section deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Reorder sections (Admin)
exports.reorder = async (req, res) => {
  try {
    const { sections } = req.body; // Array of { id, order }

    await Promise.all(
      sections.map(async (item) => {
        await Section.findByIdAndUpdate(item.id, { order: item.order });
      })
    );

    res.json({
      success: true,
      message: 'Sections reordered successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get categories in a section (Public)
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      sectionId: req.params.id,
      isActive: true,
    })
      .sort({ order: 1 })
      .populate('sectionId', 'name slug icon');

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};