/* eslint-disable testing-library/no-wait-for-multiple-assertions */
// Censon Lee Lemuel John Alejo, A0273436B
import React from "react";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

import CreateCategory from "../CreateCategory";
import AdminRoute from "../../../components/Routes/AdminRoute";
import { AuthProvider } from "../../../context/auth";
import { SearchProvider } from "../../../context/search";
import { CartProvider } from "../../../context/cart";

// =============== Mocks ===============
jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
  Toaster: () => null,
}));

// Layout includes Header which depends on these.
jest.mock("../../../hooks/useCategory", () => jest.fn(() => []));
jest.mock("../../../components/Form/SearchInput", () => () => (
  <div data-testid="search-input" />
));

// Make Spinner deterministic for assertions
jest.mock("../../../components/Spinner", () => () => (
  <div data-testid="spinner">Spinner</div>
));

// =============== localStorage shim ===============
Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

const setAuthInStorage = (authObjOrNull) => {
  if (!authObjOrNull) {
    window.localStorage.getItem.mockReturnValue(null);
    return;
  }
  window.localStorage.getItem.mockImplementation((k) =>
    k === "auth" ? JSON.stringify(authObjOrNull) : null,
  );
};

// =============== Mock data ===============
const mockCategories = [
  { _id: "1", name: "Electronics" },
  { _id: "2", name: "Clothing" },
];

