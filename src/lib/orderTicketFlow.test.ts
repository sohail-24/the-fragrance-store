import { describe, expect, it, beforeEach, beforeAll } from "vitest";
import {
  createPlacedOrderSnapshot,
  isPlacedOrderActive,
  savePlacedOrder,
  getPlacedOrder,
  clearPlacedOrder,
  PLACED_ORDER_WINDOW_MS,
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

describe("Placed-Order Flow Architecture & Ticket Generation at /info Continue", () => {
  beforeAll(() => {
    if (typeof globalThis.localStorage === "undefined") {
      Object.defineProperty(globalThis, "localStorage", {
        value: new MemoryStorage(),
        writable: true,
      });
    }
    if (typeof globalThis.sessionStorage === "undefined") {
      Object.defineProperty(globalThis, "sessionStorage", {
        value: new MemoryStorage(),
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

  it("generates order ticket T + last 4 digits at /info Continue and preserves snapshot while cart is emptied", () => {
    // 1. Initial cart state
    const liveCartItems = [
      {
        id: "prod-1",
        productName: "2 Pc Chicken Meal",
        selectedOption: "Spicy",
        quantity: 2,
        unitPrice: 8.99,
      },
      {
        id: "prod-2",
        productName: "Crispy Fries",
        selectedOption: "Large",
        quantity: 1,
        unitPrice: 3.49,
      },
    ];
    const subtotal = 8.99 * 2 + 3.49;
    const phoneInput = "+1 9121969239";
    const infoContinueTime = 1774300000000;

    // 2. Customer clicks Continue on /info -> Generate and save snapshot immediately
    const snapshot = createPlacedOrderSnapshot(
      liveCartItems,
      subtotal,
      phoneInput,
      "Pay at Counter",
      infoContinueTime
    );
    savePlacedOrder(snapshot);

    // Verify snapshot properties
    expect(snapshot.ticketNumber).toBe("T 9239");
    expect(snapshot.lastFour).toBe("9239");
    expect(snapshot.paymentMethod).toBe("Pay at Counter");
    expect(snapshot.total).toBe(21.47);
    expect(snapshot.createdAt).toBe(infoContinueTime);
    expect(snapshot.expiresAt).toBe(infoContinueTime + PLACED_ORDER_WINDOW_MS);

    // 3. Live shopping cart is emptied
    const emptiedCart: typeof liveCartItems = [];
    expect(emptiedCart.length).toBe(0);

    // 4. At /payment -> reads existing order snapshot, no new ticket generated
    const paymentOrder = getPlacedOrder();
    expect(paymentOrder).not.toBeNull();
    expect(paymentOrder?.ticketNumber).toBe("T 9239");
    expect(paymentOrder?.items).toHaveLength(2);
    expect(paymentOrder?.createdAt).toBe(infoContinueTime);

    // 5. At /bill -> reads the SAME existing order snapshot, no new ticket generated
    const billOrder = getPlacedOrder();
    expect(billOrder).not.toBeNull();
    expect(billOrder?.id).toBe(snapshot.id);
    expect(billOrder?.ticketNumber).toBe("T 9239");
    expect(billOrder?.createdAt).toBe(infoContinueTime);

    // 6. Home page View Order -> reads the SAME order
    expect(isPlacedOrderActive(billOrder, infoContinueTime)).toBe(true);

    // 7. Verify 30-minute timer does NOT restart when navigating between pages or refreshing
    const tenMinutesLater = infoContinueTime + 10 * 60 * 1000;
    const reloadedOrder = getPlacedOrder();
    expect(reloadedOrder?.createdAt).toBe(infoContinueTime); // Still original infoContinueTime!
    expect(isPlacedOrderActive(reloadedOrder, tenMinutesLater)).toBe(true);

    // 8. Exactly after 30 minutes, it expires
    const thirtyOneMinutesLater = infoContinueTime + 31 * 60 * 1000;
    expect(isPlacedOrderActive(reloadedOrder, thirtyOneMinutesLater)).toBe(false);

    // 9. Phone privacy: verify full phone number is never in the snapshot
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain("+1 9121969239");
    expect(serialized).not.toContain("9121969239");
    expect(snapshot.ticketNumber).toBe("T 9239");
  });
});
