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

    describe("createCategoryController", () => {

        // Boundary for name: length 0 and length 1 after trimming
        // Special cases: name is null, name is undefined (missing input)
        // Not required to be tested: very long strings 
        describe("Name Validation (BVA)", () => {

            it("should return 400 if name is not supplied (Boundary: missing input)", async () => {
                
                // Arrange
                req.body = {};

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category name is required.",
                });

            });

            it("should return 400 if name is null (Boundary: null)", async () => {

                // Arrange
                req.body = { name: null };

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category name is required.",
                });
            });

            it("should return 400 if name is empty string (Below Boundary: \"\") ", async () => {
                
                // Arrange
                req.body.name = "";

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category name is required.",
                });
            });

            it("should return 400 if name contains only whitespace (Below Boundary: \" \")", async () => {
                
                // Arrange
                req.body.name = " ";

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category name is required.",
                });
            });

            it("should create category if name is a single character (On Boundary: 1 character)", async () => {
               
                // Arrange
                req.body.name = "A";
                categoryModel.findOne.mockResolvedValue(null);
                slugify.mockReturnValue("a");

                // Mock constructor
                const MockCategory = jest.fn(function (doc) {
                    Object.assign(this, doc);
                    this._id = "001";
                    this.save = jest.fn().mockResolvedValue(this); // resolves to the instance itself
                });

                categoryModel.mockImplementation(MockCategory);

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "A" });
                expect(MockCategory).toHaveBeenCalledWith({ name: "A", slug: "a" });
                const instance = MockCategory.mock.instances[0];
                expect(instance.save).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(201);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        message: "New category created successfully.",
                        category: expect.objectContaining({
                            name: "A",
                            slug: "a",
                        }),
                    })
                );
            });

            it("should create category if name is a two characters (Above Boundary: 2 character)", async () => {
               
                // Arrange
                req.body.name = "AB";
                categoryModel.findOne.mockResolvedValue(null);
                slugify.mockReturnValue("ab");

                // Mock constructor
                const MockCategory = jest.fn(function (doc) {
                    Object.assign(this, doc);
                    this._id = "001";
                    this.save = jest.fn().mockResolvedValue(this); // resolves to the instance itself
                });

                categoryModel.mockImplementation(MockCategory);

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "AB" });
                expect(MockCategory).toHaveBeenCalledWith({ name: "AB", slug: "ab" });
                const instance = MockCategory.mock.instances[0];
                expect(instance.save).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(201);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        message: "New category created successfully.",
                        category: expect.objectContaining({
                            name: "AB",
                            slug: "ab",
                        }),
                    })
                );
            });
        });

        describe("Duplicate Category (EP)", () => {

            it("should return 409 if new category's name is a duplicate (EP: duplicate name)", async () => {

                // Arrange
                req.body = { name: "Existing Category" };

                const mockExistingCategory = {
                    _id: "002",
                    name: "Existing Category",
                    slug: "existing-category",
                    save: jest.fn().mockResolvedValue(true),
                };

                categoryModel.findOne.mockResolvedValue(mockExistingCategory);

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "Existing Category" });
                expect(res.status).toHaveBeenCalledWith(409);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category already exists.",
                });
            });

            it("should create a new category if name is unique (EP: unique name)", async () => {
                
                // Arrange
                req.body = { name: "New Category" };
                
                categoryModel.findOne.mockResolvedValue(null);
                slugify.mockReturnValue("new-category");

                // Mock constructor
                const MockCategory = jest.fn(function (doc) {
                    Object.assign(this, doc);
                    this._id = "001";
                    this.save = jest.fn().mockResolvedValue(this); // resolves to the instance itself
                });

                categoryModel.mockImplementation(MockCategory);

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "New Category" });
                expect(MockCategory).toHaveBeenCalledWith({ name: "New Category", slug: "new-category" });
                const instance = MockCategory.mock.instances[0];
                expect(instance.save).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(201);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        message: "New category created successfully.",
                        category: expect.objectContaining({
                            name: "New Category",
                            slug: "new-category",
                        }),
                    })
                );
            });
        });

        describe("Database Error (EP)", () => {

            it("should return 500 if findOne throws an error (EP: findOne DB failure)", async () => {

                // Arrange
                req.body = { name: "New Category" };
                categoryModel.findOne.mockRejectedValue(new Error("Failed to query database."));

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "New Category" });
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        message: "Internal server error while creating category.",
                    })
                );
            });

            it("should return 500 if save throws an error (EP: save DB failure)", async () => {

                // Arrange
                req.body = { name: "New Category" };
                categoryModel.findOne.mockResolvedValue(null);
                slugify.mockReturnValue("new-category");

                 // Mock constructor
                const MockCategory = jest.fn(function (doc) {
                    Object.assign(this, doc);
                    this._id = "001";
                    this.save = jest.fn().mockRejectedValue(new Error("Failed to save category to database."));
                });

                categoryModel.mockImplementation(MockCategory);

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "New Category" });
                expect(MockCategory).toHaveBeenCalledWith({ name: "New Category", slug: "new-category" });
                const instance = MockCategory.mock.instances[0];
                expect(instance.save).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        message: "Internal server error while creating category.",
                    })
                );
            });
        });
    });

    describe("updateCategoryController", () => {

        // Boundary for name: length 0 and length 1 after trimming
        // Special cases: name is null, name is undefined (missing input)
        // Not required to be tested: very long strings
        describe("Name Validation (BVA)", () => {

            it("should return 400 if name is not supplied (Boundary: missing input)", async () => {

                // Arrange
                req.params.id = "001";
                req.body = {};

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category name is required.",
                });
            });

            it("should return 400 if name is null (Boundary: null)", async () => {

                // Arrange
                req.params.id = "001";
                req.body = { name: null };

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category name is required.",
                });
            });

            it("should return 400 if name is empty string (Below Boundary: \"\")", async () => {

                // Arrange
                req.params.id = "001";
                req.body.name = "";

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category name is required.",
                });
            });

            it("should return 400 if name contains only whitespace (Below Boundary: \" \")", async () => {

                // Arrange
                req.params.id = "001";
                req.body.name = " ";

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category name is required.",
                });
            });

            it("should update category if name is a single character (On Boundary: 1 character)", async () => {

                // Arrange
                req.params.id = "001";
                req.body.name = "A";

                const mockCategory = {
                    _id: "001",
                    name: "Old Category",
                    slug: "old-category",
                    save: jest.fn().mockResolvedValue(true),
                };

                categoryModel.findById.mockResolvedValue(mockCategory);
                categoryModel.findOne.mockResolvedValue(null);
                slugify.mockReturnValue("a");

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(categoryModel.findById).toHaveBeenCalledWith("001");
                expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "A", _id: { $ne: "001" } });
                expect(mockCategory.save).toHaveBeenCalled(); 
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        message: "Category updated successfully.",
                        category: expect.objectContaining({
                            name: "A",
                            slug: "a",
                        }),
                    })
                );
            });

            it("should update category if name is a two characters (Above Boundary: 2 character)", async () => {

                // Arrange
                req.params.id = "001";
                req.body.name = "AB";

                const mockCategory = {
                    _id: "001",
                    name: "Old Category",
                    slug: "old-category",
                    save: jest.fn().mockResolvedValue(true),
                };

                categoryModel.findById.mockResolvedValue(mockCategory);
                categoryModel.findOne.mockResolvedValue(null);
                slugify.mockReturnValue("ab");

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(categoryModel.findById).toHaveBeenCalledWith("001");
                expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "AB", _id: { $ne: "001" } });
                expect(mockCategory.save).toHaveBeenCalled(); 
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        message: "Category updated successfully.",
                        category: expect.objectContaining({
                            name: "AB",
                            slug: "ab",
                        }),
                    })
                );
            });
        });

        describe("Category Existence + Duplicate Category (EP)", () => {

            it("should return 404 if category does not exist (EP: category does not exist)", async () => {
                
                // Arrange
                req.params.id = "001";
                req.body = { name: "New Category" };

                categoryModel.findById.mockResolvedValue(null);

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(categoryModel.findById).toHaveBeenCalledWith("001");
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category not found.",
                });
            });

            it("should return 409 if new name is not unique (EP: category exists + duplicate name)", async () => {
                
                // Arrange
                req.params.id = "001";
                req.body.name = "Existing Category";

                const mockCategory = {
                    _id: "001",
                    name: "Old Category",
                    slug: "old-category",
                    save: jest.fn().mockResolvedValue(true),
                };

                const mockExistingCategory = {
                    _id: "002",
                    name: "Existing Category",
                    slug: "existing-category",
                };

                categoryModel.findById.mockResolvedValue(mockCategory);
                categoryModel.findOne.mockResolvedValue(mockExistingCategory);

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(categoryModel.findById).toHaveBeenCalledWith("001");
                expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "Existing Category", _id: { $ne: "001" } });
                expect(res.status).toHaveBeenCalledWith(409);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category's new name already exists.",
                });
            });

            it("should update category if category exists and new name is unique (EP: category exists + unique name)", async () => {
                
                // Arrange
                req.params.id = "001";
                req.body.name = "New Category";

                const mockCategory = {
                    _id: "001",
                    name: "Old Category",
                    slug: "old-category",
                    save: jest.fn().mockResolvedValue(true),
                };

                categoryModel.findById.mockResolvedValue(mockCategory);
                categoryModel.findOne.mockResolvedValue(null);
                slugify.mockReturnValue("new-category");

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(categoryModel.findById).toHaveBeenCalledWith("001");
                expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "New Category", _id: { $ne: "001" } });
                expect(mockCategory.save).toHaveBeenCalled(); 
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        message: "Category updated successfully.",
                        category: expect.objectContaining({
                            name: "New Category",
                            slug: "new-category",
                        }),
                    })
                );
            });
        });

        describe("Database Errors (EP)", () => {

            it("should return 500 if findById throws an error (EP: findById DB failure)", async () => {
                
                // Arrange
                req.params.id = "001";
                req.body.name = "New Category";
                categoryModel.findById.mockRejectedValue(new Error("Failed to query database."));

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(categoryModel.findById).toHaveBeenCalledWith("001");
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        message: "Internal server error while updating category",
                    })
                );
            });

            it("should return 500 if findOne throws an error (EP: findOne DB failure)", async () => {
                
                // Arrange
                req.params.id = "001";
                req.body.name = "New Category";

                const mockCategory = {
                    _id: "001",
                    name: "Old Category",
                    slug: "old-category",
                    save: jest.fn().mockResolvedValue(true),
                };

                categoryModel.findById.mockResolvedValue(mockCategory);
                categoryModel.findOne.mockRejectedValue(new Error("Failed to query database."));

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(categoryModel.findById).toHaveBeenCalledWith("001");
                expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "New Category", _id: { $ne: "001" } });
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        message: "Internal server error while updating category",
                    })
                );
            });

            it("should return 500 if save throws an error (EP: save DB failure)", async () => {
               
                // Arrange
                req.params.id = "001";
                req.body.name = "New Category";

                const mockCategory = {
                    _id: "001",
                    name: "Old Category",
                    slug: "old-category",
                    save: jest.fn().mockRejectedValue(new Error("Failed to save category to database.")),
                };

                categoryModel.findById.mockResolvedValue(mockCategory);
                categoryModel.findOne.mockResolvedValue(null);
                slugify.mockReturnValue("new-category");

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(categoryModel.findById).toHaveBeenCalledWith("001");
                expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "New Category", _id: { $ne: "001" } });
                expect(mockCategory.save).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        message: "Internal server error while updating category",
                    })
                );
            });
        });
    });

    describe("getAllCategoriesController", () => {

        // Boundary for array: size 0 and size 1
        // Not required to be tested: arrays with a lot of items 
        describe("Category Count (BVA)", () => {

            it("should retrieve an empty array if no categories exist (Below Boundary: 0 categories)", async () => {
                
                // Arrange
                categoryModel.find.mockResolvedValue([]);

                // Act
                await getAllCategoriesController(req, res);

                // Assert
                expect(categoryModel.find).toHaveBeenCalledWith({});
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "All categories retrieved successfully.",
                    categories: [],
                });
            });

            it("should retrieve an array with one category (On Boundary: 1 category)", async () => {
                // Arrange
                const mockCategories = [{ _id: "001", name: "Category A", slug: "category-a" }];
                categoryModel.find.mockResolvedValue(mockCategories);

                // Act
                await getAllCategoriesController(req, res);

                // Assert
                expect(categoryModel.find).toHaveBeenCalledWith({});
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "All categories retrieved successfully.",
                    categories: mockCategories,
                });
            });

            it("should retrieve an array with two categories (Above Boundary: 2 categories)", async () => {
                // Arrange
                const mockCategories = [
                    { _id: "001", name: "Category A", slug: "category-a" }, 
                    { _id: "002", name: "Category B", slug: "category-b" }
                ];
                categoryModel.find.mockResolvedValue(mockCategories);

                // Act
                await getAllCategoriesController(req, res);

                // Assert
                expect(categoryModel.find).toHaveBeenCalledWith({});
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "All categories retrieved successfully.",
                    categories: mockCategories,
                });
            });
        });

        describe("Database State (EP)", () => {

            it("should return 200 with multiple categories (EP: no DB failure)", async () => {
                
                // Arrange
                const mockCategories = [
                    { _id: "001", name: "Category A", slug: "category-a" },
                    { _id: "002", name: "Category B", slug: "category-b" },
                ];
                categoryModel.find.mockResolvedValue(mockCategories);

                // Act
                await getAllCategoriesController(req, res);

                // Assert
                expect(categoryModel.find).toHaveBeenCalledWith({});
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "All categories retrieved successfully.",
                    categories: mockCategories,
                });
            });

            it("should return 500 if database throws an error (EP: find DB failure)", async () => {
                
                // Arrange
                categoryModel.find.mockRejectedValue(new Error("Failed to query database."));

                // Act
                await getAllCategoriesController(req, res);

                // Assert
                expect(categoryModel.find).toHaveBeenCalledWith({});
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        message: "Internal server error while retrieving all categories.",
                    })
                );
            });
        });
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


            it("should return 400 if slug is empty string (Below Boundary: \"\")", async () => {

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

            it("should retrieve a category that matches the slug, even if the slug is a single character (On Boundary: 1 character)", async () => {
                
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

            it("should retrieve a category that matches the slug, even if the slug is two characters (Above Boundary: 2 characters)", async () => {
                
                // Arrange
                req.params.slug = "ab";

                const mockCategory = {
                    _id: "001",
                    name: "AB",
                    slug: "ab",
                };
                categoryModel.findOne.mockResolvedValue(mockCategory);

                // Act
                await getCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "ab" });
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

            it("should return 400 if id is empty string (Below Boundary: \"\")", async () => {

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

            it("should delete category if 1 character id is valid (On Boundary: 1 character)", async () => {
                        
                // Arrange
                req.params.id = "1";
                const mockCategory = {
                    _id: "1",
                    name: "Existing Category",
                    deleteOne: jest.fn().mockResolvedValue(true),
                };
                categoryModel.findById.mockResolvedValue(mockCategory);

                // Act
                await deleteCategoryController(req, res);

                // Assert
                expect(categoryModel.findById).toHaveBeenCalledWith("1");
                expect(mockCategory.deleteOne).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        message: "Category deleted successfully.",
                    })
                );
            });

            it("should delete category if 2 character id is valid (Above Boundary: 2 character)", async () => {
                        
                // Arrange
                req.params.id = "10";
                const mockCategory = {
                    _id: "10",
                    name: "Existing Category",
                    deleteOne: jest.fn().mockResolvedValue(true),
                };
                categoryModel.findById.mockResolvedValue(mockCategory);

                // Act
                await deleteCategoryController(req, res);

                // Assert
                expect(categoryModel.findById).toHaveBeenCalledWith("10");
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

        describe("Database Errors (EP)", () => {

            it("should return 500 if findById throws an error (EP: findById DB failure)", async () => {
                
                // Arrange
                req.params = { id: "001" };
                categoryModel.findById.mockRejectedValue(new Error("Failed to query database."));

                // Act
                await deleteCategoryController(req, res);

                // Assert
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
                expect(categoryModel.findById).toHaveBeenCalledWith("001");
                expect(mockCategory.deleteOne).toHaveBeenCalled();
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
