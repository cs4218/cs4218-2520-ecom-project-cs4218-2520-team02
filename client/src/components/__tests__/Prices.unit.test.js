// Censon Lee Lemuel John Alejo, A0273436B
import { Prices } from "../Prices";

describe("Prices", () => {
  test("exports expected price bands", () => {
    expect(Array.isArray(Prices)).toBe(true);
    expect(Prices.length).toBeGreaterThan(0);
  });

  test("each price band has id, name, and 2-number range", () => {
    for (const p of Prices) {
      expect(typeof p._id).toBe("number");
      expect(typeof p.name).toBe("string");
      expect(Array.isArray(p.array)).toBe(true);
      expect(p.array).toHaveLength(2);
      expect(typeof p.array[0]).toBe("number");
      expect(typeof p.array[1]).toBe("number");
      expect(p.array[0]).toBeLessThanOrEqual(p.array[1]);
    }
  });

  test("ids are unique", () => {
    const ids = Prices.map((p) => p._id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});