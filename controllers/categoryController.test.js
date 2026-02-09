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
