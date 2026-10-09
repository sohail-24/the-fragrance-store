import { useState, useMemo, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, ShoppingBag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGuestCart } from "@/lib/guestCart";
import { trpc } from "@/providers/trpc";
import { formatCurrency } from "@/lib/i18n";
import { isValidUSPhoneNumber, normalizeUSPhoneNumber } from "@/lib/utils";
import { getCheckoutPhone, setCheckoutPhone } from "@/lib/checkoutState";
import {
  createPlacedOrderSnapshot,
  getPlacedOrder,
  savePlacedOrder,
} from "@/lib/placedOrder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function Info() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const guestCart = useGuestCart();
  const isAuthenticated = !!user;
  const utils = trpc.useUtils();

  // Retrieve current cart contents to preserve order context
  const cartQuery = trpc.cart.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const clearCartMutation = trpc.cart.clear.useMutation({
    onSuccess: () => utils.cart.list.invalidate(),
  });
  const createOrderMutation = trpc.order.create.useMutation();

  const savedOrder = getPlacedOrder();
  const cartItems = isAuthenticated ? (cartQuery.data?.items ?? []) : guestCart.items;
  const cartSubtotal = isAuthenticated ? (cartQuery.data?.total ?? 0) : guestCart.total;

  const effectiveItems = cartItems.length > 0 ? cartItems : (savedOrder?.items ?? []);
  const effectiveSubtotal = cartItems.length > 0 ? cartSubtotal : (savedOrder?.total ?? 0);
  const itemCount = effectiveItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Initialize with any previously saved phone number in this checkout session
  const [phone, setPhone] = useState(() => {
    const saved = getCheckoutPhone();
    if (saved) {
      const digits = saved.replace(/\D/g, "");
      if (digits.startsWith("1") && digits.length === 11) {
        return digits.slice(1);
      }
      return digits.slice(-10);
    }
    return "";
  });

  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Server-side validation procedure for zero-trust phone validation
  const validatePhoneMutation = trpc.order.validatePhone.useMutation();

  // Validate the 10-digit US phone format
  const isValid = useMemo(() => {
    return isValidUSPhoneNumber(phone);
  }, [phone]);

  const validationMessage = useMemo(() => {
    if (!touched || phone.length === 0) return null;
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 0) return "Please enter your phone number.";
    if (/^[01]/.test(clean)) return "US phone numbers cannot start with 0 or 1.";
    if (clean.length < 10) return `Enter 10 digits (${10 - clean.length} more needed).`;
    if (clean.length > 10) return "Phone number cannot exceed 10 digits.";
    if (!/^[2-9]\d{9}$/.test(clean)) return "Please enter a valid 10-digit US phone number.";
    return null;
  }, [phone, touched]);

  // Handle phone input formatting: strictly numeric, max 10 digits
  const handlePhoneChange = (value: string) => {
    setServerError(null);
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    setPhone(digitsOnly);
    if (!touched && digitsOnly.length > 0) {
      setTouched(true);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setServerError(null);

    if (!isValid) return;

    try {
      // Server-side validation verification
      await validatePhoneMutation.mutateAsync({ phone });

      // Persist the phone into checkout state
      const normalized = normalizeUSPhoneNumber(phone);
      setCheckoutPhone(normalized);

      // Prepare items payload for database order creation
      const orderItemsPayload = effectiveItems
        .map((item) => {
          const rawId = (item as any).productId ?? item.id;
          const pid = typeof rawId === "number" ? rawId : parseInt(String(rawId).replace(/\D/g, ""), 10);
          return {
            productId: Number.isNaN(pid) || pid <= 0 ? 1 : pid,
            quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
            selectedOption: item.selectedOption || undefined,
            notes: (item as any).notes || undefined,
          };
        })
        .filter((item) => item.productId > 0);

      // Save/create the order using the existing database order system
      let createdOrderId: number | undefined;
      let createdOrderNumber: string | undefined;

      try {
        const createdOrder = await createOrderMutation.mutateAsync({
          shippingMobileNumber: normalized,
          shippingState: "New York",
          paymentMethod: "cod",
          items: orderItemsPayload.length > 0 ? orderItemsPayload : undefined,
        });
        if (createdOrder) {
          createdOrderId = createdOrder.orderId;
          createdOrderNumber = createdOrder.orderNumber;
          utils.order.list.invalidate();
        }
      } catch (orderErr) {
        console.error("Order creation in database error:", orderErr);
      }

      // Generate order ticket & placed-order snapshot at /info Continue
      const snapshot = createPlacedOrderSnapshot(
        effectiveItems,
        effectiveSubtotal,
        normalized,
        "Pay at Counter"
      );
      if (createdOrderId) {
        snapshot.id = String(createdOrderId);
      }
      if (createdOrderNumber) {
        snapshot.orderNumber = createdOrderNumber;
      }
      savePlacedOrder(snapshot);

      // Clear the live shopping cart so it becomes empty immediately
      if (guestCart.items.length > 0) {
        guestCart.clear();
      }
      if (isAuthenticated && (cartQuery.data?.items?.length ?? 0) > 0) {
        try {
          await clearCartMutation.mutateAsync();
        } catch {
          // ignore error if network blips; local cache is updated
        }
      }

      // Continue seamlessly to existing next checkout step
      navigate("/payment");
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Invalid phone number. Please enter a valid 10-digit US phone number."
      );
    }
  };

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

        {/* Order Context Pill - Shows customer order is preserved */}
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
              {formatCurrency(effectiveSubtotal)}
            </span>
          </div>
        )}

        {/* Main Customer Info Card */}
        <Card className="border-border/70 shadow-sm rounded-2xl overflow-hidden bg-card">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Almost there!
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enter your phone number to continue with your order.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="space-y-2 text-left">
                <Label
                  htmlFor="customer-phone"
                  className="text-xs font-semibold text-foreground uppercase tracking-wider block"
                >
                  Phone number
                </Label>

                {/* Telephone input container with +1 country badge */}
                <div
                  className={`flex items-center rounded-xl border transition-all duration-200 bg-background overflow-hidden ${
                    touched && !isValid && phone.length > 0
                      ? "border-destructive ring-1 ring-destructive/40"
                      : isValid
                        ? "border-emerald-600/70 ring-1 ring-emerald-600/20"
                        : "border-input focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
                  }`}
                >
                  <div className="flex items-center justify-center px-3.5 py-3 border-r border-border/70 bg-muted/40 text-sm font-bold text-foreground select-none shrink-0 tracking-wide">
                    +1
                  </div>
                  <input
                    id="customer-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    pattern="[0-9]*"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="Enter phone number..."
                    className="flex-1 bg-transparent px-3.5 py-3 text-base sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none w-full"
                    autoFocus
                  />
                  {isValid && (
                    <div className="pr-3 text-emerald-600 animate-in fade-in zoom-in duration-200">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Validation helper or error message */}
                {validationMessage && (
                  <p className="text-xs text-destructive font-medium pl-1 animate-in fade-in duration-150">
                    {validationMessage}
                  </p>
                )}

                {serverError && (
                  <p className="text-xs text-destructive font-medium pl-1 animate-in fade-in duration-150">
                    {serverError}
                  </p>
                )}
              </div>

              {/* Primary Continue Button */}
              <div className="space-y-3 pt-1">
                <Button
                  type="submit"
                  disabled={!isValid || validatePhoneMutation.isPending}
                  className="h-12 w-full text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {validatePhoneMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Checking...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      Continue
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </span>
                  )}
                </Button>

                {/* Back to Cart Action */}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/cart")}
                  className="w-full text-xs text-muted-foreground hover:text-foreground h-9 font-medium"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                  Back to Cart
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security / Privacy reassurance note */}
        <div className="text-center flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70">
          <Lock className="h-3 w-3" />
          <span>Your information is kept private and secure</span>
        </div>
      </div>
    </div>
  );
}
