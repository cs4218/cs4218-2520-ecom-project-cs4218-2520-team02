// Yap Zhao Yi, A0277540B
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { jest } from "@jest/globals";

import categoryModel from "../models/categoryModel.js";
import {
  createCategoryController,
  updateCategoryController,
  getAllCategoriesController,
  getCategoryController,
  deleteCategoryController,
} from "../controllers/categoryController.js";

// Note: branches already covered by unit tests are not included except for special cases 
// where the branch is due to a result of database integration
describe("Category Controller Integration Tests", () => {
    let mongoServer;
    let app;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());

        app = express();
        app.use(express.json());

        app.post("/categories", createCategoryController);
        app.put("/categories/:id", updateCategoryController);
        app.get("/categories", getAllCategoriesController);
        app.get("/categories/:slug", getCategoryController);
        app.delete("/categories/:id", deleteCategoryController);
    });

    beforeEach(async () => {
        await categoryModel.deleteMany({});

        jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
        console.log.mockRestore();
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    describe("createCategoryController", () => {

        it("should create a category successfully if none exists", async () => {

            // Act
            const res = await request(app).post("/categories").send({ name: "CategoryA" });

            // Assert
            expect(res.status).toBe(201);
            expect(res.body).toMatchObject({
                success: true,
                message: "New category created successfully.",
            });

            const dbCategories = await categoryModel.find({ name: "CategoryA" });
            expect(dbCategories.length).toBe(1);
            expect(dbCategories[0].slug).toBe("categorya");
        });

        it("should return 409 if category to create already exists", async () => {

            // Arrange
            const category = await categoryModel.create({
                name: "CategoryA",
                slug: "categorya",
            });

            // Act
            const res = await request(app).post("/categories").send({ name: "CategoryA" });

            // Assert
            expect(res.status).toBe(409);
            expect(res.body).toMatchObject({
                success: false,
                message: "Category already exists.",
            });

            const categories = await categoryModel.find({ name: "CategoryA" });
            expect(categories.length).toBe(1);

            const unchanged = await categoryModel.findById(category._id);
            expect(unchanged.name).toBe("CategoryA");
            expect(unchanged.slug).toBe("categorya");
        });
    });

    describe("updateCategoryController", () => {

        it("should update category successfully if category to update exists and new name does not conflict", async () => {
            
            // Arrange
            const category = await categoryModel.create({
                name: "CategoryA",
                slug: "categorya",
            });

            // Act
            const res = await request(app).put(`/categories/${category._id}`).send({ name: "CategoryB" });

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                success: true,
                message: "Category updated successfully.",
            });

            const updated = await categoryModel.findById(category._id);
            expect(updated.name).toBe("CategoryB");
            expect(updated.slug).toBe("categoryb");

            const categories = await categoryModel.find({ name: "CategoryA" });
            expect(categories.length).toBe(0);
        });

        it("should return 404 if category to update does not exist", async () => {
            
            // Arrange
            const fakeId = new mongoose.Types.ObjectId().toString();

            // Act
            const res = await request(app).put(`/categories/${fakeId}`).send({ name: "CategoryB" });

            expect(res.status).toBe(404);
            expect(res.body).toMatchObject({
                success: false,
                message: "Category not found.",
            });
        });

        it("should return 409 if category to update exists and new name conflicts", async () => {
            
            // Arrange
            const categoryA = await categoryModel.create({
                name: "CategoryA",
                slug: "categorya",
            });
            const categoryB = await categoryModel.create({
                name: "CategoryB",
                slug: "categoryb",
            });

            // Act
            const res = await request(app).put(`/categories/${categoryA._id}`).send({ name: "CategoryB" });

            expect(res.status).toBe(409);
            expect(res.body).toMatchObject({
                success: false,
                message: "Category's new name already exists.",
            });

            const unchangedA = await categoryModel.findById(categoryA._id);
            expect(unchangedA.name).toBe("CategoryA");
            expect(unchangedA.slug).toBe("categorya");

            const unchangedB = await categoryModel.findById(categoryB._id);
            expect(unchangedB.name).toBe("CategoryB");
            expect(unchangedB.slug).toBe("categoryb");
        });
    });

    describe("getAllCategoriesController", () => {

        it("should return all categories successfully", async () => {
            
            // Arrange
            const categoryA = await categoryModel.create({ name: "CategoryA", slug: "categorya" });
            const categoryB = await categoryModel.create({ name: "CategoryB", slug: "categoryb" });

            // Act
            const res = await request(app).get("/categories");

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                success: true,
                message: "All categories retrieved successfully.",
            });

            expect(res.body.categories.length).toBe(2);

            const returnedIds = res.body.categories.map(c => c._id.toString());
            const expectedIds = [categoryA._id.toString(), categoryB._id.toString()];

            expect(returnedIds.sort()).toEqual(expectedIds.sort());
        });
    });

    describe("getCategoryController", () => {

        it("should return category by slug if it exists", async () => {
            
            // Arrange
            await categoryModel.create({
                name: "CategoryA",
                slug: "categorya",
            });

            // Act
            const res = await request(app).get("/categories/categorya");

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                success: true,
                message: "Category retrieved successfully.",
            });

            expect(res.body.category.slug).toBe("categorya");
        });
        
        it("should return 404 if category to get does not exist", async () => {
            
            // Act
            const res = await request(app).get("/categories/fakeslug");

            // Assert
            expect(res.status).toBe(404);
            expect(res.body).toMatchObject({
                success: false,
                message: "Category not found.",
            });
        });
    });

    describe("deleteCategoryController", () => {

        it("should delete category if it exists", async () => {
            
            // Arrange
            const category = await categoryModel.create({
                name: "CategoryA",
                slug: "categorya",
            });

            // Act
            const res = await request(app).delete(`/categories/${category._id}`);

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                success: true,
                message: "Category deleted successfully.",
            });

            const deleted = await categoryModel.findById(category._id);
            expect(deleted).toBeNull();

            const categories = await categoryModel.find({ name: "CategoryA" });
            expect(categories.length).toBe(0);
        });

        it("should return 404 if category to delete does not exist", async () => {
            
            // Arrange
            const fakeId = new mongoose.Types.ObjectId().toString();

            // Act
            const res = await request(app).delete(`/categories/${fakeId}`);

            // Assert
            expect(res.status).toBe(404);
            expect(res.body).toMatchObject({
                success: false,
                message: "Category not found.",
            });
        });
    });
})
