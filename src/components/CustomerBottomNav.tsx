import { Link } from "react-router";
import { Home, Info, LayoutGrid, ShoppingCart, Sparkles, UserRound } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useGuestCart } from "@/lib/guestCart";

interface CustomerBottomNavProps {
  active?: "home" | "shop" | "categories" | "cart" | "account" | "about" | "none";
  storefrontPath?: string;
}

export function CustomerBottomNav({ active = "home", storefrontPath }: CustomerBottomNavProps) {
  const { user } = useAuth();
  const guestCart = useGuestCart();
  const isAuthenticated = !!user;
  const targetStorefront =
    storefrontPath ||
    (typeof window !== "undefined" && window.location.pathname.startsWith("/store")
      ? window.location.pathname.split("#")[0]
      : "/store/the-fragrance-store");

  const cartQuery = trpc.cart.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const cartCount = isAuthenticated
    ? (cartQuery.data?.count ?? 0)
    : guestCart.items.reduce((sum, item) => sum + item.quantity, 0);

  function handleCategoriesClick(e: React.MouseEvent) {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/store")) {
      e.preventDefault();
      const el = document.getElementById("categories-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }

  function handleHomeClick(e: React.MouseEvent) {
    if (typeof window !== "undefined" && (window.location.pathname === targetStorefront || window.location.pathname.startsWith("/store"))) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#111111] border-t border-[#262421] shadow-[0_-2px_12px_rgba(0,0,0,0.4)] px-1.5 py-1 pb-[max(0.45rem,env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-5 items-center max-w-md mx-auto">
        {/* 1. Home */}
        <Link
          to={targetStorefront}
          id="mobile-nav-home"
          onClick={handleHomeClick}
          className={`flex flex-col items-center justify-center py-1 transition-colors group ${
            active === "home"
              ? "text-[#C5A059] font-semibold"
              : "text-[#9E978C] hover:text-[#FDFBF7] font-normal"
          }`}
        >
          <Home
            className={`h-4.5 w-4.5 transition-all ${
              active === "home"
                ? "text-[#C5A059] scale-105"
                : "text-[#9E978C] group-hover:text-[#FDFBF7]"
            }`}
          />
          <span
            className={`text-[9.5px] mt-1 tracking-wider uppercase leading-none font-sans ${
              active === "home" ? "font-semibold text-[#C5A059]" : ""
            }`}
          >
            Home
          </span>
        </Link>

        {/* 2. Shop */}
        <Link
          to="/products"
          id="mobile-nav-shop"
          className={`flex flex-col items-center justify-center py-1 transition-colors group ${
            active === "shop"
              ? "text-[#C5A059] font-semibold"
              : "text-[#9E978C] hover:text-[#FDFBF7] font-normal"
          }`}
        >
          <LayoutGrid
            className={`h-4.5 w-4.5 transition-all ${
              active === "shop"
                ? "text-[#C5A059] scale-105"
                : "text-[#9E978C] group-hover:text-[#FDFBF7]"
            }`}
          />
          <span
            className={`text-[9.5px] mt-1 tracking-wider uppercase leading-none font-sans ${
              active === "shop" ? "font-semibold text-[#C5A059]" : ""
            }`}
          >
            Shop
          </span>
        </Link>

        {/* 3. Categories */}
        <Link
          to={`${targetStorefront}#categories-section`}
          id="mobile-nav-categories"
          onClick={handleCategoriesClick}
          className={`flex flex-col items-center justify-center py-1 transition-colors group ${
            active === "categories"
              ? "text-[#C5A059] font-semibold"
              : "text-[#9E978C] hover:text-[#FDFBF7] font-normal"
          }`}
        >
          <Sparkles
            className={`h-4.5 w-4.5 transition-all ${
              active === "categories"
                ? "text-[#C5A059] scale-105"
                : "text-[#9E978C] group-hover:text-[#FDFBF7]"
            }`}
          />
          <span
            className={`text-[9.5px] mt-1 tracking-wider uppercase leading-none font-sans ${
              active === "categories" ? "font-semibold text-[#C5A059]" : ""
            }`}
          >
            Categories
          </span>
        </Link>

        {/* 4. Cart */}
        <Link
          to="/cart"
          id="mobile-nav-cart"
          className={`relative flex flex-col items-center justify-center py-1 transition-colors group ${
            active === "cart"
              ? "text-[#C5A059] font-semibold"
              : "text-[#9E978C] hover:text-[#FDFBF7] font-normal"
          }`}
        >
          <div className="relative">
            <ShoppingCart
              className={`h-4.5 w-4.5 transition-all ${
                active === "cart"
                  ? "text-[#C5A059] scale-105"
                  : "text-[#9E978C] group-hover:text-[#FDFBF7]"
              }`}
            />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C5A059] px-1 text-[9px] font-bold text-[#111111] shadow-xs">
                {cartCount}
              </span>
            )}
          </div>
          <span
            className={`text-[9.5px] mt-1 tracking-wider uppercase leading-none font-sans ${
              active === "cart" ? "font-semibold text-[#C5A059]" : ""
            }`}
          >
            Cart
          </span>
        </Link>

        {/* 5. Account */}
        <Link
          to={isAuthenticated ? "/dashboard" : "/admin/login"}
          id="mobile-nav-account"
          className={`flex flex-col items-center justify-center py-1 transition-colors group ${
            active === "account"
              ? "text-[#C5A059] font-semibold"
              : "text-[#9E978C] hover:text-[#FDFBF7] font-normal"
          }`}
        >
          <UserRound
            className={`h-4.5 w-4.5 transition-all ${
              active === "account"
                ? "text-[#C5A059] scale-105"
                : "text-[#9E978C] group-hover:text-[#FDFBF7]"
            }`}
          />
          <span
            className={`text-[9.5px] mt-1 tracking-wider uppercase leading-none font-sans ${
              active === "account" ? "font-semibold text-[#C5A059]" : ""
            }`}
          >
            Account
          </span>
        </Link>
      </div>
    </nav>
  );
}

export default CustomerBottomNav;
