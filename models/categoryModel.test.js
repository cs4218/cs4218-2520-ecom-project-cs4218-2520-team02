// Yap Zhao Yi, A0277540B
import mockingoose from "mockingoose";
import mongoose from "mongoose";
import Category from "./categoryModel.js";

describe("Category Model Unit Tests", () => {

  beforeEach(() => {
    mockingoose.resetAll();
  });

  const defaultCategory = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: "Test",
    slug: "test",
  }

  describe("Category validation", () => {

    // Special cases: slug is null, slug is undefined, slug is an empty string
    // Not required to be tested: very long slug
    // Note: slug is optional
    describe("Slug validation (EP)", () => {
      it("should fail if slug is missing (EP: missing slug)", async () => {

        // Arrange
        const categoryData = { ...defaultCategory};
        delete categoryData.slug;

        // Act
        mockingoose(Category).toReturn(categoryData, "findOne");

        // Assert
        const found = await Category.findOne({ _id: categoryData._id });
        expect(found.name).toBe("Test");
        expect(found.slug).toBeUndefined();
      });

      it("should fail if name is null (EP: null)", async () => {

        // Arrange
        const categoryData = { ...defaultCategory, slug: null};

        // Act
        mockingoose(Category).toReturn(categoryData, "findOne");

        // Assert
        const found = await Category.findOne({ _id: categoryData._id });
        expect(found.name).toBe("Test");
        expect(found.slug).toBe(null);
      });

      it("should fail if slug is empty string (EP: \"\")", async () => {
        
        // Arrange
        const categoryData = { ...defaultCategory, slug: ""};

        // Act
        mockingoose(Category).toReturn(categoryData, "findOne");

        // Assert
        const found = await Category.findOne({ _id: categoryData._id });
        expect(found.name).toBe("Test");
        expect(found.slug).toBe("");
      });

      it("should accept name with 1 character (EP: 1 character)", async () => {

        // Arrange
        const categoryData = { ...defaultCategory, name: "A", slug: "a" };
        
        // Act
        mockingoose(Category).toReturn(categoryData, "findOne");

        // Assert
        const found = await Category.findOne({ _id: categoryData._id });
        expect(found.name).toBe("A");
        expect(found.slug).toBe("a");

      });

      it("should convert name to lowercase (EP: lowercase) ", async () => {

        // Arrange
        const categoryData = { ...defaultCategory, slug: "TEST"};

        // Act
        const category = new Category(categoryData);
        await category.validate()

        // Assert
        await expect(category.slug).toBe("test")

      });

    });

    // Boundary for name: length 0 and length 1
    // Special cases: name is missing, name is null
    // Not required to be tested: very long strings
    describe("Name validation (BVA)", () => {
      it("should fail if name is missing (Boundary: missing required field)", async () => {

        // Arrange
        const categoryData = { ...defaultCategory};
        delete categoryData.name;

        // Act
        const category = new Category(categoryData);

        // Assert
        await expect(category.validate()).rejects.toThrow(mongoose.Error.ValidationError);

      });

      it("should fail if name is null (Boundary: null)", async () => {

        // Arrange
        const categoryData = { ...defaultCategory, name: null};

        // Act
        const category = new Category(categoryData);

        // Assert
        await expect(category.validate()).rejects.toThrow(mongoose.Error.ValidationError);
      });

      it("should fail if name is empty string (Below Boundary: \"\")", async () => {
        
        // Arrange
        const categoryData = { ...defaultCategory, name: ""};

        // Act
        const category = new Category(categoryData);
        
        // Assert
        await expect(category.validate()).rejects.toThrow(mongoose.Error.ValidationError);

      });

      it("should accept name with 1 character (On Boundary: 1 character)", async () => {

        // Arrange
        const categoryData = { ...defaultCategory, name: "A", slug: "a" };
        
        // Act
        mockingoose(Category).toReturn(categoryData, "findOne");

        // Assert
        const found = await Category.findOne({ _id: categoryData._id });
        expect(found.name).toBe("A");
        expect(found.slug).toBe("a");

      });

      it("should accept name with 2 character (Above Boundary: 2 characters)", async () => {

        // Arrange
        const categoryData = { ...defaultCategory, name: "Ab", slug: "ab" };
        
        // Act
        mockingoose(Category).toReturn(categoryData, "findOne");

        // Assert
        const found = await Category.findOne({ _id: categoryData._id });
        expect(found.name).toBe("Ab");
        expect(found.slug).toBe("ab");

      });
    });
  });
});