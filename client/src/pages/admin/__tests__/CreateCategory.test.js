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

// Silence act warnings (they are emitted via console.error)
const silenceConsoleError = () => {
  const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  return () => errSpy.mockRestore();
};

// Wait for initial useEffect(getAllCategory) to finish (prevents act warnings)
const renderCreateCategories = async () => {
  render(<CreateCategory />);
  await screen.findByText("Electronics");
};

// =============== Tests ===============
describe("CreateCategory", () => {
  let restoreConsole;
  let restoreConsoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
    restoreConsoleError = silenceConsoleError();
    setupAxios();
  });

  afterEach(() => {
    restoreConsole();
    restoreConsoleError();
    cleanup();
  });

  describe("Mount and getAllCategory", () => {
    test("loads categories on mount and renders table rows and action buttons", async () => {
      await renderCreateCategories();

      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category"),
      );

      expect(await screen.findByText("Manage Category")).toBeInTheDocument();
      expect(await screen.findByText("Electronics")).toBeInTheDocument();
      expect(await screen.findByText("Clothing")).toBeInTheDocument();
      expect(screen.getAllByText("Edit")).toHaveLength(2);
      expect(screen.getAllByText("Delete")).toHaveLength(2);
    });

    test("shows an error toast when loading categories fails", async () => {
      axios.get.mockRejectedValueOnce(new Error("GET failed"));

      render(<CreateCategory />);

      await waitFor(() => expect(console.log).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith(
        "Something went wrong in getting catgeories",
      );
    });

    test("does not render any category rows when the server says loading categories was not successful", async () => {
      setupAxios({
        get: { success: false, categories: mockCategories },
      });

      render(<CreateCategory />);

      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category"),
      );

      expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
      expect(screen.queryAllByText("Edit")).toHaveLength(0);
      expect(screen.queryAllByText("Delete")).toHaveLength(0);
    });
  });

  describe("Create category handleSubmit", () => {
    test("creates a category and shows a success toast and refreshes the category list", async () => {
      await renderCreateCategories();

      const input = screen.getAllByLabelText("category-name")[0];
      fireEvent.change(input, { target: { value: "NewCat" } });

      fireEvent.click(screen.getAllByText("Submit")[0]);

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/category/create-category",
          { name: "NewCat" },
        ),
      );

      expect(toast.success).toHaveBeenCalledWith("NewCat is created");

      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category"),
      );
    });

    test("shows the server error message when creating a category is rejected", async () => {
      setupAxios({
        post: { success: false, message: "Duplicate category" },
      });

      await renderCreateCategories();

      const input = screen.getAllByLabelText("category-name")[0];
      fireEvent.change(input, { target: { value: "Electronics" } });

      fireEvent.click(screen.getAllByText("Submit")[0]);

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Duplicate category");
    });

    test("shows an error toast when creating a category throws", async () => {
      axios.post.mockRejectedValueOnce(new Error("POST failed"));

      await renderCreateCategories();

      const input = screen.getAllByLabelText("category-name")[0];
      fireEvent.change(input, { target: { value: "X" } });

      fireEvent.click(screen.getAllByText("Submit")[0]);

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      await waitFor(() => expect(console.log).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith(
        "Something went wrong in the input form",
      );
    });
  });

  describe("Update category handleUpdate", () => {
    test("opens the edit modal and pre-fills the current category name", async () => {
      await renderCreateCategories();

      fireEvent.click(screen.getAllByText("Edit")[0]);

      expect(await screen.findByTestId("modal")).toBeInTheDocument();

      const inputs = screen.getAllByLabelText("category-name");
      expect(inputs).toHaveLength(2);
      expect(inputs[1]).toHaveValue("Electronics");
    });

    test("updates a category and shows a success toast and closes the modal and refreshes the list", async () => {
      await renderCreateCategories();

      fireEvent.click(screen.getAllByText("Edit")[0]);
      expect(await screen.findByTestId("modal")).toBeInTheDocument();

      const inputs = screen.getAllByLabelText("category-name");
      fireEvent.change(inputs[1], { target: { value: "Updated" } });

      fireEvent.click(screen.getAllByText("Submit")[1]);

      await waitFor(() =>
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/category/update-category/1",
          { name: "Updated" },
        ),
      );

      expect(toast.success).toHaveBeenCalledWith("Updated is updated");

      await waitFor(() =>
        expect(screen.queryByTestId("modal")).not.toBeInTheDocument(),
      );

      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category"),
      );
    });

    test("shows the server error message when updating a category is rejected and keeps the modal open", async () => {
      setupAxios({
        put: { success: false, message: "Update rejected" },
      });

      await renderCreateCategories();

      fireEvent.click(screen.getAllByText("Edit")[0]);
      await screen.findByTestId("modal");

      const inputs = screen.getAllByLabelText("category-name");
      fireEvent.change(inputs[1], { target: { value: "Updated" } });

      fireEvent.click(screen.getAllByText("Submit")[1]);

      await waitFor(() => expect(axios.put).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Update rejected");
      expect(screen.getByTestId("modal")).toBeInTheDocument();
    });

    test("shows an error toast when updating a category throws", async () => {
      axios.put.mockRejectedValueOnce(new Error("PUT failed"));

      await renderCreateCategories();

      fireEvent.click(screen.getAllByText("Edit")[0]);
      await screen.findByTestId("modal");

      fireEvent.click(screen.getAllByText("Submit")[1]);

      await waitFor(() => expect(axios.put).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });

    test("closes the modal when cancel is clicked", async () => {
      await renderCreateCategories();

      fireEvent.click(screen.getAllByText("Edit")[0]);
      await screen.findByTestId("modal");

      fireEvent.click(screen.getByText("cancel"));

      await waitFor(() =>
        expect(screen.queryByTestId("modal")).not.toBeInTheDocument(),
      );
    });
  });

  describe("Delete category handleDelete", () => {
    test("deletes a category and shows a success toast and refreshes the category list", async () => {
      await renderCreateCategories();

      fireEvent.click(screen.getAllByText("Delete")[0]);

      await waitFor(() =>
        expect(axios.delete).toHaveBeenCalledWith(
          "/api/v1/category/delete-category/1",
        ),
      );

      expect(toast.success).toHaveBeenCalledWith("Category is deleted");

      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category"),
      );
    });

    test("shows the server error message when deleting a category is rejected", async () => {
      setupAxios({
        del: { success: false, message: "Delete rejected" },
      });

      await renderCreateCategories();

      fireEvent.click(screen.getAllByText("Delete")[0]);

      await waitFor(() => expect(axios.delete).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Delete rejected");
    });

    test("shows an error toast when deleting a category throws", async () => {
      axios.delete.mockRejectedValueOnce(new Error("DELETE failed"));

      await renderCreateCategories();

      fireEvent.click(screen.getAllByText("Delete")[0]);

      await waitFor(() => expect(axios.delete).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
  });
});
