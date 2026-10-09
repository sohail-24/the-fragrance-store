import { describe, expect, it } from "vitest";
import { orderRouter } from "../../api/orderRouter";
import { BUSINESS_OWNER_EMAIL } from "@contracts/roles";
import { findUserByEmail } from "../../api/queries/users";
import { findBuyerProducts } from "../../api/queries/products";

describe("Info Order Creation -> Admin Orders Flow", () => {
  it("creates order from /info and makes it immediately appear in Admin /orders with ticket, items, total, payment method, and time", async () => {
    const ownerUser = await findUserByEmail(BUSINESS_OWNER_EMAIL);
    expect(ownerUser).toBeDefined();

    const activeProducts = await findBuyerProducts();
    expect(activeProducts.length).toBeGreaterThanOrEqual(2);

    const prod1 = activeProducts[0];
    const prod2 = activeProducts[1];

    const publicCaller = orderRouter.createCaller({
      req: new Request("http://localhost:3000/api/trpc"),
      resHeaders: new Headers(),
    } as any);

    const adminCaller = orderRouter.createCaller({
      user: ownerUser!,
      req: new Request("http://localhost:3000/api/trpc"),
      resHeaders: new Headers(),
    } as any);

    // 1. Customer on /info submits with phone and 2 items
    const customerPhone = "+1 912-196-9239";
    const order1 = await publicCaller.create({
      shippingMobileNumber: customerPhone,
      shippingState: "New York",
      paymentMethod: "cod",
      items: [
        { productId: prod1.id, quantity: 2 },
        { productId: prod2.id, quantity: 1 },
      ],
    });

    expect(order1).toBeDefined();
    expect(order1.orderId).toBeGreaterThan(0);
    expect(order1.orderNumber).toMatch(/^T-9239-/);

    // 2. A second customer submits a distinct order
    const secondPhone = "+1 917-555-5743";
    const order2 = await publicCaller.create({
      shippingMobileNumber: secondPhone,
      shippingState: "New York",
      paymentMethod: "cod",
      items: [
        { productId: prod1.id, quantity: 1 },
      ],
    });

    expect(order2).toBeDefined();
    expect(order2.orderId).toBeGreaterThan(0);
    expect(order2.orderNumber).toMatch(/^T-5743-/);
    expect(order2.orderId).not.toBe(order1.orderId);

    // 3. Admin queries /orders (supplier list)
    const adminOrders = await adminCaller.list({
      type: "supplier",
      size: 20,
    });

    expect(adminOrders.items.length).toBeGreaterThanOrEqual(2);

    // Verify order 1 is listed for admin
    const foundOrder1 = adminOrders.items.find((o) => o.id === order1.orderId);
    expect(foundOrder1).toBeDefined();
    expect(foundOrder1?.ticketNumber).toBe("T 9239");
    expect(foundOrder1?.paymentMethod).toBe("cod");
    expect(Number(foundOrder1?.totalAmount)).toBeGreaterThan(0);
    expect(foundOrder1?.orderedAt).toBeDefined();

    // Verify items, quantities, and prices are visible
    expect(foundOrder1?.items).toBeDefined();
    expect(foundOrder1?.items?.length).toBe(2);
    const item1 = foundOrder1?.items?.find((i) => i.productId === prod1.id);
    expect(item1).toBeDefined();
    expect(item1?.quantity).toBe(2);
    expect(Number(item1?.unitPrice)).toBeGreaterThan(0);

    const item2 = foundOrder1?.items?.find((i) => i.productId === prod2.id);
    expect(item2).toBeDefined();
    expect(item2?.quantity).toBe(1);
    expect(Number(item2?.unitPrice)).toBeGreaterThan(0);

    // Verify order 2 is also listed as a separate order
    const foundOrder2 = adminOrders.items.find((o) => o.id === order2.orderId);
    expect(foundOrder2).toBeDefined();
    expect(foundOrder2?.ticketNumber).toBe("T 5743");
    expect(foundOrder2?.id).not.toBe(foundOrder1?.id);

    // Clean up test orders
    await adminCaller.delete({ orderId: order1.orderId });
    await adminCaller.delete({ orderId: order2.orderId });
  }, 30000);
});
