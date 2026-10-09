import { useCallback, useEffect, useState } from "react";

export interface PlacedOrderItem {
  id: number | string;
  productName: string;
  selectedOption?: string | null;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
}

export interface PlacedOrder {
  id: string;
  ticketNumber: string;
  lastFour: string;
  items: PlacedOrderItem[];
  subtotal: number;
  total: number;
  paymentMethod: string;
  createdAt: number; // Unix timestamp in ms
  expiresAt: number; // createdAt + 30 minutes
}

export const PLACED_ORDERS_LIST_KEY = "texs_placed_orders_list";
export const PLACED_ORDER_KEY = "texs_placed_order_snapshot";
export const PLACED_ORDER_EVENT = "texs_placed_order_changed";
export const PLACED_ORDER_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

function emitOrderChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PLACED_ORDER_EVENT));
  }
}

/**
 * Checks if a placed order is currently within its 30-minute viewing window.
 * The window is calculated strictly per order:
 * currentTime - orderCreatedAt < 30 minutes
 */
export function isPlacedOrderActive(
  order: PlacedOrder | null | undefined,
  atTime: number = Date.now()
): boolean {
  if (!order || typeof order.createdAt !== "number") {
    return false;
  }
  const elapsed = atTime - order.createdAt;
  return elapsed >= 0 && elapsed < PLACED_ORDER_WINDOW_MS;
}

/**
 * Retrieves the full collection of saved placed order snapshots from storage.
 */
export function getPlacedOrders(): PlacedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const rawList =
      localStorage.getItem(PLACED_ORDERS_LIST_KEY) ||
      sessionStorage.getItem(PLACED_ORDERS_LIST_KEY);

    if (rawList) {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (o): o is PlacedOrder =>
            !!o &&
            typeof o.id === "string" &&
            typeof o.createdAt === "number" &&
            Array.isArray(o.items)
        );
      }
    }

    // Fallback: check legacy single-snapshot key for smooth migration
    const legacyRaw =
      localStorage.getItem(PLACED_ORDER_KEY) ||
      sessionStorage.getItem(PLACED_ORDER_KEY);
    if (legacyRaw) {
      const parsedLegacy = JSON.parse(legacyRaw);
      if (
        parsedLegacy &&
        typeof parsedLegacy.createdAt === "number" &&
        Array.isArray(parsedLegacy.items)
      ) {
        return [parsedLegacy as PlacedOrder];
      }
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Retrieves all currently active placed orders (still within their individual 30-minute window).
 */
export function getActivePlacedOrders(atTime: number = Date.now()): PlacedOrder[] {
  return getPlacedOrders().filter((order) => isPlacedOrderActive(order, atTime));
}

/**
 * Retrieves a specific placed order snapshot by its unique ID or ticketNumber.
 */
export function getPlacedOrderById(id: string): PlacedOrder | null {
  if (!id) return null;
  const orders = getPlacedOrders();
  return orders.find((o) => o.id === id || o.ticketNumber === id) ?? null;
}

/**
 * Retrieves the most recent active order snapshot, or the latest placed order.
 * Kept for backward compatibility with single-order callers.
 */
export function getPlacedOrder(): PlacedOrder | null {
  const active = getActivePlacedOrders();
  if (active.length > 0) {
    return active[active.length - 1];
  }
  const all = getPlacedOrders();
  return all.length > 0 ? all[all.length - 1] : null;
}

/**
 * Persists a placed order snapshot by appending it to the placed-orders collection.
 * Does NOT overwrite previously placed orders.
 */
export function savePlacedOrder(order: PlacedOrder): void {
  if (typeof window === "undefined" || !order) return;
  try {
    const existing = getPlacedOrders();
    const index = existing.findIndex((o) => o.id === order.id);

    let updatedList: PlacedOrder[];
    if (index >= 0) {
      updatedList = [...existing];
      updatedList[index] = order;
    } else {
      updatedList = [...existing, order];
    }

    const serializedList = JSON.stringify(updatedList);
    localStorage.setItem(PLACED_ORDERS_LIST_KEY, serializedList);
    sessionStorage.setItem(PLACED_ORDERS_LIST_KEY, serializedList);

    // Also update legacy key with the latest order for backwards compatibility
    const serializedLatest = JSON.stringify(order);
    localStorage.setItem(PLACED_ORDER_KEY, serializedLatest);
    sessionStorage.setItem(PLACED_ORDER_KEY, serializedLatest);

    emitOrderChange();
  } catch {
    // Ignore storage quota/availability issues
  }
}

/**
 * Removes all saved placed order snapshots.
 */
export function clearPlacedOrders(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PLACED_ORDERS_LIST_KEY);
    sessionStorage.removeItem(PLACED_ORDERS_LIST_KEY);
    localStorage.removeItem(PLACED_ORDER_KEY);
    sessionStorage.removeItem(PLACED_ORDER_KEY);
    emitOrderChange();
  } catch {
    // Ignore storage errors
  }
}

