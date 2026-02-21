/* eslint-disable testing-library/no-wait-for-multiple-assertions */
// Censon Lee Lemuel John Alejo, A0273436B
import React from "react";
import {
  render,
  fireEvent,
  waitFor,
  screen,
  cleanup,
} from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import CreateCategory from "../CreateCategory";

// =============== Mocks ===============
jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../../../components/Layout", () => {
  return function Layout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock("../../../components/AdminMenu", () => {
  return function AdminMenu() {
    return <div data-testid="admin-menu">AdminMenu</div>;
  };
});

jest.mock("../../../components/Form/CategoryForm", () => {
  return function CategoryForm({ handleSubmit, value, setValue }) {
    return (
      <form onSubmit={handleSubmit}>
        <input
          aria-label="category-name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit">Submit</button>
      </form>
    );
  };
});

jest.mock("antd", () => ({
  Modal: ({ open, onCancel, children }) =>
    open ? (
      <div data-testid="modal">
        <button onClick={onCancel}>cancel</button>
        {children}
      </div>
    ) : null,
}));

// =============== Mock data ===============
const mockCategories = [
  { _id: "1", name: "Electronics" },
  { _id: "2", name: "Clothing" },
];

// =============== Helpers ===============
const setupAxios = ({
  get = { success: true, categories: mockCategories },
  post = { success: true },
  put = { success: true },
  del = { success: true },
} = {}) => {
  axios.get.mockResolvedValue({ data: get });
  axios.post.mockResolvedValue({ data: post });
  axios.put.mockResolvedValue({ data: put });
  axios.delete.mockResolvedValue({ data: del });
};

const silenceConsole = () => {
  const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  return () => logSpy.mockRestore();
};

