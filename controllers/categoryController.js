import categoryModel from "../models/categoryModel.js";
import slugify from "slugify";

// Create new category
export const createCategoryController = async (req, res) => {
  try {

    // Validate that name is supplied
    const name = req.body.name?.trim()
    if (!name) {
      return res.status(400).send({ 
        success: false,
        message: "Category name is required." 
      });
    }

    // Check if the category already exists
    const existingCategory = await categoryModel.findOne({ name });
    if (existingCategory) {
      return res.status(409).send({
        success: false,
        message: "Category already exists.",
      });
    }

    // Create new category 
    const category = await new categoryModel({
      name,
      slug: slugify(name),
    }).save();

    // Send success response
    return res.status(201).send({
      success: true,
      message: "New category created successfully.",
      category,
    });

  // Misc errors 
  } catch (error) {
    console.log("Error creating category: ", error);
    return res.status(500).send({
      success: false,
      error: error.message,
      message: "Internal server error while creating category.",
    });
  }
};

// Update category
export const updateCategoryController = async (req, res) => {
  try {

    // Validate that name is supplied
    const name = req.body.name?.trim()
    if (!name) {
      return res.status(400).send({ 
        success: false,
        message: "Category name is required." 
      });
    }

    const { id } = req.params;


    // Check if category exists
    const category = await categoryModel.findById(id);
    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found.",
      });
    }

    const nameConflict = await categoryModel.findOne({
      name,
      _id: { $ne: id },
    });

    if (nameConflict) {
      return res.status(409).send({
        success: false,
        message: "Category's new name already exists.",
      });
    }
    category.name = name;
    category.slug = slugify(name);
    await category.save();
    // Sends success response
    return res.status(200).send({
      success: true,
      message: "Category updated successfully.",
      category,
    });
  
  // Misc errors
  } catch (error) {
    console.log("Error updating category: ", error);
    return res.status(500).send({
      success: false,
      error: error.message,
      message: "Internal server error while updating category",
    });
  }
};

// get all cat
export const categoryControlller = async (req, res) => {
  try {
    const category = await categoryModel.find({});
    res.status(200).send({
      success: true,
      message: "All Categories List",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while getting all categories",
    });
  }
};

// single category
export const singleCategoryController = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ slug: req.params.slug });
    res.status(200).send({
      success: true,
      message: "Get SIngle Category SUccessfully",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error While getting Single Category",
    });
  }
};

//delete category
export const deleteCategoryCOntroller = async (req, res) => {
  try {
    const { id } = req.params;
    await categoryModel.findByIdAndDelete(id);
    res.status(200).send({
      success: true,
      message: "Categry Deleted Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "error while deleting category",
      error,
    });
  }
};