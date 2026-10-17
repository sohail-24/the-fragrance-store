import { Link, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useGuestCart } from "@/lib/guestCart";
import { formatCurrency } from "@/lib/i18n";
import { PageHeader } from "@/components/freshflow/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";
import { ArrowRight, Minus, Package, Plus, ShoppingCart, Store, Trash2 } from "lucide-react";

export default function Cart() {
  const params = useParams<{ tenantSlug?: string }>();
  const { user } = useAuth();
  const guestCart = useGuestCart();
  const isAuthenticated = !!user;

  const storefrontQuery = trpc.company.storefront.useQuery(
    { slug: params.tenantSlug },
    { enabled: !!params.tenantSlug, retry: false }
  );
  const tenant = storefrontQuery.data?.status === "active" ? storefrontQuery.data.tenant : null;
  const storefrontPath = params.tenantSlug ? `/store/${params.tenantSlug}` : "/store/the-fragrance-store";

  const cartQuery = trpc.cart.list.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const utils = trpc.useUtils();
  const updateMutation = trpc.cart.update.useMutation({ onSuccess: () => utils.cart.list.invalidate() });
  const removeMutation = trpc.cart.remove.useMutation({ onSuccess: () => utils.cart.list.invalidate() });
  const clearMutation = trpc.cart.clear.useMutation({ onSuccess: () => utils.cart.list.invalidate() });
  const items = isAuthenticated ? (cartQuery.data?.items ?? []) : guestCart.items;
  const subtotal = isAuthenticated ? (cartQuery.data?.total ?? 0) : guestCart.total;
  const isLoading = isAuthenticated && cartQuery.isLoading;

  if (params.tenantSlug && storefrontQuery.data?.status === "not_found") {
    return (
      <div className="mx-auto max-w-xl py-16 text-center space-y-4 px-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
          <Store className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-serif font-bold text-foreground">Boutique Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested boutique does not exist or has been relocated.
        </p>
        <Link to="/store/the-fragrance-store">
          <Button variant="outline">Return to Main Storefront</Button>
        </Link>
        <CustomerBottomNav active="cart" storefrontPath="/store/the-fragrance-store" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 md:px-0 pb-24 md:pb-8 pt-4">
      <PageHeader
        backTo={storefrontPath}
        backLabel="Back to Home"
        title="Shopping Bag"
        description="Review items before checkout."
        actions={items.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => (isAuthenticated ? clearMutation.mutate() : guestCart.clear())}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Cart
          </Button>
        ) : null}
      />

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24" />)}</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">Your shopping bag is empty</h3>
            <p className="mb-6 mt-1 text-sm text-muted-foreground">Browse the catalog to add items.</p>
            <Link to={`${storefrontPath}/products`}><Button>Browse Products</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            {items.map((item) => {
              const unitPrice = Number(item.unitPrice ?? 0);
              const itemTotal = unitPrice * item.quantity;
              return (
                <Card key={item.id}>
                  <CardContent className="flex gap-4 p-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {item.productImage ? <img src={item.productImage} alt={item.productName ?? ""} className="h-full w-full object-cover" /> : <Package className="h-8 w-8 text-muted-foreground/40" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link to={`${storefrontPath}/products/${item.productSlug}`} className="font-medium hover:text-primary">{item.productName}</Link>
                          {item.selectedOption ? (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="inline-flex items-center rounded bg-[#111111] px-2 py-0.5 text-xs font-semibold text-[#E0C895] border border-[#C5A059]/40">
                                {item.selectedOption}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium">
                                ({formatCurrency(unitPrice)} each)
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.productUnitSize}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => (isAuthenticated ? removeMutation.mutate({ cartItemId: item.id }) : guestCart.remove(item.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => (isAuthenticated ? updateMutation.mutate({ cartItemId: item.id, quantity: Math.max(1, item.quantity - 1) }) : guestCart.update(item.id, Math.max(1, item.quantity - 1)))}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => (isAuthenticated ? updateMutation.mutate({ cartItemId: item.id, quantity: item.quantity + 1 }) : guestCart.update(item.id, item.quantity + 1))}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="font-semibold">{formatCurrency(itemTotal)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="h-fit">
            <CardHeader><CardTitle className="text-base">Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
              <Separator />
              <SummaryRow label="Total" value={formatCurrency(subtotal)} strong />
              <Link to={`${storefrontPath}/checkout`}><Button className="h-11 w-full bg-[#111111] hover:bg-[#C5A059] hover:text-[#111111] text-[#FDFBF7] font-semibold tracking-wider uppercase text-xs transition-colors">Proceed to Checkout<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
              <Link to={storefrontPath || "/store/the-fragrance-store"}><Button variant="outline" className="w-full">Continue Shopping</Button></Link>
            </CardContent>
          </Card>
        </div>
      )}

      <CustomerBottomNav active="cart" storefrontPath={storefrontPath} />
    </div>
  );
}

function SummaryRow({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 text-sm ${strong ? "text-base font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={muted ? "text-muted-foreground" : ""}>{value}</span>
    </div>
  );
}