// =============== Tests ===============
describe("CreateCategory", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
    setupAxios();
  });

  afterEach(() => {
    restoreConsole();
    cleanup();
  });

  describe("Smoke", () => {
    test("renders page", async () => {
      // Arrange & Act
      render(<CreateCategory />);
      await screen.findByText("Electronics");

      // Assert
      expect(screen.getByText("Manage Category")).toBeInTheDocument();
      expect(screen.getByTestId("layout")).toBeInTheDocument();
      expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    });
  });

  describe("Get categories (EP)", () => {
    test("shows server message when loading categories is not successful", async () => {
      // Arrange
      setupAxios({
        get: {
          success: false,
          message: "Internal server error while retrieving all categories.",
          categories: mockCategories,
        },
      });

      // Act
      render(<CreateCategory />);

      // Assert
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Internal server error while retrieving all categories.",
        ),
      );
      expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
      expect(screen.queryAllByText("Edit")).toHaveLength(0);
      expect(screen.queryAllByText("Delete")).toHaveLength(0);
    });

    test("shows an error toast when loading categories throws", async () => {
      // Arrange
      axios.get.mockRejectedValueOnce(new Error("GET failed"));

      // Act
      render(<CreateCategory />);

      // Assert
      await waitFor(() => expect(console.log).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith(
        "Something went wrong in getting catgeories",
      );
    });
  });

  describe("Categories table length (BVA)", () => {
    test("renders no rows when there are 0 categories (Below Boundary 0)", async () => {
      // Arrange
      setupAxios({ get: { success: true, categories: [] } });

      // Act
      render(<CreateCategory />);

      // Assert
      await screen.findByRole("table");
      expect(screen.queryAllByText("Edit")).toHaveLength(0);
      expect(screen.queryAllByText("Delete")).toHaveLength(0);
    });

    test("renders 1 row when there is 1 category (On Boundary 1)", async () => {
      // Arrange
      setupAxios({ get: { success: true, categories: [mockCategories[0]] } });

      // Act
      render(<CreateCategory />);
      await screen.findByText("Electronics");

      // Assert
      expect(screen.getByText("Electronics")).toBeInTheDocument();
      expect(screen.getAllByText("Edit")).toHaveLength(1);
      expect(screen.getAllByText("Delete")).toHaveLength(1);
    });

    test("renders 2 rows when there are 2 categories (Above Boundary 2)", async () => {
      // Arrange & Act
      render(<CreateCategory />);
      await screen.findByText("Electronics");

      // Assert
      expect(screen.getByText("Electronics")).toBeInTheDocument();
      expect(screen.getByText("Clothing")).toBeInTheDocument();
      expect(screen.getAllByText("Edit")).toHaveLength(2);
      expect(screen.getAllByText("Delete")).toHaveLength(2);
    });
  });

  describe("Create category (EP)", () => {
    test("submits form, shows success toast, then refreshes categories", async () => {
      // Arrange
      render(<CreateCategory />);
      await screen.findByText("Electronics");
      const input = screen.getAllByLabelText("category-name")[0];

      // Act
      fireEvent.change(input, { target: { value: "NewCat" } });
      fireEvent.click(screen.getAllByText("Submit")[0]);

      // Assert
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/category/create-category",
          { name: "NewCat" },
        );
        expect(toast.success).toHaveBeenCalledWith("NewCat is created");
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    test("shows server message when create is rejected", async () => {
      // Arrange
      setupAxios({
        post: { success: false, message: "Category already exists." },
      });
      render(<CreateCategory />);
      await screen.findByText("Electronics");
      const input = screen.getAllByLabelText("category-name")[0];

      // Act
      fireEvent.change(input, { target: { value: "Electronics" } });
      fireEvent.click(screen.getAllByText("Submit")[0]);

      // Assert
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Category already exists."),
      );
    });

    test("shows error toast when create throws", async () => {
      // Arrange
      axios.post.mockRejectedValueOnce(new Error("POST failed"));
      render(<CreateCategory />);
      await screen.findByText("Electronics");
      const input = screen.getAllByLabelText("category-name")[0];

      // Act
      fireEvent.change(input, { target: { value: "X" } });
      fireEvent.click(screen.getAllByText("Submit")[0]);

      // Assert
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Something went wrong in the input form",
        ),
      );
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe("Update category (EP)", () => {
    test("opens edit modal and pre-fills category name", async () => {
      // Arrange
      render(<CreateCategory />);
      await screen.findByText("Electronics");

      // Act
      fireEvent.click(screen.getAllByText("Edit")[0]);

      // Assert
      expect(screen.getByTestId("modal")).toBeInTheDocument();
      const inputs = screen.getAllByLabelText("category-name");
      expect(inputs).toHaveLength(2);
      expect(inputs[1]).toHaveValue("Electronics");
    });

    test("submits modal form, shows success toast, closes modal, then refreshes categories", async () => {
      // Arrange
      render(<CreateCategory />);
      await screen.findByText("Electronics");
      fireEvent.click(screen.getAllByText("Edit")[0]);
      const inputs = screen.getAllByLabelText("category-name");

      // Act
      fireEvent.change(inputs[1], { target: { value: "Updated" } });
      fireEvent.click(screen.getAllByText("Submit")[1]);

      // Assert
      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/category/update-category/1",
          { name: "Updated" },
        );
        expect(toast.success).toHaveBeenCalledWith("Updated is updated");
        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    test("shows server message when update is rejected and keeps modal open", async () => {
      // Arrange
      setupAxios({
        put: { success: false, message: "Category's new name already exists." },
      });
      render(<CreateCategory />);
      await screen.findByText("Electronics");
      fireEvent.click(screen.getAllByText("Edit")[0]);
      const inputs = screen.getAllByLabelText("category-name");

      // Act
      fireEvent.change(inputs[1], { target: { value: "Updated" } });
      fireEvent.click(screen.getAllByText("Submit")[1]);

      // Assert
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Category's new name already exists.",
        ),
      );
      expect(screen.getByTestId("modal")).toBeInTheDocument();
    });

    test("shows error toast when update throws", async () => {
      // Arrange
      axios.put.mockRejectedValueOnce(new Error("PUT failed"));
      render(<CreateCategory />);
      await screen.findByText("Electronics");
      fireEvent.click(screen.getAllByText("Edit")[0]);

      // Act
      fireEvent.click(screen.getAllByText("Submit")[1]);

      // Assert
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Something went wrong"),
      );
    });

    test("closes modal when cancel is clicked", async () => {
      // Arrange
      render(<CreateCategory />);
      await screen.findByText("Electronics");
      fireEvent.click(screen.getAllByText("Edit")[0]);

      // Act
      fireEvent.click(screen.getByText("cancel"));

      // Assert
      expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });
  });

  describe("Delete category (EP)", () => {
    test("deletes category, shows success toast, then refreshes categories", async () => {
      // Arrange
      render(<CreateCategory />);
      await screen.findByText("Electronics");

      // Act
      fireEvent.click(screen.getAllByText("Delete")[0]);

      // Assert
      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          "/api/v1/category/delete-category/1",
        );
        expect(toast.success).toHaveBeenCalledWith("Category is deleted");
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    test("shows server message when delete is rejected", async () => {
      // Arrange
      setupAxios({ del: { success: false, message: "Category not found." } });
      render(<CreateCategory />);
      await screen.findByText("Electronics");

      // Act
      fireEvent.click(screen.getAllByText("Delete")[0]);

      // Assert
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Category not found."),
      );
    });

    test("shows error toast when delete throws", async () => {
      // Arrange
      axios.delete.mockRejectedValueOnce(new Error("DELETE failed"));
      render(<CreateCategory />);
      await screen.findByText("Electronics");

      // Act
      fireEvent.click(screen.getAllByText("Delete")[0]);

      // Assert
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Something went wrong"),
      );
    });
  });
});
