// server/controllers/menuController.js
const Menu = require("../models/Menu");

exports.createMenuItem = async (req, res) => {
  try {
    const {
      category,
      name,
      description,
      isVeg,
      price,
      hasHalf,
      halfPrice,
      isEnabled,
      userId,
    } = req.body;

    // Log incoming request body for debugging
    console.log("Received payload:", JSON.stringify(req.body, null, 2));

    // Validate required fields
    if (!category || !name || isVeg === undefined || price === undefined) {
      console.log("Validation failed: Missing required fields");
      return res
        .status(400)
        .json({ error: "Category, name, isVeg, and price are required" });
    }

    // Validate price
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      console.log("Validation failed: Invalid price:", price);
      return res
        .status(400)
        .json({ error: "Price must be a positive number greater than 0" });
    }

    // Validate halfPrice if hasHalf is true
    const parsedHalfPrice = hasHalf ? parseFloat(halfPrice) : null;
    if (
      hasHalf &&
      (halfPrice === undefined ||
        halfPrice === null ||
        isNaN(parsedHalfPrice) ||
        parsedHalfPrice <= 0)
    ) {
      console.log("Validation failed: Invalid halfPrice:", halfPrice);
      return res
        .status(400)
        .json({ error: "Half price must be a positive number greater than 0" });
    }

    // Validate userId
    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId) || parsedUserId !== req.user.id) {
      console.log(
        "Validation failed: Invalid userId:",
        userId,
        "Expected:",
        req.user.id
      );
      return res.status(403).json({ error: "Unauthorized: Invalid userId" });
    }

    const menuItem = await Menu.create({
      category,
      name,
      description,
      isVeg,
      price: parsedPrice,
      hasHalf: hasHalf || false,
      halfPrice: parsedHalfPrice,
      userId: parsedUserId,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
    });

    console.log(
      "Menu item created:",
      JSON.stringify(menuItem.toJSON(), null, 2)
    );
    res.status(201).json(menuItem);
  } catch (error) {
    console.error("Error creating menu item:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    if (error.name === "SequelizeValidationError") {
      return res
        .status(400)
        .json({
          error: "Validation error",
          details: error.errors.map((e) => e.message).join(", "),
        });
    }
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

exports.getMenuItems = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ error: "Restaurant ID is required" });
    }
    const parsedRestaurantId = parseInt(restaurantId);
    if (isNaN(parsedRestaurantId)) {
      return res.status(400).json({ error: "Invalid restaurant ID" });
    }
    const menuItems = await Menu.findAll({
      where: { userId: parsedRestaurantId },
    });
    res.json(menuItems);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const menuItem = await Menu.findByPk(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    if (menuItem.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const { category, name, description, isVeg, price, hasHalf, halfPrice, isEnabled } =
      req.body;

    // Log incoming request body for debugging
    console.log("Received update payload:", JSON.stringify(req.body, null, 2));

    // Validate required fields
    if (!category || !name || isVeg === undefined || price === undefined) {
      console.log("Validation failed: Missing required fields");
      return res
        .status(400)
        .json({ error: "Category, name, isVeg, and price are required" });
    }

    // Validate price
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      console.log("Validation failed: Invalid price:", price);
      return res
        .status(400)
        .json({ error: "Price must be a positive number greater than 0" });
    }

    // Validate halfPrice if hasHalf is true
    const parsedHalfPrice = hasHalf ? parseFloat(halfPrice) : null;
    if (
      hasHalf &&
      (halfPrice === undefined ||
        halfPrice === null ||
        isNaN(parsedHalfPrice) ||
        parsedHalfPrice <= 0)
    ) {
      console.log("Validation failed: Invalid halfPrice:", halfPrice);
      return res
        .status(400)
        .json({ error: "Half price must be a positive number greater than 0" });
    }

    await menuItem.update({
      category,
      name,
      description,
      isVeg,
      price: parsedPrice,
      hasHalf: hasHalf || false,
      halfPrice: parsedHalfPrice,
      isEnabled: isEnabled !== undefined ? isEnabled : menuItem.isEnabled,
    });

    console.log(
      "Menu item updated:",
      JSON.stringify(menuItem.toJSON(), null, 2)
    );
    res.json(menuItem);
  } catch (error) {
    console.error("Error updating menu item:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    if (error.name === "SequelizeValidationError") {
      return res
        .status(400)
        .json({
          error: "Validation error",
          details: error.errors.map((e) => e.message).join(", "),
        });
    }
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await Menu.findByPk(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    if (menuItem.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    await menuItem.destroy();
    res.json({ message: "Menu item deleted" });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};