export const clearPlacedOrder = clearPlacedOrders;

/**
 * Helper to construct a PlacedOrder snapshot from cart items and phone details.
 * Strictly preserves customer privacy: only stores T + last 4 digits.
 */
export function createPlacedOrderSnapshot(
  cartItems: Array<{
    id: number | string;
    productName: string;
    selectedOption?: string | null;
    quantity?: number;
    unitPrice: string | number;
  }>,
  totalAmount: number,
  phone: string,
  paymentMethod: string = "Pay at Counter",
  timestamp: number = Date.now()
): PlacedOrder {
  const digits = (phone || "").replace(/\D/g, "");
  const lastFour = digits.length >= 4 ? digits.slice(-4) : "----";
  const ticketNumber = `T ${lastFour}`;

  const items: PlacedOrderItem[] = cartItems.map((item) => {
    const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
    const price = typeof item.unitPrice === "number" ? item.unitPrice : parseFloat(item.unitPrice || "0") || 0;
    return {
      id: item.id,
      productName: item.productName || "Product",
      selectedOption: item.selectedOption || null,
      quantity: qty,
      unitPrice: price,
      itemTotal: price * qty,
    };
  });

  return {
    id: `ORD-${timestamp}-${Math.floor(1000 + Math.random() * 9000)}`,
    ticketNumber,
    lastFour,
    items,
    subtotal: totalAmount,
    total: totalAmount,
    paymentMethod,
    createdAt: timestamp,
    expiresAt: timestamp + PLACED_ORDER_WINDOW_MS,
  };
}

/**
 * React hook to observe and react to placed orders and their per-order 30-minute visibility state.
 */
export function usePlacedOrder() {
  const [orders, setOrders] = useState<PlacedOrder[]>(() => getPlacedOrders());
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const refresh = () => {
      setOrders(getPlacedOrders());
      setNow(Date.now());
    };

    window.addEventListener(PLACED_ORDER_EVENT, refresh);
    window.addEventListener("storage", refresh);

    // Periodically update the timer ticker so each order's 30-minute window
    // updates live and expired orders are removed from the active list
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.removeEventListener(PLACED_ORDER_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      clearInterval(interval);
    };
  }, []);

  const activeOrders = orders.filter((order) => isPlacedOrderActive(order, now));
  const activeCount = activeOrders.length;
  const isOrderActive = activeCount > 0;
  const latestActiveOrder = activeOrders.length > 0 ? activeOrders[activeOrders.length - 1] : null;

  return {
    orders,
    activeOrders,
    activeCount,
    order: latestActiveOrder,
    isOrderActive,
    saveOrder: useCallback(savePlacedOrder, []),
    clearOrder: useCallback(clearPlacedOrders, []),
    clearOrders: useCallback(clearPlacedOrders, []),
  };
}
