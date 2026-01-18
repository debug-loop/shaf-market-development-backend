const Category = require('../models/Category');
const Product = require('../models/Product');
const Section = require('../models/Section');
const AdminLog = require('../models/AdminLog');

// Create new category (Admin)
exports.create = async (req, res) => {
  try {
    const { sectionId, name, icon, description, order } = req.body;

    // Verify section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    const category = await Category.create({
      sectionId,
      name,
      icon,
      description,
      order,
    });

    // Log admin action
    await AdminLog.create({
      adminId: req.user._id,
      action: 'create_category',
      target: 'category',
      targetId: category._id,
      details: `Created category: ${category.name} in section: ${section.name}`,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all categories (Admin)
exports.getAll = async (req, res) => {
  try {
    const { sectionId, status } = req.query;
    const filter = {};

    if (sectionId) {
      filter.sectionId = sectionId;
    }

    if (status === 'active') {
      filter.isActive = true;
    }

    const categories = await Category.find(filter)
      .populate('sectionId', 'name slug icon')
      .sort({ sectionId: 1, order: 1 });

    // Get product count for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({
          categoryId: category._id,
          status: 'approved',
          isActive: true,
        });
        return {
          ...category.toObject(),
          productCount,
        };
      })
    );

    res.json({
      success: true,
      data: categoriesWithCounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get category by ID (Admin)
exports.getById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate('sectionId', 'name slug icon');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update category (Admin)
exports.update = async (req, res) => {
  try {
    const { sectionId, name, icon, description, order, isActive } = req.body;

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { sectionId, name, icon, description, order, isActive },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Log admin action
    await AdminLog.create({
      adminId: req.user._id,
      action: 'update_category',
      target: 'category',
      targetId: category._id,
      details: `Updated category: ${category.name}`,
    });

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete category (Admin)
exports.delete = async (req, res) => {
  try {
    // Check if category has products
    const productCount = await Product.countDocuments({ categoryId: req.params.id });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with existing products',
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Log admin action
    await AdminLog.create({
      adminId: req.user._id,
      action: 'delete_category',
      target: 'category',
      targetId: category._id,
      details: `Deleted category: ${category.name}`,
    });

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Reorder categories (Admin)
exports.reorder = async (req, res) => {
  try {
    const { categories } = req.body; // Array of { id, order }

    await Promise.all(
      categories.map(async (item) => {
        await Category.findByIdAndUpdate(item.id, { order: item.order });
      })
    );

    res.json({
      success: true,
      message: 'Categories reordered successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};