// =============== Render with real AdminRoute nesting ===============
const renderAdminCreateCategoryRoute = () =>
  render(
    <AuthProvider>
      <SearchProvider>
        <CartProvider>
          <MemoryRouter initialEntries={["/dashboard/admin/create-category"]}>
            <Routes>
              <Route path="/dashboard" element={<AdminRoute />}>
                <Route path="admin/create-category" element={<CreateCategory />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </SearchProvider>
    </AuthProvider>,
  );

const waitForInitialRows = async () => {
  await screen.findByText("Manage Category");
  await screen.findByText("Electronics");
  await screen.findByText("Clothing");
};

describe("CreateCategory integration (AdminRoute gate + CRUD)", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = jest.spyOn(console, "log").mockImplementation(() => {});
    window.localStorage.getItem.mockReset();
    axios.get.mockReset();
    axios.post.mockReset();
    axios.put.mockReset();
    axios.delete.mockReset();
  });

  afterEach(() => {
    restoreConsole?.mockRestore();
    cleanup();
  });

  describe("Access control via AdminRoute (BVA + EP)", () => {
    test("no token (BVA: Below Boundary 0): shows Spinner and does NOT call /admin-auth", async () => {
      // Arrange
      setAuthInStorage(null);

      // Act
      renderAdminCreateCategoryRoute();

      // Assert
      expect(await screen.findByTestId("spinner")).toBeInTheDocument();
      expect(axios.get).not.toHaveBeenCalled();
      expect(screen.queryByText("Manage Category")).not.toBeInTheDocument();
    });

    test("token present but admin-auth ok:false (EP: non-admin partition): shows Spinner, does NOT render page, does NOT fetch categories", async () => {
      // Arrange
      setAuthInStorage({
        user: { _id: "u1", name: "NotAdmin" },
        token: "user-token",
      });
      axios.get.mockResolvedValueOnce({ data: { ok: false } });

      // Act
      renderAdminCreateCategoryRoute();

      // Assert
      expect(await screen.findByTestId("spinner")).toBeInTheDocument();
      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth"),
      );
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Manage Category")).not.toBeInTheDocument();
    });

    test("token present and admin-auth ok:true (EP: admin partition): renders page and fetches categories", async () => {
      // Arrange
      setAuthInStorage({
        user: { _id: "u2", name: "Admin" },
        token: "admin-token",
      });

      axios.get
        .mockResolvedValueOnce({ data: { ok: true } })
        .mockResolvedValueOnce({ data: { success: true, categories: mockCategories } });

      // Act
      renderAdminCreateCategoryRoute();

      // Assert
      await waitForInitialRows();
      expect(axios.get).toHaveBeenNthCalledWith(1, "/api/v1/auth/admin-auth");
      expect(axios.get).toHaveBeenNthCalledWith(2, "/api/v1/category/get-category");
    });
  });

  describe("Create category behind AdminRoute (EP)", () => {
    test("admin creates category (EP: success path): POST then refresh renders new row", async () => {
      // Arrange
      setAuthInStorage({
        user: { _id: "u2", name: "Admin" },
        token: "admin-token",
      });

      axios.get
        .mockResolvedValueOnce({ data: { ok: true } })
        .mockResolvedValueOnce({ data: { success: true, categories: mockCategories } }) 
        .mockResolvedValueOnce({
          data: {
            success: true,
            categories: [...mockCategories, { _id: "3", name: "NewCat" }],
          },
        });

      axios.post.mockResolvedValueOnce({ data: { success: true } });

      // Act
      renderAdminCreateCategoryRoute();
      await waitForInitialRows();

      fireEvent.change(screen.getByPlaceholderText("Enter new category"), {
        target: { value: "NewCat" },
      });
      fireEvent.click(screen.getByRole("button", { name: /submit/i }));

      // Assert
      await screen.findByText("NewCat");
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/category/create-category",
          { name: "NewCat" },
        );
        expect(toast.success).toHaveBeenCalledWith("NewCat is created");
        expect(axios.get).toHaveBeenNthCalledWith(1, "/api/v1/auth/admin-auth");
        expect(axios.get).toHaveBeenNthCalledWith(2, "/api/v1/category/get-category");
        expect(axios.get).toHaveBeenNthCalledWith(3, "/api/v1/category/get-category");
      });
    });
  });

  describe("Update category behind AdminRoute (EP)", () => {
    test("admin updates category (EP: success path): PUT then refresh renders updated name (old name not in document)", async () => {
      // Arrange
      setAuthInStorage({
        user: { _id: "u2", name: "Admin" },
        token: "admin-token",
      });

      axios.get
        .mockResolvedValueOnce({ data: { ok: true } })
        .mockResolvedValueOnce({ data: { success: true, categories: mockCategories } })
        .mockResolvedValueOnce({
          data: {
            success: true,
            categories: [{ _id: "1", name: "Updated" }, mockCategories[1]],
          },
        }); // refreshed after update

      axios.put.mockResolvedValueOnce({ data: { success: true } });

      // Act
      renderAdminCreateCategoryRoute();
      await waitForInitialRows();

      fireEvent.click(screen.getAllByRole("button", { name: /edit/i })[0]);

      // Create form + modal form share placeholder; modal input is last
      const inputs = screen.getAllByPlaceholderText("Enter new category");
      const modalInput = inputs[inputs.length - 1];
      fireEvent.change(modalInput, { target: { value: "Updated" } });

      // Create submit + modal submit share label; modal submit is last
      const submitButtons = screen.getAllByRole("button", { name: /submit/i });
      fireEvent.click(submitButtons[submitButtons.length - 1]);

      // Assert
      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/category/update-category/1",
          { name: "Updated" },
        );
        expect(toast.success).toHaveBeenCalledWith("Updated is updated");

        expect(screen.getByText("Updated")).toBeInTheDocument();
        expect(screen.queryByText("Electronics")).not.toBeInTheDocument();

        expect(axios.get).toHaveBeenNthCalledWith(1, "/api/v1/auth/admin-auth");
        expect(axios.get).toHaveBeenNthCalledWith(2, "/api/v1/category/get-category");
        expect(axios.get).toHaveBeenNthCalledWith(3, "/api/v1/category/get-category");
      });
    });
  });

  describe("Delete category behind AdminRoute (EP)", () => {
    test("admin deletes category (EP: success path): DELETE then refresh removes row (not in document)", async () => {
      // Arrange
      setAuthInStorage({
        user: { _id: "u2", name: "Admin" },
        token: "admin-token",
      });

      axios.get
        .mockResolvedValueOnce({ data: { ok: true } }) 
        .mockResolvedValueOnce({ data: { success: true, categories: mockCategories } })
        .mockResolvedValueOnce({ data: { success: true, categories: [mockCategories[1]] } });

      axios.delete.mockResolvedValueOnce({ data: { success: true } });

      // Act
      renderAdminCreateCategoryRoute();
      await waitForInitialRows();

      fireEvent.click(screen.getAllByRole("button", { name: /delete/i })[0]);

      // Assert
      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          "/api/v1/category/delete-category/1",
        );
        expect(toast.success).toHaveBeenCalledWith("Category is deleted");

        expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
        expect(screen.getByText("Clothing")).toBeInTheDocument();

        expect(axios.get).toHaveBeenNthCalledWith(1, "/api/v1/auth/admin-auth");
        expect(axios.get).toHaveBeenNthCalledWith(2, "/api/v1/category/get-category");
        expect(axios.get).toHaveBeenNthCalledWith(3, "/api/v1/category/get-category");
      });
    });
  });
});