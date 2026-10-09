import { describe, expect, it } from "vitest";
import { orderRouter } from "../../api/orderRouter";
import { BUSINESS_OWNER_EMAIL } from "@contracts/roles";
import { findUserByEmail } from "../../api/queries/users";
import { findOrderWithDetails } from "../../api/queries/orders";
import { findBuyerProducts } from "../../api/queries/products";

describe("Admin Delete Order Flow", () => {
  it(
    "permanently deletes an order and its items without deleting other orders",
    async () => {
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

    // 1. Create order 1
    const order1 = await publicCaller.create({
      shippingMobileNumber: "+1 988-111-2222",
      shippingState: "California",
      paymentMethod: "cod",
      items: [
        { productId: prod1.id, quantity: 2 },
        { productId: prod2.id, quantity: 1 },
      ],
    });
    expect(order1.orderId).toBeGreaterThan(0);

    // 2. Create order 2
    const order2 = await publicCaller.create({
      shippingMobileNumber: "+1 988-333-4444",
      shippingState: "California",
      paymentMethod: "cod",
      items: [
        { productId: prod1.id, quantity: 1 },
      ],
    });
    expect(order2.orderId).toBeGreaterThan(0);
    expect(order2.orderId).not.toEqual(order1.orderId);

    // Verify both orders exist in DB with items
    const dbOrder1Before = await findOrderWithDetails(order1.orderId);
    expect(dbOrder1Before).toBeDefined();
    expect(dbOrder1Before?.items.length).toBe(2);

    const dbOrder2Before = await findOrderWithDetails(order2.orderId);
    expect(dbOrder2Before).toBeDefined();
    expect(dbOrder2Before?.items.length).toBe(1);

    // 3. Admin deletes order 1
    const deleteResult = await adminCaller.delete({ orderId: order1.orderId });
    expect(deleteResult).toEqual({ success: true });

    // 4. Verify order 1 is permanently deleted from the database
    const dbOrder1After = await findOrderWithDetails(order1.orderId);
    expect(dbOrder1After).toBeNull();

    // 5. Verify order 2 is completely intact (other orders are NOT deleted)
    const dbOrder2After = await findOrderWithDetails(order2.orderId);
    expect(dbOrder2After).toBeDefined();
    expect(dbOrder2After?.id).toBe(order2.orderId);
    expect(dbOrder2After?.items.length).toBe(1);

    // 6. Admin refreshes orders list and order 1 is gone, order 2 is present
    const updatedList = await adminCaller.list({
      type: "supplier",
      size: 50,
    });
    const foundOrder1InList = updatedList.items.some((o) => o.id === order1.orderId);
    const foundOrder2InList = updatedList.items.some((o) => o.id === order2.orderId);
    expect(foundOrder1InList).toBe(false);
    expect(foundOrder2InList).toBe(true);

    // Clean up order 2
    await adminCaller.delete({ orderId: order2.orderId });
  }, 35000);
});
