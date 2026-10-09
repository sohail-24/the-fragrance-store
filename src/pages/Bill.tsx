import { useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, Check, ReceiptText, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGuestCart } from "@/lib/guestCart";
import { trpc } from "@/providers/trpc";
import { formatCurrency } from "@/lib/i18n";
import { useCheckoutPhone } from "@/lib/checkoutState";
import {
  getPlacedOrder,
  getPlacedOrderById,
  usePlacedOrder,
} from "@/lib/placedOrder";

export default function Bill() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const guestCart = useGuestCart();
  const { phone } = useCheckoutPhone();
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get("orderId");
  const { orders, activeOrders, order: latestActiveOrder } = usePlacedOrder();
  const utils = trpc.useUtils();
  const hasClearedCartRef = useRef(false);

  // Cart queries and mutations to ensure cart is cleared
  const cartQuery = trpc.cart.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const clearMutation = trpc.cart.clear.useMutation({
    onSuccess: () => utils.cart.list.invalidate(),
  });

  // When customer arrives at /bill, ensure live cart is cleared without regenerating order
  useEffect(() => {
    if (hasClearedCartRef.current) return;

    if (guestCart.items.length > 0) {
      guestCart.clear();
      hasClearedCartRef.current = true;
    }
    if (isAuthenticated && (cartQuery.data?.items?.length ?? 0) > 0) {
      clearMutation.mutate();
      hasClearedCartRef.current = true;
    }
  }, [guestCart, isAuthenticated, cartQuery.data?.items?.length, clearMutation]);

  // Support explicit order selection via orderId query param, or fall back to latest active order
  const currentOrder = useMemo(() => {
    if (orderIdParam) {
      const found = getPlacedOrderById(orderIdParam);
      if (found) return found;
    }
    if (activeOrders.length > 0) {
      return activeOrders[activeOrders.length - 1];
    }
    return latestActiveOrder || getPlacedOrder();
  }, [orderIdParam, activeOrders, latestActiveOrder]);

  const orderItems = currentOrder?.items ?? [];
  const totalAmount = currentOrder?.total ?? 0;

  // Derive ONLY the last four digits of the phone number
  const lastFour = useMemo(() => {
    const raw = currentOrder?.lastFour || phone;
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 4) {
      return digits.slice(-4);
    }
    return "";
  }, [currentOrder?.lastFour, phone]);

  const ticketBadge = currentOrder?.ticketNumber || (lastFour ? `T ${lastFour}` : "T ----");
  const paymentMethodName = currentOrder?.paymentMethod || "Pay at Counter";

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8 sm:py-12 bg-muted/20">
      <div className="w-full max-w-md mx-auto space-y-5">
        {/* Brand Header (Informational only - no navigation buttons/links) */}
        <div className="flex flex-col items-center text-center space-y-1.5 select-none">
          <div className="h-14 w-14 rounded-2xl bg-white shadow-sm border border-border/60 p-2 flex items-center justify-center">
            <img
              src="/branding/logo.png"
              alt="Tex’s Chicken & Burgers"
              className="h-full w-full object-contain"
            />
          </div>
          <span className="mt-1 text-base sm:text-lg font-black tracking-tight text-foreground uppercase">
            TEX’S CHICKEN & BURGERS
          </span>
          <span className="text-xs font-semibold text-emerald-600 tracking-wide">
            Worth Every Bite
          </span>
        </div>

        {/* Polished Restaurant Order Ticket Card */}
        <div className="relative rounded-3xl bg-card border border-border/80 shadow-md overflow-hidden transition-all">
          {/* Top Ticket Header Banner */}
          <div className="bg-gradient-to-b from-muted/50 to-muted/20 px-6 pt-6 pb-5 text-center border-b border-border/60">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground/90 mb-2">
              <ReceiptText className="h-3.5 w-3.5 text-emerald-600" />
              <span>Order Ticket</span>
            </div>

            {/* High-visibility Ticket Identifier Badge */}
            <div className="inline-flex items-center justify-center px-6 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-600/25 shadow-xs">
              <span className="text-2xl sm:text-3xl font-black tracking-widest text-emerald-700 dark:text-emerald-400 font-mono">
                {ticketBadge}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Order Items Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
                <span>Your Order</span>
                <span>Amount</span>
              </div>

              {orderItems.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-4">
                  No items in bill
                </p>
              ) : (
                <div className="divide-y divide-border/40">
                  {orderItems.map((item) => {
                    const unitPrice = Number(item.unitPrice ?? 0);
                    const itemTotal = item.itemTotal ?? unitPrice * (item.quantity || 1);
                    return (
                      <div key={item.id} className="py-3 first:pt-1 last:pb-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-foreground leading-snug break-words">
                              {item.productName}
                            </p>
                            {item.selectedOption && (
                              <p className="text-xs text-muted-foreground/80 mt-0.5">
                                {item.selectedOption}
                              </p>
                            )}
                            <p className="text-xs font-semibold text-muted-foreground mt-1">
                              × {item.quantity}
                            </p>
                          </div>
                          <span className="font-bold text-sm text-foreground shrink-0 tabular-nums pt-0.5">
                            {formatCurrency(itemTotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Subtle Restaurant Ticket Dashed Divider */}
            <div className="border-t border-dashed border-border/80 my-1" />

            {/* Total Amount Section - Strongly Emphasized */}
            <div className="flex items-baseline justify-between px-1 py-1">
              <span className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-foreground">
                TOTAL
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums font-mono">
                {formatCurrency(totalAmount)}
              </span>
            </div>

            {/* Subtle Divider */}
            <div className="border-t border-border/60 my-1" />

            {/* Payment Method Section */}
            <div className="rounded-2xl bg-muted/40 border border-border/60 p-3.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Payment Method
                </span>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-foreground">
                  <Store className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{paymentMethodName}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-600/20 px-2.5 py-1 rounded-full shrink-0">
                <Check className="h-3 w-3 stroke-[3]" />
                <span>Selected</span>
              </div>
            </div>

            {/* Order Received Notice */}
            <div className="text-center pt-1 pb-1">
              <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-extrabold tracking-widest uppercase bg-muted/60 text-muted-foreground border border-border/60">
                ORDER RECEIVED
              </span>
            </div>

            {/* Back to Home Page Final Navigation Link */}
            <div className="text-center pt-3 pb-1 border-t border-border/40">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-emerald-600 transition-colors py-1.5 px-3 rounded-xl hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Home Page</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
