import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Home,
  Info,
  Utensils,
  LayoutGrid,
  Image as ImageIcon,
  Search,
  ShoppingCart,
  Star,
  UserRound,
  CheckCircle2,
  Minus,
  Plus,
  ReceiptText,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { addGuestCartItem, useGuestCart } from "@/lib/guestCart";
import { usePlacedOrder } from "@/lib/placedOrder";
import ActiveOrdersModal from "@/components/ActiveOrdersModal";
import { formatCurrency, formatNumber, toNumber, unitLabels } from "@/lib/i18n";
import { parseProductOptions } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveProductImageUrl } from "@/lib/image";

type MarketplaceProduct = {
  id: number;
  slug: string;
  name: string;
  image?: string | null;
  supplierName?: string | null;
  categoryName?: string | null;
  unitPrice?: string | number | null;
  compareAtPrice?: string | number | null;
  unitType?: string | null;
  unitSize?: string | null;
  minimumOrderQuantity?: number | null;
  stock?: number | string | null;
  rating?: string | number | null;
  grade?: string | null;
  organic?: boolean | null;
  status?: string | null;
  options?: string | null;
};

type MarketplaceCategory = {
  id: number;
  name: string;
  slug?: string | null;
  description?: string | null;
  icon?: string | null;
};

interface CategoryNavItem {
  key: string;
  name: string;
  icon: React.ElementType;
  emoji: string;
  categoryId?: number;
}

const ALL_PRODUCTS_CATEGORY: CategoryNavItem = {
  key: "all",
  name: "All Products",
  icon: LayoutGrid,
  emoji: "🍽️",
};

export function getCategoryEmoji(category: {
  name?: string | null;
  slug?: string | null;
  icon?: string | null;
}): string {
  if (!category) return "🍗";

  // If category.icon is already a unicode emoji, use it directly
  if (category.icon && /\p{Emoji}/u.test(category.icon)) {
    return category.icon.trim();
  }

  // If category.name starts with a unicode emoji, use it
  if (category.name && /^\p{Emoji}/u.test(category.name.trim())) {
    const match = category.name.trim().match(/^\p{Emoji}+/u);
    if (match) return match[0];
  }

  // Check known icon identifier strings
  const iconKey = (category.icon || "").toLowerCase().trim();
  if (iconKey === "chicken" || iconKey === "drumstick" || iconKey === "sparkles" || iconKey === "beef") return "🍗";
  if (iconKey === "burger") return "🍔";
  if (iconKey === "wings" || iconKey === "party-wings") return "🍗";
  if (iconKey === "fries" || iconKey === "boxes") return "🍟";
  if (iconKey === "drinks" || iconKey === "droplets" || iconKey === "beverage") return "🥤";
  if (iconKey === "catering" || iconKey === "party" || iconKey === "package") return "🎉";
  if (iconKey === "kids" || iconKey === "bento") return "🍱";
  if (iconKey === "sandwich") return "🥪";
  if (iconKey === "fiery" || iconKey === "chili" || iconKey === "flame" || iconKey === "hot") return "🌶️";
  if (iconKey === "platter") return "🍗";

  const text = `${category.slug || ""} ${category.name || ""}`.toLowerCase();

  // Keyword matches aligned with Tex's Chicken & Burgers menu offerings
  if (text.includes("fiery") || text.includes("spicy") || text.includes("chili") || text.includes("hot wing") || text.includes("flame")) return "🌶️";
  if (text.includes("burger")) return "🍔";
  if (text.includes("sandwich") || text.includes("sub") || text.includes("philly") || text.includes("cheesesteak")) return "🥪";
  if (text.includes("tender") || text.includes("strip") || text.includes("nugget")) return "🍗";
  if (text.includes("wing")) return "🍗";
  if (text.includes("kid")) return "🍱";
  if (text.includes("family")) return "🍗";
  if (text.includes("catering") || text.includes("party") || text.includes("feast")) return "🎉";
  if (text.includes("chicken") || text.includes("poultry") || text.includes("fried chicken") || text.includes("crispy")) return "🍗";
  if (text.includes("gyro") || text.includes("wrap") || text.includes("pita")) return "🌯";
  if (text.includes("rice bowl") || text.includes("bowl") || text.includes("rice")) return "🍚";
  if (text.includes("salad")) return "🥗";
  if (text.includes("side") || text.includes("fries") || text.includes("fry") || text.includes("ring")) return "🍟";
  if (text.includes("beverage") || text.includes("drink") || text.includes("soda") || text.includes("juice") || text.includes("shake") || text.includes("tea") || text.includes("water")) return "🥤";
  if (text.includes("dessert") || text.includes("sweet") || text.includes("baklava") || text.includes("cake") || text.includes("cookie")) return "🍰";
  if (text.includes("falafel")) return "🧆";
  if (text.includes("sauce") || text.includes("dip")) return "🥣";
  if (text.includes("combo") || text.includes("meal")) return "🍱";
  if (text.includes("platter")) return "🍗";

  return "🍗";
}

