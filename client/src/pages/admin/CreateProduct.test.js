// Jovin Ang Yusheng, A0273460H
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateProduct from "./CreateProduct";
import axios from "axios";
import toast from "react-hot-toast";

// =============== Mocks ===============
jest.mock("axios");
jest.mock("react-hot-toast");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
}));

// Mock Layout/AdminMenu
jest.mock("./../../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));
jest.mock("./../../components/AdminMenu", () => () => (
    <div data-testid="admin-menu" />
));

jest.mock("antd", () => {
    const Select = ({ placeholder, onChange, children, className }) => (
        <select
            aria-label={placeholder}
            className={className}
            onChange={(e) => onChange?.(e.target.value)}
            defaultValue=""
        >
            <option value="" disabled>
                {placeholder}
            </option>
            {children}
        </select>
    );

    Select.Option = ({ value, children }) => (
        <option value={value}>{children}</option>
    );

    return { Select };
});

// =============== Tests ===============
describe("CreateProduct Page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("shows toast error if category fetch fails", async () => {
        axios.get.mockRejectedValueOnce(new Error("Network Error"));

        render(<CreateProduct />);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "Something went wrong in getting category"
            );
        });
    })
})