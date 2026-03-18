import React, { useState, useContext, createContext, useEffect } from "react";
import { useAuth } from "../context/auth";

const CartContext = createContext();
const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [auth, setAuth] = useAuth();

  useEffect(() => {
    const userId = auth?.user?._id || "guest";
    let existingCartItem = localStorage.getItem(`cart_${userId}`);
    try {
      if (existingCartItem) setCart(JSON.parse(existingCartItem));
    } catch (error) {
      console.error("Failed to parse cart from localStorage:", error);
    }
  }, []);

  return (
    <CartContext.Provider value={[cart, setCart]}>
      {children}
    </CartContext.Provider>
  );
};

// custom hook
const useCart = () => useContext(CartContext);

export { useCart, CartProvider };