export function toCategoryNavItem(category: MarketplaceCategory): CategoryNavItem {
  return {
    key: `category-${category.id}`,
    name: category.name,
    icon: Utensils,
    emoji: getCategoryEmoji(category) || "🍗",
    categoryId: category.id,
  };
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const guestCart = useGuestCart();
  const { isOrderActive, activeOrders, activeCount } = usePlacedOrder();
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("all");
  const [sort, setSort] = useState<"newest" | "price" | "name">("newest");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const utils = trpc.useUtils();

  const categoriesQuery = trpc.category.list.useQuery(undefined, { retry: false });
  const categoriesRaw = categoriesQuery.data;
  const categories = useMemo(
    () => (categoriesRaw ?? []) as MarketplaceCategory[],
    [categoriesRaw],
  );
  const sidebarCategories = useMemo(
    () => [ALL_PRODUCTS_CATEGORY, ...categories.map(toCategoryNavItem)],
    [categories],
  );

  const selectedNavItem = useMemo(
    () => sidebarCategories.find((item) => item.key === selectedCategoryKey) ?? ALL_PRODUCTS_CATEGORY,
    [selectedCategoryKey, sidebarCategories],
  );

  useEffect(() => {
    if (selectedCategoryKey !== "all" && !sidebarCategories.some((item) => item.key === selectedCategoryKey)) {
      setSelectedCategoryKey("all");
    }
  }, [selectedCategoryKey, sidebarCategories]);

  const productsQuery = trpc.product.list.useQuery(
    {
      search: search.trim() || undefined,
      categoryId: selectedNavItem.categoryId,
      status: "active",
      sortBy: sort,
      sortOrder: sortOrder,
    },
    { retry: false },
  );

  const cartQuery = trpc.cart.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const cartCount = isAuthenticated ? (cartQuery.data?.count ?? 0) : guestCart.count;

  const addToCart = trpc.cart.add.useMutation({
    onSuccess: async () => {
      await utils.cart.list.invalidate();
      toast.success("Product added to cart.");
    },
    onError: (error) => toast.error(error.message || "Could not add product to cart."),
  });

  const products = (productsQuery.data ?? []) as MarketplaceProduct[];

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const grid = document.getElementById("products-grid");
    if (grid) {
      grid.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleOrderNow() {
    setSelectedCategoryKey("all");
    const grid = document.getElementById("products-grid");
    if (grid) {
      grid.scrollIntoView({ behavior: "smooth" });
    }
  }

  function addProductToCart(product: MarketplaceProduct, quantity: number) {
    const options = parseProductOptions(product.options);
    if (options.length > 0) {
      navigate(`/products/${product.slug}`);
      toast.info("Please select an option before adding to cart.");
      return;
    }

    if (isAuthenticated) {
      addToCart.mutate({ productId: product.id, quantity });
      return;
    }
    addGuestCartItem({
      id: product.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      productImage: product.image ?? null,
      productUnitType: product.unitType ?? "order",
      productUnitSize: product.unitSize ?? product.unitType ?? "1 order",
      quantity,
      unitPrice: String(product.unitPrice ?? 0),
    });
    toast.success("Product added to cart.");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-row">
      {/* Spacer to preserve normal document flow layout width (~28% on mobile) */}
      <div className="md:hidden w-[28%] shrink-0 pointer-events-none" aria-hidden="true" />

      {/* ====================================================================== */}
      {/* 1. FIXED MOBILE VIEWPORT CATEGORY SIDEBAR (~28% WIDTH)                 */}
      {/* ====================================================================== */}
      <aside
        id="mobile-category-sidebar"
        style={{
          background: "linear-gradient(to bottom, #0F5132 0%, #062E1F 50%, #0F5132 100%)",
        }}
        className="md:hidden fixed top-0 left-0 w-[28%] bottom-[49px] border-r border-[#062E1F] text-white flex flex-col justify-between overflow-hidden z-40 select-none"
      >
        {/* Top Brand Header */}
        <div className="shrink-0 px-1.5 xs:px-2 pt-5 xs:pt-6 pb-2.5 flex flex-col items-center text-center border-b border-emerald-800/60">
          <Link to="/" className="flex flex-col items-center group w-full">
            <div className="h-10 xs:h-12 flex items-end justify-center w-full">
              <img
                src="/branding/logo.png"
                alt="Tex’s Chicken & Burgers"
                className="h-[62px] xs:h-[64px] w-auto shrink-0 object-contain transition-transform group-hover:scale-105 drop-shadow-sm"
              />
            </div>
            <div className="mt-1.5 flex flex-col items-center text-center w-full">
              <span className="text-xs xs:text-sm font-extrabold tracking-tight text-white leading-tight">
                Tex’s
              </span>
              <span className="whitespace-nowrap text-[9.5px] xs:text-[11px] font-bold tracking-tight text-white/95 leading-tight mt-0.5">
                Chicken &amp; Burgers
              </span>
              <span className="whitespace-nowrap text-[7.5px] xs:text-[8.5px] font-semibold text-emerald-300 tracking-tight leading-tight mt-1">
                Worth Every Bite
              </span>
            </div>
          </Link>
        </div>

        {/* Scrollable Categories List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain hide-scrollbar pt-[18px] pb-2">
          <nav className="flex flex-col gap-1">
            {sidebarCategories.map((item) => {
              const isActive = selectedCategoryKey === item.key;
              const isAllProducts = item.key === "all";
              return (
                <Fragment key={item.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryKey(item.key);
                      const grid = document.getElementById("products-grid");
                      if (grid) {
                        grid.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className={`w-full flex items-start gap-1.5 px-1.5 xs:px-2 py-1.5 xs:py-2 text-left transition-colors border-l-2 ${
                      isActive
                        ? "border-emerald-400 bg-white/10 text-white font-bold"
                        : "border-transparent bg-transparent text-emerald-100/80 hover:text-white hover:bg-white/5 font-medium"
                    }`}
                  >
                    <span className="w-4 shrink-0 text-center select-none text-xs xs:text-sm leading-tight mt-0.5">
                      {item.emoji || "🍗"}
                    </span>
                    <span className="flex-1 min-w-0 text-[11px] xs:text-xs tracking-tight leading-snug break-words whitespace-normal line-clamp-2">
                      {item.name}
                    </span>
                  </button>
                  {isAllProducts && (
                    <div className="my-1 border-b border-emerald-500/20" />
                  )}
                </Fragment>
              );
            })}
          </nav>
        </div>

        {/* Bottom Footer: Good Food Brings Good People */}
        <div className="shrink-0 p-1.5 xs:p-2 pt-2.5 border-t border-emerald-800/60 flex flex-col items-center text-center pb-2.5">
          <div className="text-[9px] xs:text-[10px] italic text-emerald-200 font-medium leading-tight">
            <p>Good Food</p>
            <p>Brings Good People</p>
          </div>
        </div>
      </aside>

      {/* ====================================================================== */}
      {/* 2. PERMANENT LEFT VERTICAL CATEGORY SIDEBAR (DESKTOP / TABLET)         */}
      {/* ====================================================================== */}
      <aside
        style={{
          background: "linear-gradient(to bottom, #0F5132 0%, #062E1F 50%, #0F5132 100%)",
        }}
        className="hidden md:flex md:w-64 lg:w-72 shrink-0 md:self-start md:sticky md:top-0 md:h-screen border-r border-[#062E1F] text-white p-4 lg:p-5 flex-col justify-between overflow-hidden z-30 select-none"
      >
        {/* Top Brand Header */}
        <div className="shrink-0 pt-6 lg:pt-8 pb-3.5 flex flex-col items-center text-center border-b border-emerald-800/60">
          <Link to="/" className="group flex flex-col items-center w-full">
            <img
              src="/branding/logo.png"
              alt="Tex’s Chicken & Burgers"
              className="h-16 lg:h-20 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-md"
            />
            <div className="mt-2.5 flex flex-col items-center text-center w-full">
              <span className="text-lg lg:text-xl font-extrabold tracking-tight text-white leading-tight group-hover:text-emerald-300 transition-colors">
                Tex’s
              </span>
              <span className="whitespace-nowrap text-sm lg:text-base font-bold tracking-tight text-white/95 leading-tight mt-0.5 group-hover:text-emerald-200 transition-colors">
                Chicken &amp; Burgers
              </span>
              <span className="whitespace-nowrap text-xs font-semibold text-emerald-300/90 tracking-wide mt-1 text-center">
                Worth Every Bite
              </span>
            </div>
          </Link>
        </div>

        {/* Scrollable Categories List */}
        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar pt-[18px] pb-3">
          <nav className="flex flex-col gap-1 lg:gap-1.5">
            {sidebarCategories.map((item) => {
              const isActive = selectedCategoryKey === item.key;
              const isAllProducts = item.key === "all";
              return (
                <Fragment key={item.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryKey(item.key);
                      const grid = document.getElementById("products-grid");
                      if (grid) {
                        grid.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors border-l-2 rounded-r-md ${
                      isActive
                        ? "border-emerald-400 bg-white/10 text-white font-bold"
                        : "border-transparent bg-transparent text-emerald-100/80 hover:text-white hover:bg-white/5 font-medium"
                    }`}
                  >
                    <span className="w-6 lg:w-7 shrink-0 text-center select-none text-base lg:text-lg leading-tight mt-0.5">
                      {item.emoji || "🍗"}
                    </span>
                    <span className="flex-1 min-w-0 text-sm lg:text-[15px] leading-snug break-words whitespace-normal line-clamp-2">
                      {item.name}
                    </span>
                  </button>
                  {isAllProducts && (
                    <div className="my-1.5 border-b border-emerald-500/20" />
                  )}
                </Fragment>
              );
            })}
          </nav>
        </div>

        {/* Bottom Footer: Good Food Brings Good People */}
        <div className="shrink-0 pt-3.5 pb-1 border-t border-emerald-800/60 flex flex-col items-center text-center">
          <p className="text-xs lg:text-sm italic text-emerald-200/90 font-medium">
            &ldquo;Good Food Brings Good People&rdquo;
          </p>
        </div>
      </aside>

      {/* ====================================================================== */}
      {/* 3. RIGHT MAIN CONTENT AREA (TAKES ALL REMAINING SPACE)                 */}
      {/* ====================================================================== */}
      <div className="w-[72%] md:w-auto flex-1 min-w-0 flex flex-col">
        {/* ==================================================================== */}
        {/* DESKTOP HEADER (>= md screens)                                       */}
        {/* ==================================================================== */}
        <header className="hidden md:block sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-xs px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left side: Tex’s Chicken & Burgers branding */}
            <div>
              <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight text-slate-900 leading-none">
                Tex’s Chicken & Burgers
              </h1>
              <p className="text-xs lg:text-sm font-medium text-emerald-700 mt-1">
                Worth Every Bite • Fresh Food • Always Halal
              </p>
            </div>

            {/* Right side: View Order, Login, and Cart buttons */}
            <div className="flex items-center gap-3">
              {isOrderActive && (
                activeCount === 1 ? (
                  <Link
                    to={`/bill?orderId=${encodeURIComponent(activeOrders[0]?.id || "")}`}
                    id="header-view-order-desktop"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 px-4 gap-2 border-emerald-600/70 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 font-bold rounded-xl shadow-xs"
                    >
                      <ReceiptText className="h-4 w-4 text-emerald-700" />
                      <span>View Order</span>
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    id="header-view-order-desktop"
                    onClick={() => setIsOrdersModalOpen(true)}
                    className="h-10 px-4 gap-2 border-emerald-600/70 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 font-bold rounded-xl shadow-xs"
                  >
                    <ReceiptText className="h-4 w-4 text-emerald-700" />
                    <span>View Orders ({activeCount})</span>
                  </Button>
                )
              )}
              {isAuthenticated && (
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-slate-700 hover:text-emerald-700 font-semibold">
                    <UserRound className="h-4 w-4" />
                    <span>{user?.name ?? "Dashboard"}</span>
                  </Button>
                </Link>
              )}
              <Link to="/about">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 gap-2 border-slate-300 text-slate-800 hover:border-emerald-600 hover:text-emerald-700 font-semibold rounded-xl"
                >
                  <Info className="h-4 w-4 text-emerald-700" />
                  <span>About</span>
                </Button>
              </Link>
              <Link to="/admin/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 gap-2 border-slate-300 text-slate-800 hover:border-emerald-600 hover:text-emerald-700 font-semibold rounded-xl"
                >
                  <UserRound className="h-4 w-4 text-emerald-700" />
                  <span>Login</span>
                </Button>
              </Link>
              <Link to="/cart">
                <Button
                  variant="outline"
                  size="sm"
                  className="relative h-10 px-4 gap-2 border-slate-300 text-slate-800 hover:border-emerald-600 hover:text-emerald-700 font-semibold rounded-xl"
                >
                  <ShoppingCart className="h-4 w-4 text-emerald-700" />
                  <span>Cart</span>
                  {!!(isAuthenticated ? cartQuery.data?.count : guestCart.count) && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white shadow-xs">
                      {isAuthenticated ? cartQuery.data?.count : guestCart.count}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar on Desktop */}
          <form onSubmit={handleSearchSubmit} className="relative mt-3.5 w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products, platters, burgers, and more..."
              className="h-11 w-full rounded-xl border-slate-300 bg-slate-50/80 pl-11 pr-24 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-emerald-600/20"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg px-4 shadow-xs"
            >
              Search
            </Button>
          </form>
        </header>

        {/* ==================================================================== */}
        {/* MOBILE HEADER (< md screens)                                         */}
        {/* ==================================================================== */}
        <header className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
          <div className="flex items-center justify-between gap-1.5 px-2 xs:px-3 py-2">
            <div className="flex items-center gap-1 xs:gap-1.5 min-w-0">
              <Link to="/" className="flex items-center gap-1.5 min-w-0">
                <div className="min-w-0">
                  <span className="block text-xs xs:text-sm font-extrabold tracking-tight text-slate-900 leading-tight truncate">
                    Tex’s Chicken & Burgers
                  </span>
                  <span className="block text-[8px] xs:text-[9.5px] font-semibold text-emerald-700 leading-none truncate">
                    Worth Every Bite
                  </span>
                </div>
              </Link>
            </div>
            {isOrderActive && (
              activeCount === 1 ? (
                <Link
                  to={`/bill?orderId=${encodeURIComponent(activeOrders[0]?.id || "")}`}
                  id="header-view-order-mobile"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-600/40 text-xs font-bold hover:bg-emerald-100 transition-colors shrink-0 shadow-xs"
                >
                  <ReceiptText className="h-3.5 w-3.5 text-emerald-700" />
                  <span>View Order</span>
                </Link>
              ) : (
                <button
                  type="button"
                  id="header-view-order-mobile"
                  onClick={() => setIsOrdersModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-600/40 text-xs font-bold hover:bg-emerald-100 transition-colors shrink-0 shadow-xs"
                >
                  <ReceiptText className="h-3.5 w-3.5 text-emerald-700" />
                  <span>View Orders ({activeCount})</span>
                </button>
              )
            )}
          </div>

          {/* Mobile Search Input */}
          <div className="px-2 xs:px-3 pb-2">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
                className="h-8 xs:h-9 w-full rounded-lg border-slate-300 bg-slate-50 pl-8 pr-16 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-emerald-600/20"
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-1 top-1/2 h-6 xs:h-7 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] xs:text-[11px] font-semibold rounded-md px-2 shadow-xs"
              >
                Search
              </Button>
            </form>
          </div>
        </header>

        {/* ==================================================================== */}
        {/* HOMEPAGE BODY: TWO-COLUMN PRODUCT GRID & HERO                        */}
        {/* ==================================================================== */}
        <main className="flex-1 p-1.5 xs:p-2 sm:p-5 md:p-6 lg:p-8 w-full pb-20 md:pb-8">
          <div className="space-y-3 sm:space-y-5 lg:space-y-6">
            {/* HERO BANNER */}
            <HeroBanner products={products} onOrderNow={handleOrderNow} />

            {/* PRODUCTS SECTION HEADER & SORTING */}
            <div
              id="products-grid"
              className="flex items-center justify-between gap-1.5 sm:gap-2 pt-0.5 sm:pt-2"
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm xs:text-base sm:text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  Tex’s Chicken & Burgers
                </h2>
                {selectedNavItem.key !== "all" && (
                  <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-emerald-800">
                    {selectedNavItem.name}
                  </span>
                )}
              </div>

              {/* Sorting Control - Hidden on mobile, preserved on desktop */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                <span className="text-[11px] sm:text-xs font-medium text-slate-500">Sort by:</span>
                <select
                  value={`${sort}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSort, newOrder] = e.target.value.split("-") as [
                      "newest" | "price" | "name",
                      "asc" | "desc",
                    ];
                    setSort(newSort);
                    setSortOrder(newOrder);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-[11px] sm:text-sm font-semibold text-slate-700 shadow-xs hover:border-emerald-500 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="newest-desc">Popular ▼</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
              </div>
            </div>

            {/* TWO PRODUCTS PER ROW GRID (BOTH PHONE AND DESKTOP) */}
            <ProductGrid
              products={products}
              loading={productsQuery.isLoading}
              emptyMessage="No halal items match your current selection."
              onAdd={addProductToCart}
              pending={addToCart.isPending}
            />
          </div>
        </main>

        {/* ==================================================================== */}
        {/* FIXED MOBILE BOTTOM NAVIGATION (< md screens)                        */}
        {/* ==================================================================== */}
        <nav
          id="mobile-bottom-nav"
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFFF] border-t border-[#E5E7EB] shadow-[0_-1px_6px_rgba(0,0,0,0.04)] px-2 py-1"
        >
          <div className="grid grid-cols-4 items-center max-w-md mx-auto">
            {/* 1. Home */}
            <Link
              to="/"
              id="mobile-nav-home"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex flex-col items-center justify-center py-0.5 text-emerald-700 font-bold transition-colors group"
            >
              <Home className="h-5 w-5 text-emerald-700 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] xs:text-[11px] font-bold mt-0.5 leading-none">Home</span>
            </Link>

            {/* 2. Categories */}
            <Link
              to="/products"
              id="mobile-nav-categories"
              className="flex flex-col items-center justify-center py-0.5 text-slate-500 hover:text-slate-800 font-medium transition-colors group"
            >
              <LayoutGrid className="h-5 w-5 text-slate-500 group-hover:text-slate-800 group-hover:scale-110 transition-all" />
              <span className="text-[10px] xs:text-[11px] mt-0.5 leading-none">Categories</span>
            </Link>

            {/* 3. Cart */}
            <Link
              to="/cart"
              id="mobile-nav-cart"
              className="relative flex flex-col items-center justify-center py-0.5 text-slate-500 hover:text-slate-800 font-medium transition-colors group"
            >
              <div className="relative">
                <ShoppingCart className="h-5 w-5 text-slate-500 group-hover:text-slate-800 group-hover:scale-110 transition-all" />
                {!!cartCount && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white shadow-xs">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] xs:text-[11px] mt-0.5 leading-none">Cart</span>
            </Link>

            {/* 4. About */}
            <Link
              to="/about"
              id="mobile-nav-about"
              className="flex flex-col items-center justify-center py-0.5 text-slate-500 hover:text-slate-800 font-medium transition-colors group"
            >
              <Info className="h-5 w-5 text-slate-500 group-hover:text-slate-800 group-hover:scale-110 transition-all" />
              <span className="text-[10px] xs:text-[11px] mt-0.5 leading-none">About</span>
            </Link>
          </div>
        </nav>

        {/* Active Orders Modal for viewing multiple concurrent orders */}
        <ActiveOrdersModal
          isOpen={isOrdersModalOpen}
          onClose={() => setIsOrdersModalOpen(false)}
          orders={activeOrders}
        />
      </div>
    </div>
  );
}

{/* ====================================================================== */}
{/* TODAY'S SPECIAL PROMOTIONAL BANNER COMPONENT                            */}
{/* ====================================================================== */}
function HeroBanner({
  products,
  onOrderNow: _onOrderNow,
}: {
  products: MarketplaceProduct[];
  onOrderNow?: () => void;
}) {
  // Automatically select the first 3 currently displayed products
  const topThreeProducts = useMemo(() => products.slice(0, 3), [products]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Rotate between Product 1 -> Product 2 -> Product 3 automatically
  useEffect(() => {
    if (topThreeProducts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % topThreeProducts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [topThreeProducts.length]);

  const safeIndex = topThreeProducts.length > 0 ? currentIndex % topThreeProducts.length : 0;
  const activeProduct = topThreeProducts[safeIndex];

  const activeImageSrc = useMemo(() => {
    if (!activeProduct) return null;
    const parsed = parseProductOptions(activeProduct.options);
    const variantImage = parsed.find((o) => o.image && o.image.trim())?.image?.trim();
    const rawImage = variantImage || activeProduct.image;
    return rawImage ? resolveProductImageUrl(rawImage) : null;
  }, [activeProduct]);

  if (!activeProduct) {
    return (
      <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl bg-emerald-950 border border-emerald-900/60 shadow-md h-36 xs:h-44 sm:h-48 md:h-56 flex flex-col justify-center px-5 sm:px-8 md:px-10">
        <h2 className="font-black tracking-wider text-white uppercase text-[13px] xs:text-sm sm:text-lg md:text-xl drop-shadow-md leading-tight whitespace-nowrap">
          TODAY'S SPECIAL
        </h2>
        <p className="text-[10px] xs:text-[11px] sm:text-sm md:text-base font-bold text-amber-400 mt-0.5 sm:mt-1 leading-snug drop-shadow-sm">
          Worth Every Bite
        </p>
        <p className="text-[10px] xs:text-[11px] sm:text-xs md:text-sm text-emerald-100/90 mt-0.5 sm:mt-1 line-clamp-1 leading-tight drop-shadow-xs">
          Fresh favorites made for you.
        </p>
        <div className="mt-2.5 sm:mt-3 flex items-center">
          <span className="inline-flex items-center gap-1.5 text-[9px] xs:text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-950 bg-amber-400 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full shadow-md">
            VIEW SPECIALS →
          </span>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/products/${activeProduct.slug}`}
      className="group relative block w-full overflow-hidden rounded-xl sm:rounded-2xl bg-emerald-950 border border-emerald-900/60 shadow-md h-36 xs:h-44 sm:h-48 md:h-56 select-none cursor-pointer"
      title={activeProduct.name}
    >
      {/* FULL PRODUCT IMAGE FILLS ENTIRE ADVERTISEMENT BOX */}
      {activeImageSrc ? (
        <img
          key={activeProduct.id}
          src={activeImageSrc}
          alt={activeProduct.name}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center select-none transition-transform duration-700 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-emerald-950 text-white/20">
          <ImageIcon className="h-14 w-14" />
        </div>
      )}

      {/* Gradient overlay to ensure text is sharp and legible without altering the original image quality */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent pointer-events-none" />

      {/* PROMOTIONAL TEXT PLACED ON TOP OF PRODUCT IMAGE */}
      <div className="relative z-10 flex flex-col justify-center h-full px-5 sm:px-8 md:px-10 max-w-xl">
        <h2 className="font-black tracking-wider text-white uppercase text-[13px] xs:text-sm sm:text-lg md:text-xl drop-shadow-md leading-tight whitespace-nowrap">
          TODAY'S SPECIAL
        </h2>
        <p className="text-[10px] xs:text-[11px] sm:text-sm md:text-base font-bold text-amber-400 mt-0.5 sm:mt-1 leading-snug drop-shadow-sm">
          Worth Every Bite
        </p>
        <p className="text-[10px] xs:text-[11px] sm:text-xs md:text-sm text-emerald-100/90 mt-0.5 sm:mt-1 line-clamp-1 leading-tight drop-shadow-xs">
          Fresh favorites made for you.
        </p>

        <div className="mt-2.5 sm:mt-3 md:mt-3.5 flex items-center">
          <span className="inline-flex items-center gap-1.5 text-[9px] xs:text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-950 bg-amber-400 group-hover:bg-amber-300 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full transition-colors shadow-md">
            VIEW SPECIALS →
          </span>
        </div>
      </div>
    </Link>
  );
}

{/* ====================================================================== */}
{/* PRODUCT GRID COMPONENT (TWO PRODUCTS PER ROW)                           */}
{/* ====================================================================== */}
function ProductGrid({
  products,
  loading,
  emptyMessage,
  onAdd,
  pending,
}: {
  products: MarketplaceProduct[];
  loading: boolean;
  emptyMessage: string;
  onAdd: (product: MarketplaceProduct, quantity: number) => void;
  pending?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-1.5 xs:gap-2 sm:gap-4 md:gap-5 lg:gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[220px] xs:h-[260px] sm:h-[360px] md:h-[400px] rounded-lg sm:rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="grid grid-cols-2 gap-1.5 xs:gap-2 sm:gap-4 md:gap-5 lg:gap-6">
      {products.map((product) => (
        <FoodProductCard
          key={product.id}
          product={product}
          onAdd={onAdd}
          pending={pending}
        />
      ))}
    </div>
  );
}

{/* ====================================================================== */}
{/* PREMIUM FOOD PRODUCT CARD COMPONENT                                    */}
{/* ====================================================================== */}
function FoodProductCard({
  product,
  onAdd,
  pending,
}: {
  product: MarketplaceProduct;
  onAdd: (product: MarketplaceProduct, quantity: number) => void;
  pending?: boolean;
}) {
  const price = toNumber(product.unitPrice);
  const compareAt = toNumber(product.compareAtPrice);
  const moq = product.minimumOrderQuantity ?? 1;
  const unit = product.unitType ?? "order";
  const stock = typeof product.stock === "number" ? product.stock : 100;
  const isOutOfStock = stock < moq && typeof product.stock === "number";
  const [quantity, setQuantity] = useState(moq);
  const [imageFailed, setImageFailed] = useState(false);
  const unitLabel = unitLabels[unit] ?? unit;

  const options = useMemo(() => parseProductOptions(product.options), [product.options]);
  const hasOptions = options.length > 0;
  const itemSubtitle = useMemo(() => {
    return (hasOptions ? options.find((o) => o.includedWith?.trim())?.includedWith?.trim() : null) || product.includedWith?.trim() || null;
  }, [hasOptions, options, product.includedWith]);
  const minOptionPrice = useMemo(() => {
    if (!hasOptions) return price;
    const prices = options.map((o) => o.onlyPrice || o.price || o.mealPrice || price).filter(Boolean);
    return prices.length > 0 ? Math.min(...prices) : price;
  }, [hasOptions, options, price]);

  const firstVariantImage = useMemo(() => {
    if (!hasOptions) return null;
    return options.find((o) => o.image && o.image.trim())?.image?.trim() || null;
  }, [hasOptions, options]);
  const displayImage = firstVariantImage || product.image;

  return (
    <Card id={`product-card-${product.id}`} className="group overflow-hidden rounded-lg sm:rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between p-0 py-0 gap-0">
      <div className="flex flex-col flex-1">
        {/* Food Image with Zoom effect */}
        <div className="relative aspect-square sm:aspect-[4/3] md:aspect-[16/10] bg-slate-100 overflow-hidden shrink-0">
          <Link to={`/products/${product.slug}`} className="block h-full w-full">
            {displayImage && !imageFailed ? (
              <img
                src={resolveProductImageUrl(displayImage)}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
            )}
          </Link>

          {/* SPECIAL OFFER Badge */}
          {compareAt > price && (
            <span className="absolute top-1 left-1 xs:top-1.5 xs:left-1.5 sm:top-3 sm:left-3 z-10 rounded-full bg-amber-500 px-1 xs:px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 text-[7.5px] xs:text-[8.5px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-950 shadow-xs">
              Offer
            </span>
          )}

          {hasOptions && (
            <span className="absolute bottom-1 left-1 xs:bottom-1.5 xs:left-1.5 sm:bottom-2.5 sm:left-2.5 z-10 rounded bg-slate-950/80 backdrop-blur-xs px-1 xs:px-1.5 py-0.5 text-[7px] xs:text-[8.5px] sm:text-[10px] font-semibold text-white shadow-xs">
              {options.length} Options
            </span>
          )}
        </div>

        {/* ============================================================== */}
        {/* MOBILE PRODUCT INFORMATION (sm:hidden)                          */}
        {/* Exact 6-line compact design directly following the image        */}
        {/* ============================================================== */}
        <div className="sm:hidden p-1.5 xs:p-2 pt-1 xs:pt-1.5 pb-1.5 xs:pb-2 flex flex-col gap-1">
          {/* LINE 1 & 2: PRODUCT NAME & CONTINUATION */}
          <Link
            id={`product-name-mobile-${product.id}`}
            to={`/products/${product.slug}`}
            className="font-bold text-[11px] xs:text-xs text-slate-900 leading-tight line-clamp-2 hover:text-emerald-700 transition-colors break-words"
          >
            {product.name}
          </Link>

          {/* LINE 3: WHAT COMES WITH IT / SHOP NAME */}
          <p className="text-[9px] xs:text-[10px] font-normal text-slate-500 leading-none truncate">
            {itemSubtitle || (product.supplierName ?? "Tex’s Chicken & Burgers")}
          </p>

          {/* LINE 4: PRICE + ORIGINAL PRICE */}
          <div className="flex items-baseline justify-between gap-1 pt-0.5 min-w-0">
            <span className="text-xs xs:text-sm font-extrabold text-emerald-700 leading-none shrink-0">
              {hasOptions ? `From ${formatCurrency(minOptionPrice)}` : formatCurrency(price)}
            </span>
            {compareAt > price ? (
              <span className="text-[9.5px] xs:text-[10.5px] text-black font-medium line-through leading-none truncate">
                {formatCurrency(compareAt)}
              </span>
            ) : null}
          </div>

          {/* LINE 5: RATING + CERTIFIED HALAL */}
          <div className="flex items-center justify-between gap-0.5 pt-0.5 min-w-0">
            <div className="flex items-center gap-0.5 text-[9px] xs:text-[10px] font-bold text-slate-800 shrink-0">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400 shrink-0" />
              <span>{product.rating ?? "4.8"}</span>
            </div>
            <div className="inline-flex items-center gap-0.5 rounded bg-emerald-50 border border-emerald-200/80 px-1 py-0.5 text-[7px] xs:text-[8px] font-semibold text-emerald-700 shrink-0 whitespace-nowrap">
              <CheckCircle2 className="h-2 w-2 xs:h-2.5 xs:w-2.5 text-emerald-600 shrink-0" />
              <span>Certified Halal</span>
            </div>
          </div>

          {/* LINE 6: QUANTITY + ADD / OPTIONS */}
          <div className="flex items-center justify-between gap-1 pt-1 min-w-0">
            {hasOptions ? (
              <Link
                id={`product-options-btn-mobile-${product.id}`}
                to={`/products/${product.slug}`}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-[22px] px-2 text-[10px] rounded shadow-xs active:scale-[0.98] flex items-center justify-center leading-none transition-colors"
              >
                Select Options
              </Link>
            ) : (
              <>
                <div className="flex items-center rounded border border-slate-200 bg-slate-50 p-0.5 shrink-0">
                  <button
                    id={`product-qty-minus-mobile-${product.id}`}
                    type="button"
                    className="h-4 w-4 p-0 flex items-center justify-center rounded text-slate-600 hover:bg-white hover:text-slate-900 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    onClick={() => setQuantity(Math.max(moq, quantity - 1))}
                    disabled={quantity <= moq || isOutOfStock}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-2.5 w-2.5" />
                  </button>
                  <span className="w-3 text-center text-[10px] font-bold text-slate-800 leading-none select-none">
                    {quantity}
                  </span>
                  <button
                    id={`product-qty-plus-mobile-${product.id}`}
                    type="button"
                    className="h-4 w-4 p-0 flex items-center justify-center rounded text-slate-600 hover:bg-white hover:text-slate-900 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    onClick={() => {
                      if (quantity >= stock) {
                        toast.error(`Only ${stock} available.`);
                      } else {
                        setQuantity(quantity + 1);
                      }
                    }}
                    disabled={isOutOfStock}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-2.5 w-2.5" />
                  </button>
                </div>

                <button
                  id={`product-add-btn-mobile-${product.id}`}
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-[22px] px-3 text-[10px] rounded shadow-xs active:scale-[0.98] shrink-0 flex items-center justify-center gap-1 leading-none transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  onClick={() => onAdd(product, quantity)}
                  disabled={pending || isOutOfStock}
                >
                  <ShoppingCart className="h-3 w-3 shrink-0" />
                  <span>Add</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* DESKTOP PRODUCT INFORMATION (hidden sm:block)                  */}
        {/* ============================================================== */}
        <CardContent className="hidden sm:block p-4 md:p-5 space-y-2.5">
          <div>
            <Link
              to={`/products/${product.slug}`}
              className="font-bold text-base md:text-lg text-slate-900 line-clamp-1 hover:text-emerald-700 transition-colors leading-snug"
            >
              {product.name}
            </Link>
            <p className="text-xs text-slate-400 truncate">
              {itemSubtitle || (product.supplierName ?? "Tex’s Chicken & Burgers")}
            </p>
          </div>

          {/* Price and Comparison */}
          <div className="flex items-baseline flex-wrap gap-1.5">
            <span className="text-xl md:text-2xl font-extrabold text-emerald-700 leading-tight">
              {hasOptions ? `From ${formatCurrency(minOptionPrice)}` : formatCurrency(price)}
            </span>
            {compareAt > price && (
              <span className="text-sm text-slate-400 line-through">
                {formatCurrency(compareAt)}
              </span>
            )}
            {product.unitSize ? (
              <span className="text-xs text-slate-500">({product.unitSize})</span>
            ) : unitLabel && unitLabel !== "item" && unitLabel !== "order" ? (
              <span className="text-xs text-slate-500">/{unitLabel}</span>
            ) : null}
          </div>

          {/* Rating and Certified Halal Badge */}
          <div className="flex items-center justify-between gap-1 pt-1">
            <div className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Halal</span>
            </div>

            {product.rating ? (
              <div className="flex items-center gap-0.5 text-xs font-bold text-slate-700 shrink-0">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{product.rating}</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP ACTION CONTROLS (hidden sm:block)                      */}
      {/* ============================================================== */}
      <div className="hidden sm:block p-4 md:p-5 pt-0">
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          {hasOptions ? (
            <Link to={`/products/${product.slug}`} className="flex-1">
              <Button
                id={`product-options-btn-desktop-${product.id}`}
                type="button"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-9 text-xs md:text-sm rounded-lg shadow-xs gap-1 transition-all active:scale-[0.98] px-3"
              >
                <Utensils className="h-4 w-4 shrink-0" />
                <span className="truncate">Select Options</span>
              </Button>
            </Link>
          ) : (
            <>
              <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded hover:bg-white text-slate-700 transition-colors"
                  onClick={() => setQuantity(Math.max(moq, quantity - 1))}
                  disabled={quantity <= moq || isOutOfStock}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-8 text-center text-xs font-bold text-slate-800">
                  {quantity}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded hover:bg-white text-slate-700 transition-colors"
                  onClick={() => {
                    if (quantity >= stock) {
                      toast.error(`Only ${stock} available.`);
                    } else {
                      setQuantity(quantity + 1);
                    }
                  }}
                  disabled={isOutOfStock}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Button
                id={`product-add-btn-desktop-${product.id}`}
                type="button"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-9 text-xs md:text-sm rounded-lg shadow-xs gap-1.5 transition-all active:scale-[0.98] px-3"
                onClick={() => onAdd(product, quantity)}
                disabled={pending || isOutOfStock}
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                <span className="truncate">Add</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
