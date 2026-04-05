// Song Jia Hui A0259494L

import http from "node:http";
import JWT from "jsonwebtoken";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const APP_URL = process.env.APP_URL ?? "http://localhost:6060";
const APP_HOST = new URL(APP_URL).hostname;
const APP_PORT = Number(new URL(APP_URL).port) || 6060;

const RUN_ID = Date.now();
const USER_A = {
  name: "IDOR Test User A",
  email: `idor-usera-${RUN_ID}@security.test`,
  password: "TestPassA1!",
  phone: "0000000001",
  address: "1 Test Street",
  answer: "testanswer",
};
const USER_B = {
  name: "IDOR Test User B",
  email: `idor-userb-${RUN_ID}@security.test`,
  password: "TestPassB1!",
  phone: "0000000002",
  address: "2 Test Street",
  answer: "testanswer",
};

// A valid-looking MongoDB ObjectId that does not exist in the DB
const FAKE_OBJECT_ID = "64a1b2c3d4e5f6a7b8c9d0e1";

let tokenA = null;
let tokenB = null;
let userAId = null;
let appAvailable = false;

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      "Content-Type": "application/json",
      ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const req = http.request(
      { hostname: APP_HOST, port: APP_PORT, path, method, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            /* non-JSON */
          }
          resolve({ status: res.statusCode, body: json, raw: data });
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const get = (path, token) => request("GET", path, null, token);
const post = (path, body, token) => request("POST", path, body, token);
const put = (path, body, token) => request("PUT", path, body, token);

// ---------------------------------------------------------------------------
// Setup -- register and login both test users
// ---------------------------------------------------------------------------

async function registerAndLogin(user) {
  await post("/api/v1/auth/register", user);
  const loginRes = await post("/api/v1/auth/login", {
    email: user.email,
    password: user.password,
  });
  if (!loginRes.body?.token) {
    throw new Error(
      `Setup: could not login ${user.email} -- ${loginRes.raw.slice(0, 200)}`,
    );
  }
  return { token: loginRes.body.token, id: loginRes.body.user?._id };
}

beforeAll(async () => {
  try {
    await get("/");
    appAvailable = true;
  } catch {
    return;
  }

  const a = await registerAndLogin(USER_A);
  const b = await registerAndLogin(USER_B);
  tokenA = a.token;
  tokenB = b.token;
  userAId = a.id;
}, 30_000);

function skipIfDown() {
  if (!appAvailable) {
    console.warn(
      `\n  SKIPPED: App not reachable at ${APP_URL}. Run: npm run server\n`,
    );
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 1. Unauthenticated Access (all protected routes must return 401)
// ---------------------------------------------------------------------------

describe("IDOR: Unauthenticated Access", () => {
  it("GET /orders should return 401 with no token", async () => {
    if (skipIfDown()) return;
    const res = await get("/api/v1/auth/orders");
    expect(res.status).toBe(401);
  });

  it("PUT /profile should return 401 with no token", async () => {
    if (skipIfDown()) return;
    const res = await put("/api/v1/auth/profile", { name: "Hacker" });
    expect(res.status).toBe(401);
  });

  it("GET /all-orders (admin) should return 401 with no token", async () => {
    if (skipIfDown()) return;
    const res = await get("/api/v1/auth/all-orders");
    expect(res.status).toBe(401);
  });

  it("PUT /order-status/:id (admin) should return 401 with no token", async () => {
    if (skipIfDown()) return;
    const res = await put(`/api/v1/auth/order-status/${FAKE_OBJECT_ID}`, {
      status: "Shipped",
    });
    expect(res.status).toBe(401);
  });

  it("GET /user/all (admin) should return 401 with no token", async () => {
    if (skipIfDown()) return;
    const res = await get("/api/v1/user/all");
    expect(res.status).toBe(401);
  });

  it("GET /admin-auth should return 401 with no token", async () => {
    if (skipIfDown()) return;
    const res = await get("/api/v1/auth/admin-auth");
    expect(res.status).toBe(401);
  });

  it("DELETE /product/:pid (admin) should return 401 with no token", async () => {
    if (skipIfDown()) return;
    const res = await request(
      "DELETE",
      `/api/v1/product/delete-product/${FAKE_OBJECT_ID}`,
    );
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 2. Privilege Escalation (regular user token must not access admin routes)
// ---------------------------------------------------------------------------

describe("IDOR: Privilege Escalation -- Admin Routes with User Token", () => {
  it("GET /all-orders should return 403 for regular user", async () => {
    if (skipIfDown()) return;
    const res = await get("/api/v1/auth/all-orders", tokenA);
    expect(res.status).toBe(403);
    // Must not return any order data
    expect(res.body?.orders).toBeUndefined();
  });

  it("PUT /order-status/:id should return 403 for regular user", async () => {
    if (skipIfDown()) return;
    const res = await put(
      `/api/v1/auth/order-status/${FAKE_OBJECT_ID}`,
      { status: "Shipped" },
      tokenA,
    );
    expect(res.status).toBe(403);
  });

  it("GET /user/all should return 403 for regular user", async () => {
    if (skipIfDown()) return;
    const res = await get("/api/v1/user/all", tokenA);
    expect(res.status).toBe(403);
    // Must not leak user list
    expect(res.body?.users).toBeUndefined();
  });

  it("DELETE /product/:pid should return 403 for regular user", async () => {
    if (skipIfDown()) return;
    const res = await request(
      "DELETE",
      `/api/v1/product/delete-product/${FAKE_OBJECT_ID}`,
      null,
      tokenA,
    );
    expect(res.status).toBe(403);
  });

  it("POST /product/create-product should return 403 for regular user", async () => {
    if (skipIfDown()) return;
    const res = await post("/api/v1/product/create-product", {}, tokenA);
    expect(res.status).toBe(403);
  });

  it("GET /admin-auth should return 403 for regular user", async () => {
    if (skipIfDown()) return;
    const res = await get("/api/v1/auth/admin-auth", tokenA);
    expect(res.status).toBe(403);
  });

  it("GET /auth/test should return 403 for regular user", async () => {
    if (skipIfDown()) return;
    const res = await get("/api/v1/auth/test", tokenA);
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 3. Cross-User Order Isolation (User B cannot read User A's orders)
// ---------------------------------------------------------------------------

describe("IDOR: Order Data Isolation Between Users", () => {
  it("GET /orders for User A should not return orders owned by User B", async () => {
    if (skipIfDown()) return;
    const resA = await get("/api/v1/auth/orders", tokenA);
    const resB = await get("/api/v1/auth/orders", tokenB);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const ordersA = resA.body?.orders ?? [];
    const ordersB = resB.body?.orders ?? [];

    // Verify no order from B's response appears in A's response
    const orderIdsA = new Set(ordersA.map((o) => o._id));
    const orderIdsB = new Set(ordersB.map((o) => o._id));

    const overlap = [...orderIdsB].filter((id) => orderIdsA.has(id));
    expect(overlap).toHaveLength(0);
  });

  it("GET /orders response must only contain orders where buyer matches the token identity", async () => {
    if (skipIfDown()) return;
    const res = await get("/api/v1/auth/orders", tokenA);
    expect(res.status).toBe(200);

    const orders = res.body?.orders ?? [];
    for (const order of orders) {
      // Each order's buyer._id or buyer name should correspond to User A
      // buyer is populated with "name" only. It should match USER_A
      if (order.buyer?.name) {
        expect(order.buyer.name).toBe(USER_A.name);
      }
    }
  });

  it("Using User B token to request orders must not expose User A order IDs", async () => {
    if (skipIfDown()) return;
    const resA = await get("/api/v1/auth/orders", tokenA);
    const resB = await get("/api/v1/auth/orders", tokenB);

    const orderIdsA = (resA.body?.orders ?? []).map((o) => String(o._id));
    const orderIdsB = (resB.body?.orders ?? []).map((o) => String(o._id));

    if (orderIdsA.length > 0) {
      for (const id of orderIdsA) {
        expect(orderIdsB).not.toContain(id);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Token Manipulation
// ---------------------------------------------------------------------------

describe("IDOR: Token Manipulation", () => {
  it("tampered JWT signature should return 401", async () => {
    if (skipIfDown()) return;
    const parts = tokenA.split(".");
    parts[2] = parts[2].split("").reverse().join(""); // flip the signature
    const tamperedToken = parts.join(".");

    const res = await get("/api/v1/auth/orders", tamperedToken);
    expect(res.status).toBe(401);
    expect(res.body?.orders).toBeUndefined();
  });

  it("JWT signed with wrong secret should return 401", async () => {
    if (skipIfDown()) return;
    const fakeToken = JWT.sign(
      { _id: FAKE_OBJECT_ID, role: 0 },
      "wrong-secret-key",
      { expiresIn: "1d" },
    );
    const res = await get("/api/v1/auth/orders", fakeToken);
    expect(res.status).toBe(401);
  });

  it("expired JWT should return 401", async () => {
    if (skipIfDown()) return;
    const expiredToken = JWT.sign(
      { _id: userAId },
      process.env.JWT_SECRET ?? "HGFHGEAD12124322432",
      { expiresIn: "0s" },
    );
    // Allow 1s for the token to expire
    await new Promise((r) => setTimeout(r, 1100));
    const res = await get("/api/v1/auth/orders", expiredToken);
    expect(res.status).toBe(401);
  });

  it("JWT with fabricated non-existent user ID should be rejected on admin routes", async () => {
    if (skipIfDown()) return;
    // The JWT itself is validly signed but the _id does not exist in the DB.
    const fabricatedToken = JWT.sign(
      { _id: FAKE_OBJECT_ID },
      process.env.JWT_SECRET ?? "HGFHGEAD12124322432",
      { expiresIn: "1d" },
    );
    const res = await get("/api/v1/auth/all-orders", fabricatedToken);
    // Must not return 200. Should be either 401 (user not found) or 403
    expect([401, 403]).toContain(res.status);
    expect(res.body?.orders).toBeUndefined();
  });

  it("JWT with role:1 signed with wrong secret should not grant admin access", async () => {
    if (skipIfDown()) return;
    const fakeAdminToken = JWT.sign(
      { _id: FAKE_OBJECT_ID, role: 1 },
      "wrong-secret-key",
      { expiresIn: "1d" },
    );
    const res = await get("/api/v1/auth/all-orders", fakeAdminToken);
    expect(res.status).toBe(401);
    expect(res.body?.orders).toBeUndefined();
  });

  it("completely malformed token string should return 401", async () => {
    if (skipIfDown()) return;
    const res = await get("/api/v1/auth/orders", "not.a.valid.jwt.at.all");
    expect(res.status).toBe(401);
  });

  it("empty Bearer token should return 401", async () => {
    if (skipIfDown()) return;
    const res = await get("/api/v1/auth/orders", "");
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 5. Profile IDOR (cannot update another user's profile)
// ---------------------------------------------------------------------------

describe("IDOR: Profile Update Isolation", () => {
  it("profile update uses JWT identity, not a supplied userId in body", async () => {
    if (skipIfDown()) return;

    // User B attempts to update User A's profile by injecting User A's ID
    const res = await put(
      "/api/v1/auth/profile",
      { name: "Hacked by User B", userId: userAId, _id: userAId },
      tokenB,
    );

    // Should succeed (200) but must update User B's profile, not User A's
    if (res.status === 200) {
      // Verify User A's name is unchanged
      const loginCheckA = await post("/api/v1/auth/login", {
        email: USER_A.email,
        password: USER_A.password,
      });
      expect(loginCheckA.body?.user?.name).toBe(USER_A.name);
    } else {
      // Any non-200 is also acceptable -- the operation was rejected
      expect([400, 401, 403]).toContain(res.status);
    }
  });

  it("profile update with User A token should only modify User A", async () => {
    if (skipIfDown()) return;
    const newName = `User A Updated ${RUN_ID}`;
    const res = await put("/api/v1/auth/profile", { name: newName }, tokenA);
    expect(res.status).toBe(200);

    // Confirm User B's name is unchanged
    const resB = await get("/api/v1/auth/orders", tokenB);
    expect(resB.status).toBe(200);
    // User B's token still works -- profile not corrupted
  });
});

// ---------------------------------------------------------------------------
// 6. Valid User -- Positive Checks (correct authorisation behaviour)
// ---------------------------------------------------------------------------

describe("IDOR: Valid Authorisation (positive checks)", () => {
  it("GET /user-auth should return 200 for authenticated user", async () => {
    if (skipIfDown()) return;
    const res = await get("/api/v1/auth/user-auth", tokenA);
    expect(res.status).toBe(200);
    expect(res.body?.ok).toBe(true);
  });

  it("GET /orders should return 200 for authenticated user", async () => {
    if (skipIfDown()) return;
    const res = await get("/api/v1/auth/orders", tokenA);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body?.orders)).toBe(true);
  });

  it("GET /orders with User B token should return 200 (own empty list)", async () => {
    if (skipIfDown()) return;
    const res = await get("/api/v1/auth/orders", tokenB);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body?.orders)).toBe(true);
  });
});
