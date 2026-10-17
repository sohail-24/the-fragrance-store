import { useState, useMemo, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, ShoppingBag, Store } from "lucide-react";
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
import { CustomerBottomNav } from "@/components/CustomerBottomNav";

export default function Info() {
  const params = useParams<{ tenantSlug?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const guestCart = useGuestCart();
  const isAuthenticated = !!user;
  const utils = trpc.useUtils();

  const storefrontQuery = trpc.company.storefront.useQuery(
    { slug: params.tenantSlug },
    { enabled: !!params.tenantSlug, retry: false }
  );
  const tenant = storefrontQuery.data?.status === "active" ? storefrontQuery.data.tenant : null;
  const storefrontPath = params.tenantSlug ? `/store/${params.tenantSlug}` : "/store/the-fragrance-store";

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
      navigate(`${storefrontPath}/payment`);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Invalid phone number. Please enter a valid 10-digit US phone number."
      );
    }
  };

  if (params.tenantSlug && storefrontQuery.data?.status === "not_found") {
    return (
      <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8">
        <div className="max-w-md w-full bg-card border border-border p-8 rounded-xl text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif font-bold text-foreground">Boutique Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The checkout session cannot proceed because the requested boutique does not exist.
          </p>
          <Link to="/store/the-fragrance-store">
            <Button variant="outline">Return to Main Storefront</Button>
          </Link>
        </div>
        <CustomerBottomNav active="cart" storefrontPath="/store/the-fragrance-store" />
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8 sm:py-12 bg-muted/20">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link
            to={storefrontPath}
            className="group flex flex-col items-center focus:outline-none transition-transform active:scale-95"
            title={tenant?.name || "The Fragrance Store"}
          >
            <div className="h-16 w-16 rounded-2xl bg-[#111111] border border-[#C5A059]/40 p-2 flex items-center justify-center transition-all group-hover:border-[#C5A059] shadow-sm">
              <img
                src={tenant?.logo || "/fragrance/brand-mark.svg"}
                alt={tenant?.name || "The Fragrance Store"}
                className="h-full w-full object-contain"
              />
            </div>
            <span className="mt-3 text-base sm:text-lg font-serif font-bold tracking-[0.14em] text-foreground uppercase">
              {tenant?.name || "The Fragrance Store"}
            </span>
            <span className="text-xs font-semibold text-[#C5A059] tracking-wider uppercase">
              {tenant?.displayLabel ? `${tenant.displayLabel} • House of Brands` : "House of Brands"}
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
                  <div className="flex items-center gap-1.5 px-3 py-3 border-r border-border/60 bg-muted/30 select-none shrink-0">
                    <span className="text-base" aria-hidden="true">
                      🇺🇸
                    </span>
                    <span className="text-xs font-bold text-foreground font-mono">
                      +1
                    </span>
                  </div>

                  <input
                    id="customer-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="2015550123"
                    className="flex-1 px-3 py-3 text-base sm:text-lg font-mono font-medium tracking-wider bg-transparent outline-none placeholder:text-muted-foreground/40 text-foreground w-full"
                    maxLength={10}
                    aria-invalid={touched && !isValid}
                    aria-describedby={
                      validationMessage || serverError ? "phone-error" : undefined
                    }
                  />

                  {isValid && (
                    <div className="pr-3 text-emerald-600 shrink-0">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  )}
                </div>

                {/* Helper / Error Text */}
                {validationMessage && (
                  <p
                    id="phone-error"
                    role="alert"
                    className="text-xs font-medium text-destructive mt-1.5 flex items-center gap-1"
                  >
                    <span>⚠️</span>
                    <span>{validationMessage}</span>
                  </p>
                )}

                {serverError && (
                  <p
                    id="phone-server-error"
                    role="alert"
                    className="text-xs font-medium text-destructive mt-1.5 flex items-center gap-1"
                  >
                    <span>⚠️</span>
                    <span>{serverError}</span>
                  </p>
                )}

                {!validationMessage && !serverError && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Format: 10 digits without country code (e.g., 201 555 0123)
                  </p>
                )}
              </div>

              {/* Action Buttons: Continue & Back to Cart */}
              <div className="space-y-3 pt-2">
                <Button
                  id="checkout-continue-btn"
                  type="submit"
                  disabled={!isValid || validatePhoneMutation.isPending}
                  className="w-full h-12 text-sm font-bold tracking-wide uppercase rounded-xl transition-all shadow-md bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
                >
                  {validatePhoneMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Verifying...
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
                  onClick={() => navigate(`${storefrontPath}/cart`)}
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

      <CustomerBottomNav active="cart" storefrontPath={storefrontPath} />
    </div>
  );
}
