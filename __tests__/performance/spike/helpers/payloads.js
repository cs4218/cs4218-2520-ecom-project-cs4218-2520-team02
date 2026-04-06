// Yap Zhao Yi, A0277540B
export const SEARCH_KEYWORDS = ["phone", "watch", "speaker", "camera", "laptop"];

export const PRICE_RANGES = [
  [0, 50],
  [50, 200],
  [200, 500],
  [500, 5000],
];

export function buildProductFilterPayload(categoryId, priceRange = []) {
  return {
    checked: categoryId ? [categoryId] : [],
    radio: Array.isArray(priceRange) ? priceRange : [],
  };
}

export function buildCart(products, size = 2) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("At least one product is required to build a payment cart.");
  }

  return products.slice(0, Math.max(1, size)).map((product) => ({
    _id: product._id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    category: typeof product.category === "object" ? product.category?._id : product.category,
    quantity: product.quantity,
    shipping: product.shipping,
  }));
}
