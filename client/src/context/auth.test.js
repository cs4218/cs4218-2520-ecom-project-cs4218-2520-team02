import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth";
import axios from "axios";

jest.mock("axios", () => ({
  defaults: { headers: { common: { Authorization: undefined } } },
}));

const MockConsumer = () => {
  const [auth, setAuth] = useAuth();

  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.name : "guest"}</span>
      <span data-testid="token">{auth.token}</span>
      <button
        onClick={() =>
          setAuth((prev) => ({
            ...prev,
            user: { name: "testUser" },
            token: "testToken",
          }))
        }
      >
        Update
      </button>
    </div>
  );
};

describe("Auth Context", () => {
  beforeEach(() => {
    window.localStorage.clear();
    axios.defaults.headers.common.Authorization = undefined;
    jest.clearAllMocks();
  });

  it("show the default auth state", () => {
    render(
      <AuthProvider>
        <MockConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("user").textContent).toBe("guest");
    expect(screen.getByTestId("token").textContent).toBe("");
    expect(axios.defaults.headers.common.Authorization).toBe("");
  });

  it("update auth state from local storage", async () => {
    const storedAuth = {
      user: { name: "testUser" },
      token: "testToken",
    };
    window.localStorage.setItem("auth", JSON.stringify(storedAuth));

    render(
      <AuthProvider>
        <MockConsumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("testUser"),
    );
    expect(screen.getByTestId("token").textContent).toBe("testToken");
    expect(axios.defaults.headers.common.Authorization).toBe("testToken");
  });

  it("update auth state from setter", async () => {
    render(
      <AuthProvider>
        <MockConsumer />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByText("Update"));

    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("testUser"),
    );
    expect(screen.getByTestId("token").textContent).toBe("testToken");
    expect(axios.defaults.headers.common.Authorization).toBe("testToken");
  });
});
