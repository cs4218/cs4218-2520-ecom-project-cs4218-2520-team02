import React, { useState, useContext, createContext, useEffect } from "react";
import { useAuth } from "../context/auth";

const CartContext = createContext();

const parseStoredCart = (storedCart) => {
  if (!storedCart) {
    return [];
  }

  try {
    return JSON.parse(storedCart);
  } catch (error) {
    console.error("Failed to parse cart from localStorage:", error);
    return [];
  }
};

const getStoredCart = (userId = "guest") =>
  parseStoredCart(localStorage.getItem(`cart_${userId}`));

const mergeGuestCartIntoUserCart = (userId) => {
  const guestCart = getStoredCart("guest");
  const userCart = getStoredCart(userId);
  const mergedCart = [...userCart, ...guestCart];

  localStorage.setItem(`cart_${userId}`, JSON.stringify(mergedCart));
  localStorage.removeItem("cart_guest");

  return mergedCart;
};

const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [auth] = useAuth();

  useEffect(() => {
    const userId = auth?.user?._id || "guest";
    setCart(getStoredCart(userId));
  }, [auth?.user?._id]);

  return (
    <CartContext.Provider value={[cart, setCart]}>
      {children}
    </CartContext.Provider>
  );
};

// custom hook
const useCart = () => useContext(CartContext);

export { useCart, CartProvider, getStoredCart, mergeGuestCartIntoUserCart };