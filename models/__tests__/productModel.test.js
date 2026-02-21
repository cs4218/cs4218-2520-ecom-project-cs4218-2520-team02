// Censon Lee Lemuel John Alejo, A0273436B
import mongoose from "mongoose";
import mockingoose from "mockingoose";
import { jest } from "@jest/globals";

const { default: Product } = await import("../productModel.js");

describe("Products model", () => {
  const oid = () => new mongoose.Types.ObjectId();

  const base = (overrides = {}) => ({
    name: "iPhone 15",
    slug: "iphone-15",
    description: "Latest model",
    price: 1999,
    category: oid(),
    quantity: 10,
    shipping: true,
    ...overrides,
  });

  const normalize = (x) => {
    const obj = Array.isArray(x)
      ? x.map((d) => (d?.toObject ? d.toObject({ depopulate: true }) : d))
      : x?.toObject
        ? x.toObject({ depopulate: true })
        : x;

    const fix = (o) => {
      if (!o || typeof o !== "object") return o;
      const out = { ...o };
      if (out._id?.toString) out._id = out._id.toString();
      if (out.category?.toString) out.category = out.category.toString();
      return out;
    };

    return Array.isArray(obj) ? obj.map(fix) : fix(obj);
  };

  beforeEach(() => {
    mockingoose.resetAll();
    jest.clearAllMocks();
  });

  test("validation: missing required fields throws", () => {
    const doc = new Product({});
    const err = doc.validateSync();
    expect(err).toBeTruthy();
    expect(err.errors.name).toBeTruthy();
    expect(err.errors.slug).toBeTruthy();
    expect(err.errors.description).toBeTruthy();
    expect(err.errors.price).toBeTruthy();
    expect(err.errors.category).toBeTruthy();
    expect(err.errors.quantity).toBeTruthy();
  });

  test("save: returns mocked saved doc", async () => {
    const payload = base();
    const savedDoc = { _id: oid(), ...payload };

    mockingoose("Products").toReturn(savedDoc, "save");

    const res = await new Product(payload).save();

    expect(normalize(res)).toMatchObject(normalize(savedDoc));
  });

  test("find: returns mocked list", async () => {
    const cid = oid();
    const docs = [
      { _id: oid(), ...base({ category: cid, slug: "a" }) },
      { _id: oid(), ...base({ category: cid, slug: "b" }) },
    ];

    mockingoose("Products").toReturn(docs, "find");

    const res = await Product.find({ category: cid });

    expect(res).toHaveLength(2);
    expect(normalize(res)).toMatchObject(normalize(docs));
  });

  test("findById: uses findOne mock", async () => {
    const _doc = { _id: "507f191e810c19729de860ea", ...base() };

    mockingoose("Products").toReturn(_doc, "findOne");

    const res = await Product.findById(_doc._id);

    expect(normalize(res)).toMatchObject(normalize(_doc));
  });

  test("findByIdAndUpdate: uses findOneAndUpdate mock", async () => {
    const _id = oid();
    const updated = { _id, ...base({ _id, price: 1234 }) };

    mockingoose("Products").toReturn(updated, "findOneAndUpdate");

    const res = await Product.findByIdAndUpdate(
      _id,
      { $set: { price: 1234 } },
      { new: true }
    );

    expect(normalize(res)).toMatchObject(normalize(updated));
  });
});
