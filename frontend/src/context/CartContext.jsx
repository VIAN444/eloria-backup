import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const KEY = "eloria_cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product, quantity = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === product.id);
      if (found) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock ?? 99) } : i
        );
      }
      return [
        ...prev,
        { id: product.id, name: product.name, price: product.price, image: (product.images || [])[0] || "", stock: product.stock ?? 99, quantity },
      ];
    });
    setOpen(true);
  };

  const updateQty = (id, quantity) => {
    setItems((prev) =>
      quantity <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  };
  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clear = () => setItems([]);

  const value = useMemo(() => {
    const count = items.reduce((a, i) => a + i.quantity, 0);
    const total = items.reduce((a, i) => a + i.price * i.quantity, 0);
    return { items, count, total, addItem, updateQty, removeItem, clear, open, setOpen };
  }, [items, open]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
