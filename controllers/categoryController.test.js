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

    
    describe("getCategoryController", () => {

        // Boundary for slugs: length 0 and length 1 after slugify
        // Special cases: slug is null, slug is undefined (missing input)
        // Not required to be tested: very long strings
        describe("Slug Validation (BVA)", () => {

            it("should return 400 if slug is not supplied (Boundary: missing input)", async () => {

                // Arrange
                req.params = {}

                // Act
                await getCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category slug is required.",
                });
            });

            it("should return 400 if slug is null (Boundary: null)", async () => {
                
                // Arrange
                req.params = { slug: null };

                // Act
                await getCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category slug is required.",
                });
            });


            it("should return 400 if slug is empty string (Boundary: \"\")", async () => {

                // Arrange
                req.params.slug = "";

                // Act
                await getCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category slug is required.",
                });
            });

            it("should retrieve a category that matches the slug, even if the slug is a single character (Boundary: 1 character)", async () => {
                
                // Arrange
                req.params.slug = "a";

                const mockCategory = {
                    _id: "001",
                    name: "A",
                    slug: "a",
                };
                categoryModel.findOne.mockResolvedValue(mockCategory);

                // Act
                await getCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledTimes(1);
                expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "a" });
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        message: "Category retrieved successfully.",
                        category: mockCategory,
                    })
                );
            });
        });

        describe("Category Existence (EP)", () => {

            it("should return 404 if category does not exist (EP: category does not exist)", async () => {

                // Arrange
                req.params.slug = "new-category";
                slugify.mockReturnValue("new-category");
                categoryModel.findOne.mockResolvedValue(null);

                // Act
                await getCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledTimes(1);
                expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "new-category" });
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category not found.",
                });
            });

            it("should return 200 if category exists (EP: category exists)", async () => {

                // Arrange
                req.params.slug = "existing-category";
                slugify.mockReturnValue("existing-category");

                const mockCategory = {
                    _id: "001",
                    name: "Existing Category",
                    slug: "existing-category",
                };

                categoryModel.findOne.mockResolvedValue(mockCategory);

                // Act
                await getCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledTimes(1);
                expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "existing-category" });
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        message: "Category retrieved successfully.",
                        category: mockCategory,
                    })
                );
            });
        });

        describe("Database Errors (EP)", () => {

            it("should return 500 if findOne throws an error (EP: findOne DB failure)", async () => {

                // Arrange
                req.params.slug = "existing-category";
                slugify.mockReturnValue("existing-category");
                categoryModel.findOne.mockRejectedValue(new Error("Failed to query database."));

                // Act
                await getCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledTimes(1);
                expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "existing-category" });
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        message: "Internal server error while retrieving category.",
                    })
                );
            });
        });
    });


    describe("deleteCategoryController", () => {

        // Boundary for ids: length 0 and length 1 ids
        // Special cases: id is null, id is undefined (missing input)
        // Note: ids are also strings, but different amount of whitespaces can be treated as different ids. 
        describe("ID Validation (BVA)", () => {

            it("should return 400 if id is not supplied (Boundary: missing input)", async () => {
                        
                // Arrange
                req.params = {};

                // Act
                await deleteCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category id is required.",
                });
            });

            it("should return 400 if id is null (Boundary: null)", async () => {
                        
                // Arrange
                req.params = { id: null };

                // Act
                await deleteCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category id is required.",
                });
            });

            it("should return 400 if id is empty string (Boundary: \"\")", async () => {

                // Arrange
                req.params.id = ""

                // Act
                await deleteCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category id is required.",
                });
            });

            it("should delete category if id is valid (Boundary: 1 character)", async () => {
                        
                // Arrange
                req.params.id = "001";
                const mockCategory = {
                    _id: "001",
                    name: "Existing Category",
                    deleteOne: jest.fn().mockResolvedValue(true),
                };
                categoryModel.findById.mockResolvedValue(mockCategory);

                // Act
                await deleteCategoryController(req, res);

                // Assert
                expect(categoryModel.findById).toHaveBeenCalledTimes(1);
                expect(categoryModel.findById).toHaveBeenCalledWith("001");
                expect(mockCategory.deleteOne).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        message: "Category deleted successfully.",
                    })
                );
            });
        });

        describe("Category Existence (EP)", () => {

            it("should return 404 if category does not exist (EP: category does not exist)", async () => {
                
                // Arrange
                req.params.id = "001";
                categoryModel.findById.mockResolvedValue(null);

                // Act
                await deleteCategoryController(req, res);

                // Assert
                expect(categoryModel.findById).toHaveBeenCalledTimes(1);
                expect(categoryModel.findById).toHaveBeenCalledWith("001");
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category not found.",
                });
            });

            it("should delete category if it exists (EP: category exists)", async () => {
                
                // Arrange
                req.params.id = "001";

                const mockCategory = {
                    _id: "001",
                    name: "Existing Category",
                    deleteOne: jest.fn().mockResolvedValue(true),
                };

                categoryModel.findById.mockResolvedValue(mockCategory);

                // Act
                await deleteCategoryController(req, res);

                // Assert
                expect(categoryModel.findById).toHaveBeenCalledTimes(1);
                expect(categoryModel.findById).toHaveBeenCalledWith("001");
                expect(mockCategory.deleteOne).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        message: "Category deleted successfully.",
                    })
                );
            });

        });

        describe("Database Errors (EP)", () => {

            it("should return 500 if findById throws an error (EP: findById DB failure)", async () => {
                
                // Arrange
                req.params = { id: "001" };
                categoryModel.findById.mockRejectedValue(new Error("Failed to query database."));

                // Act
                await deleteCategoryController(req, res);

                // Assert
                expect(categoryModel.findById).toHaveBeenCalledTimes(1);
                expect(categoryModel.findById).toHaveBeenCalledWith("001");
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        message: "Internal server error while deleting category.",
                    })
                );
            });

            it("should return 500 if deleteOne throws an error (EP: deleteOne DB failure)", async () => {
                
                // Arrange
                req.params = { id: "001" };

                const mockCategory = {
                    _id: "001",
                    name: "Existing Category",
                    deleteOne: jest.fn().mockRejectedValue(new Error("Failed to delete category from database.")),
                };

                categoryModel.findById.mockResolvedValue(mockCategory);

                // Act
                await deleteCategoryController(req, res);

                // Assert
                expect(categoryModel.findById).toHaveBeenCalledTimes(1);
                expect(categoryModel.findById).toHaveBeenCalledWith("001");
                expect(mockCategory.deleteOne).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        message: "Internal server error while deleting category.",
                    })
                );
            });
        });
    });
})
