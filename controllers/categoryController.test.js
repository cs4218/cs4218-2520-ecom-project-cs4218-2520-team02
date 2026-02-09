import { jest } from "@jest/globals";

// Mock categoryModel
await jest.unstable_mockModule("../models/categoryModel.js", () => {
  const CategoryMock = jest.fn(function (doc) {
    Object.assign(this, doc);
    
    this.save = jest.fn().mockResolvedValue(this);
    this.deleteOne = jest.fn().mockResolvedValue(this);
  });

  CategoryMock.find = jest.fn();
  CategoryMock.findOne = jest.fn();
  CategoryMock.findById = jest.fn();

  return { default: CategoryMock };
});

// Mock slugify
await jest.unstable_mockModule("slugify", () => ({
  default: jest.fn((str) =>
    str
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
  ),
}));

// Imports
const { default: categoryModel } = await import("../models/categoryModel.js");
const { default: slugify } = await import("slugify");
const {
  createCategoryController,
  updateCategoryController,
  getAllCategoriesController,
  getCategoryController,
  deleteCategoryController,
} = await import("../controllers/categoryController.js");

describe("Category Controller Unit Tests", () => {
    let req, res;

    beforeEach(() => {

        // Re-inititalize mocks 
        jest.resetAllMocks();

        // Set up default requests 
        req = {
            body: {},
            params: {},
        };

        // Mock response 
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };

        // Suppress console log
        jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore console log to original behaviour
        console.log.mockRestore()
    });
})
