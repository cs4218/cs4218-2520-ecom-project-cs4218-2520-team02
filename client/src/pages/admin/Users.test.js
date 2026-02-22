import React from "react";
import { render } from "@testing-library/react";
import Users from "./Users";

jest.mock("../../components/Layout", () => (props) => (
  <div data-testid="layout">{props.children}</div>
));
jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">AdminMenu</div>
));
jest.mock("../../components/UserList", () => () => (
  <div data-testid="user-list">UserList</div>
));

describe("Users Page", () => {
  it("renders layout, admin menu, and user list", () => {
    const { getByTestId, getByText } = render(<Users />);

    expect(getByTestId("layout")).toBeInTheDocument();
    expect(getByTestId("admin-menu")).toBeInTheDocument();
    expect(getByTestId("user-list")).toBeInTheDocument();
    expect(getByText("All Users")).toBeInTheDocument();
  });
});
