import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { CheckCircle2, Clock, Lock, ShoppingBag, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGuestCart } from "@/lib/guestCart";
import { trpc } from "@/providers/trpc";
import { formatCurrency } from "@/lib/i18n";
import { useCheckoutPhone } from "@/lib/checkoutState";
import { getPlacedOrder, usePlacedOrder } from "@/lib/placedOrder";
import { Card, CardContent } from "@/components/ui/card";

export default function Payment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const guestCart = useGuestCart();
  const { phone } = useCheckoutPhone();
  const { order: placedOrder } = usePlacedOrder();
  const currentOrder = placedOrder || getPlacedOrder();

  // Selected payment method state (default to counter)
  const [selectedMethod, setSelectedMethod] = useState<"counter">("counter");

  // Cart queries to track order value & item count
  const cartQuery = trpc.cart.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const cartItems = isAuthenticated ? (cartQuery.data?.items ?? []) : guestCart.items;
  const orderItems = currentOrder?.items ?? cartItems;
  const subtotal = currentOrder?.total ?? (isAuthenticated ? (cartQuery.data?.total ?? 0) : guestCart.total);
  const itemCount = orderItems.reduce((acc, it) => acc + (it.quantity || 1), 0);

  // Derive ONLY the last four digits of the phone number
  const lastFour = useMemo(() => {
    const raw = currentOrder?.lastFour || phone;
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 4) {
      return digits.slice(-4);
    }
    return "";
  }, [currentOrder?.lastFour, phone]);

  // Safeguard: Redirect back to /info if no phone is saved or digits are missing and no placed order
  useEffect(() => {
    const digits = (currentOrder?.lastFour || phone).replace(/\D/g, "");
    if (!currentOrder && (!phone || digits.length < 4)) {
      navigate("/info", { replace: true });
    }
  }, [currentOrder, phone, navigate]);

  // Safeguard: Redirect to /cart if cart is empty and no placed order exists
  useEffect(() => {
    if (!currentOrder && !cartQuery.isLoading && cartItems.length === 0) {
      navigate("/cart", { replace: true });
    }
  }, [currentOrder, cartItems.length, cartQuery.isLoading, navigate]);

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8 sm:py-12 bg-muted/20">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link
            to="/"
            className="group flex flex-col items-center focus:outline-none transition-transform active:scale-95"
            title="Tex’s Chicken & Burgers"
          >
            <div className="h-16 w-16 rounded-2xl bg-white shadow-md border border-border/50 p-2 flex items-center justify-center transition-all group-hover:shadow-lg">
              <img
                src="/branding/logo.png"
                alt="Tex’s Chicken & Burgers"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="mt-3 text-base sm:text-lg font-black tracking-tight text-foreground uppercase">
              Tex’s Chicken & Burgers
            </span>
            <span className="text-xs font-semibold text-emerald-600 tracking-wide">
              Worth Every Bite
            </span>
          </Link>
        </div>

        {/* Order Context Pill */}
        {itemCount > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-card border border-border/60 shadow-xs text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                Order in progress:{" "}
                <strong className="text-foreground font-medium">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </strong>
              </span>
            </div>
            <span className="font-semibold text-foreground">
              {formatCurrency(subtotal)}
            </span>
          </div>
        )}

        {/* Main Payment Selection Card */}
        <Card className="border-border/70 shadow-sm rounded-2xl overflow-hidden bg-card">
          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Customer Identifier Section */}
            <div className="text-center space-y-2">
              <div className="inline-flex flex-col items-center justify-center px-6 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-600/25">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Order Ticket
                </span>
                <span className="text-2xl sm:text-3xl font-black tracking-widest text-emerald-700 dark:text-emerald-400 font-mono">
                  {currentOrder?.ticketNumber || (lastFour ? `T ${lastFour}` : "T ----")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Select your payment method below
              </p>
            </div>

            {/* Exactly Two Side-by-Side Payment Option Boxes */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Box 1: PAY AT COUNTER (Active & Selectable) */}
              <button
                type="button"
                id="payment-option-counter"
                onClick={() => setSelectedMethod("counter")}
                className={`relative flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl border-2 text-center transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                  selectedMethod === "counter"
                    ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/25 shadow-sm ring-1 ring-emerald-600/30 text-foreground"
                    : "border-border/80 bg-card hover:border-emerald-600/50 hover:bg-muted/40 text-foreground"
                }`}
                aria-pressed={selectedMethod === "counter"}
              >
                <div className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-emerald-600/15 text-emerald-600 mb-3">
                  <Store className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-tight text-foreground leading-snug">
                  PAY AT COUNTER
                </span>
                <span className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Available
                </span>
                {selectedMethod === "counter" && (
                  <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 fill-emerald-600/20" />
                  </div>
                )}
              </button>

              {/* Box 2: MORE OPTIONS COMING SOON (Disabled / Non-active) */}
              <div
                id="payment-option-more"
                className="relative flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl border-2 border-dashed border-border/70 bg-muted/30 text-center opacity-60 cursor-not-allowed select-none"
                aria-disabled="true"
              >
                <div className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted text-muted-foreground mb-3">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-tight text-muted-foreground leading-snug">
                  MORE OPTIONS
                </span>
                <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  COMING SOON
                </span>
              </div>
            </div>

            {/* Privacy & Security Note */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/75 pt-2 border-t border-border/50">
              <Lock className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
              <span>Your session and order state are protected & verified</span>
            </div>

            {/* Back to Home Page Navigation */}
            <div className="text-center pt-1 border-t border-border/40">
              <Link
                to="/"
                id="back-to-home-link"
                className="text-xs font-medium text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 inline-flex items-center gap-1.5 transition-colors py-1.5 px-3 rounded-lg hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30"
              >
                <span aria-hidden="true">←</span>
                <span>Back to Home Page</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
