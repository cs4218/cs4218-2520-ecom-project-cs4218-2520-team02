import React, { useState, useContext, createContext, useEffect, useRef } from "react";
import { useAuth } from "../context/auth";

const CartContext = createContext();
const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [auth] = useAuth();
  const mergedRef = useRef(false);

  useEffect(() => {
    const userId = auth?.user?._id || "guest";
    if (auth?.user?._id) {
      const guestCart = JSON.parse(localStorage.getItem("cart_guest") || "[]");
      const userCart = JSON.parse(localStorage.getItem(`cart_${userId}`) || "[]");

      if (guestCart.length > 0 && !mergedRef.current) {
        mergedRef.current = true;

        // Don't dedup by _id, treat as separate cart entries
        const merged = [...userCart, ...guestCart];

        localStorage.setItem(`cart_${userId}`, JSON.stringify(merged));
        localStorage.removeItem("cart_guest");
        setCart(merged);
        return;
      }

      setCart(userCart);
    } else {
      mergedRef.current = false; // reset on logout so next login can merge again
      const guestCart = JSON.parse(localStorage.getItem("cart_guest") || "[]");
      setCart(guestCart);
    }
  }, [auth?.user?._id]);

  return (
    <CartContext.Provider value={[cart, setCart]}>
      {children}
    </CartContext.Provider>
  );
};

const useCart = () => useContext(CartContext);

export { useCart, CartProvider };