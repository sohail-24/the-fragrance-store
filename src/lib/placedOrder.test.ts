import { describe, expect, it, beforeEach, beforeAll } from "vitest";
import {
  createPlacedOrderSnapshot,
  isPlacedOrderActive,
  savePlacedOrder,
  getPlacedOrder,
  getPlacedOrders,
  getActivePlacedOrders,
  getPlacedOrderById,
  clearPlacedOrder,
  clearPlacedOrders,
  PLACED_ORDER_WINDOW_MS,
  PlacedOrder,
} from "./placedOrder";

class MemoryStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

describe("Placed Order Snapshot & 30-Minute Window", () => {
  beforeAll(() => {
    if (typeof globalThis.localStorage === "undefined") {
      const mockStorage = new MemoryStorage();
      Object.defineProperty(globalThis, "localStorage", {
        value: mockStorage,
        writable: true,
      });
    }
    if (typeof globalThis.sessionStorage === "undefined") {
      const mockStorage = new MemoryStorage();
      Object.defineProperty(globalThis, "sessionStorage", {
        value: mockStorage,
        writable: true,
      });
    }
    if (typeof globalThis.window === "undefined") {
      Object.defineProperty(globalThis, "window", {
        value: {
          dispatchEvent: () => true,
        },
        writable: true,
      });
    }
  });

  beforeEach(() => {
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();
  });

  it("creates a placed order snapshot with all required properties", () => {
    const items = [
      {
        id: 101,
        productName: "Mac N'Cheese",
        selectedOption: "Regular",
        quantity: 2,
        unitPrice: "3.25",
      },
      {
        id: 102,
        productName: "Classic Burger",
        quantity: 1,
        unitPrice: 6.5,
      },
    ];

    const now = 1774280000000;
    const order = createPlacedOrderSnapshot(items, 13.0, "+1 9121969239", "Pay at Counter", now);

    expect(order.ticketNumber).toBe("T 9239");
    expect(order.lastFour).toBe("9239");
    expect(order.paymentMethod).toBe("Pay at Counter");
    expect(order.total).toBe(13.0);
    expect(order.createdAt).toBe(now);
    expect(order.expiresAt).toBe(now + PLACED_ORDER_WINDOW_MS);

    expect(order.items).toHaveLength(2);
    expect(order.items[0]).toEqual({
      id: 101,
      productName: "Mac N'Cheese",
      selectedOption: "Regular",
      quantity: 2,
      unitPrice: 3.25,
      itemTotal: 6.5,
    });
    expect(order.items[1]).toEqual({
      id: 102,
      productName: "Classic Burger",
      selectedOption: null,
      quantity: 1,
      unitPrice: 6.5,
      itemTotal: 6.5,
    });
  });

  it("strictly protects phone privacy and never stores or exposes the full phone number", () => {
    const order = createPlacedOrderSnapshot(
      [{ id: 1, productName: "Fries", unitPrice: 2.5, quantity: 1 }],
      2.5,
      "+1 9121969239",
      "Pay at Counter"
    );

    const serialized = JSON.stringify(order);
    expect(order.ticketNumber).toBe("T 9239");
    expect(order.lastFour).toBe("9239");
    expect(serialized).not.toContain("+1");
    expect(serialized).not.toContain("912");
    expect(serialized).not.toContain("196");
    expect(serialized).not.toContain("9121969239");
  });

  it("calculates the 30-minute visibility window accurately based on actual createdAt timestamp", () => {
    const createdAt = 1000000;
    const order: PlacedOrder = {
      id: "ORD-TEST",
      ticketNumber: "T 9239",
      lastFour: "9239",
      items: [],
      subtotal: 3.25,
      total: 3.25,
      paymentMethod: "Pay at Counter",
      createdAt,
      expiresAt: createdAt + PLACED_ORDER_WINDOW_MS,
    };

    // Exactly at creation time (0 min)
    expect(isPlacedOrderActive(order, createdAt)).toBe(true);

    // 15 minutes later
    expect(isPlacedOrderActive(order, createdAt + 15 * 60 * 1000)).toBe(true);

    // 29 minutes and 59 seconds later (just before 30 mins)
    expect(isPlacedOrderActive(order, createdAt + 29 * 60 * 1000 + 59 * 1000)).toBe(true);

    // Exactly 30 minutes later -> expires
    expect(isPlacedOrderActive(order, createdAt + 30 * 60 * 1000)).toBe(false);

    // 35 minutes later -> expired
    expect(isPlacedOrderActive(order, createdAt + 35 * 60 * 1000)).toBe(false);

    // Future timestamp anomaly safeguard
    expect(isPlacedOrderActive(order, createdAt - 1000)).toBe(false);

    // Null/undefined order
    expect(isPlacedOrderActive(null)).toBe(false);
  });

  it("persists the order snapshot to storage across simulated reloads and does not delete it when cart is cleared", () => {
    const order = createPlacedOrderSnapshot(
      [{ id: 1, productName: "Mac N'Cheese", unitPrice: 3.25, quantity: 1 }],
      3.25,
      "9121969239",
      "Pay at Counter",
      Date.now()
    );

    savePlacedOrder(order);

    // Verify stored
    const retrieved = getPlacedOrder();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.ticketNumber).toBe("T 9239");
    expect(retrieved?.items[0].productName).toBe("Mac N'Cheese");

    // Simulate clearing cart in guestCart storage
    localStorage.removeItem("freshflow_guest_cart");

    // The placed order snapshot must remain intact!
    const retrievedAfterCartClear = getPlacedOrder();
    expect(retrievedAfterCartClear).not.toBeNull();
    expect(retrievedAfterCartClear?.ticketNumber).toBe("T 9239");

    // Clearing placed order explicitly
    clearPlacedOrder();
    expect(getPlacedOrder()).toBeNull();
  });

  it("supports multiple concurrent orders and appends new orders without overwriting older orders", () => {
    const baseTime = 1774300000000;
    const order1 = createPlacedOrderSnapshot(
      [{ id: 1, productName: "Burger", unitPrice: 6.5, quantity: 1 }],
      6.5,
      "2125551234",
      "Pay at Counter",
      baseTime
    );
    const order2 = createPlacedOrderSnapshot(
      [{ id: 2, productName: "Fries", unitPrice: 3.25, quantity: 1 }],
      3.25,
      "2125555678",
      "Pay at Counter",
      baseTime + 5 * 60 * 1000 // 5 mins later
    );

    savePlacedOrder(order1);
    expect(getPlacedOrders()).toHaveLength(1);
    expect(getPlacedOrders()[0].ticketNumber).toBe("T 1234");

    // Place second order
    savePlacedOrder(order2);
    const all = getPlacedOrders();
    expect(all).toHaveLength(2);
    expect(all[0].ticketNumber).toBe("T 1234");
    expect(all[1].ticketNumber).toBe("T 5678");

    // Distinct IDs
    expect(all[0].id).not.toBe(all[1].id);
    expect(all[0].items[0].productName).toBe("Burger");
    expect(all[1].items[0].productName).toBe("Fries");

    // getPlacedOrderById retrieves specific order
    expect(getPlacedOrderById(order1.id)?.ticketNumber).toBe("T 1234");
    expect(getPlacedOrderById(order2.id)?.ticketNumber).toBe("T 5678");
  });

  it("enforces independent 30-minute expiration per order without global timer reset", () => {
    // 9:00 PM
    const t900 = 1774300000000;
    const order1 = createPlacedOrderSnapshot(
      [{ id: 1, productName: "Burger", unitPrice: 6.5, quantity: 1 }],
      6.5,
      "2125551234",
      "Pay at Counter",
      t900
    );

    // 9:05 PM
    const t905 = t900 + 5 * 60 * 1000;
    const order2 = createPlacedOrderSnapshot(
      [{ id: 2, productName: "Fries", unitPrice: 3.25, quantity: 1 }],
      3.25,
      "2125555678",
      "Pay at Counter",
      t905
    );

    // 9:20 PM
    const t920 = t900 + 20 * 60 * 1000;
    const order3 = createPlacedOrderSnapshot(
      [{ id: 3, productName: "Shake", unitPrice: 4.0, quantity: 1 }],
      4.0,
      "2125559012",
      "Pay at Counter",
      t920
    );

    savePlacedOrder(order1);
    savePlacedOrder(order2);
    savePlacedOrder(order3);

    // At 9:25 PM: all 3 orders are active
    const t925 = t900 + 25 * 60 * 1000;
    let active = getActivePlacedOrders(t925);
    expect(active).toHaveLength(3);
    expect(active.map((o) => o.ticketNumber)).toEqual(["T 1234", "T 5678", "T 9012"]);

    // At 9:31 PM: Order 1 (placed 9:00) has expired (>30 mins), Orders 2 & 3 remain active
    const t931 = t900 + 31 * 60 * 1000;
    active = getActivePlacedOrders(t931);
    expect(active).toHaveLength(2);
    expect(active.map((o) => o.ticketNumber)).toEqual(["T 5678", "T 9012"]);

    // At 9:36 PM: Order 2 (placed 9:05) has expired (>31 mins), Order 3 remains active
    const t936 = t900 + 36 * 60 * 1000;
    active = getActivePlacedOrders(t936);
    expect(active).toHaveLength(1);
    expect(active[0].ticketNumber).toBe("T 9012");

    // At 9:51 PM: Order 3 (placed 9:20) has expired (>31 mins), NO active orders remain
    const t951 = t900 + 51 * 60 * 1000;
    active = getActivePlacedOrders(t951);
    expect(active).toHaveLength(0);

    // Total stored orders are preserved even after expiration until explicit clear
    expect(getPlacedOrders()).toHaveLength(3);

    // Explicit clear removes all
    clearPlacedOrders();
    expect(getPlacedOrders()).toHaveLength(0);
    expect(getActivePlacedOrders()).toHaveLength(0);
  });
});
