import React from "react";
import { render, waitFor } from "@testing-library/react";
import axios from "axios";
import UserList from "./UserList";
import toast from "react-hot-toast";

jest.mock("axios");
jest.mock("react-hot-toast");

const mockUsers = [
  {
    _id: "1",
    name: "testUser",
    email: "test@example.com",
    phone: "12345678",
    address: "abc",
  },
  {
    _id: "2",
    name: "testUser2",
    email: "test2@example.com",
    phone: "12345679",
    address: "abc 2",
  },
];

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("UserList Component", () => {
  it("renders loading state initially", () => {
    const { getByText } = render(<UserList />);

    expect(getByText("Loading...")).toBeInTheDocument();
  });

  it("displays users after successful API call", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, users: mockUsers },
    });
    const { getByText } = render(<UserList />);

    await waitFor(() => {
      expect(getByText("testUser")).toBeInTheDocument();
      expect(getByText("test@example.com")).toBeInTheDocument();
      expect(getByText("12345678")).toBeInTheDocument();
      expect(getByText("abc")).toBeInTheDocument();

      expect(getByText("testUser2")).toBeInTheDocument();
      expect(getByText("test2@example.com")).toBeInTheDocument();
      expect(getByText("12345679")).toBeInTheDocument();
      expect(getByText("abc 2")).toBeInTheDocument();
    });
  });

  it("displays error toast on API failure", async () => {
    axios.get.mockRejectedValueOnce(new Error("db error"));
    const { queryByText } = render(<UserList />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      expect(queryByText("Loading...")).toBeFalsy();
    });
  });

  it("displays error toast on no data", async () => {
    axios.get.mockResolvedValueOnce({});
    const { queryByText } = render(<UserList />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      expect(queryByText("Loading...")).toBeFalsy();
    });
  });
});
