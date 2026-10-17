import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  Menu,
  X,
  Search,
  ShoppingCart,
  UserRound,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  ShieldCheck,
  Gem,
  Gift,
  Headphones,
  Check,
  Store,
  AlertTriangle,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { addGuestCartItem, useGuestCart } from "@/lib/guestCart";
import { usePlacedOrder } from "@/lib/placedOrder";
import ActiveOrdersModal from "@/components/ActiveOrdersModal";
import { formatCurrency, toNumber } from "@/lib/i18n";
import { parseProductOptions } from "@/types";
import { Button } from "@/components/ui/button";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";
import { resolveProductImageUrl } from "@/lib/image";

export type MarketplaceProduct = {
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
  description?: string | null;
  tags?: string | null;
};

export type MarketplaceCategory = {
  id: number;
  name: string;
  slug?: string | null;
  description?: string | null;
  icon?: string | null;
};

// Preserved for backward-compatibility with existing unit tests
export function getCategoryEmoji(category: {
  name?: string | null;
  slug?: string | null;
  icon?: string | null;
}): string {
  if (!category) return "🍗";

  if (category.icon && /\p{Emoji}/u.test(category.icon)) {
    return category.icon.trim();
  }

  if (category.name && /^\p{Emoji}/u.test(category.name.trim())) {
    const match = category.name.trim().match(/^\p{Emoji}+/u);
    if (match) return match[0];
  }

  const iconKey = (category.icon || "").toLowerCase().trim();
  if (iconKey === "chicken" || iconKey === "drumstick" || iconKey === "beef") return "🍗";
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
  if (text.includes("fiery") || text.includes("spicy") || text.includes("chili") || text.includes("flame")) return "🌶️";
  if (text.includes("burger")) return "🍔";
  if (text.includes("sandwich") || text.includes("sub") || text.includes("philly")) return "🥪";
  if (text.includes("tender") || text.includes("strip") || text.includes("nugget")) return "🍗";
  if (text.includes("wing")) return "🍗";
  if (text.includes("kid")) return "🍱";
  if (text.includes("family")) return "🍗";
  if (text.includes("catering") || text.includes("party") || text.includes("feast")) return "🎉";
  if (text.includes("chicken") || text.includes("poultry") || text.includes("fried")) return "🍗";
  if (text.includes("gyro") || text.includes("wrap") || text.includes("pita")) return "🌯";
  if (text.includes("rice bowl") || text.includes("bowl") || text.includes("rice")) return "🍚";
  if (text.includes("salad")) return "🥗";
  if (text.includes("side") || text.includes("fries") || text.includes("fry")) return "🍟";
  if (text.includes("beverage") || text.includes("drink") || text.includes("soda") || text.includes("juice") || text.includes("shake") || text.includes("tea") || text.includes("water")) return "🥤";
  if (text.includes("dessert") || text.includes("sweet") || text.includes("baklava") || text.includes("cake") || text.includes("cookie")) return "🍰";
  if (text.includes("falafel")) return "🧆";
  if (text.includes("sauce") || text.includes("dip")) return "🥣";
  if (text.includes("combo") || text.includes("meal")) return "🍱";
  if (text.includes("platter")) return "🍗";

  return "🍗";
}

export function toCategoryNavItem(category: { id: number; name: string; slug?: string | null }) {
  return {
    key: `category-${category.id}`,
    name: category.name,
    icon: Sparkles,
    emoji: getCategoryEmoji(category) || "✨",
    categoryId: category.id,
  };
}

// Strict exclusion of restaurant/food products
function isFoodOrRestaurantProduct(item: MarketplaceProduct): boolean {
  const text = `${item.name || ""} ${item.categoryName || ""} ${item.description || ""} ${item.tags || ""} ${item.supplierName || ""}`.toLowerCase();
  const foodKeywords = [
    "burger", "chicken", "fries", "wing", "platter", "halal", "food", "sauce",
    "sandwich", "tender", "mac n", "macaroni", "potato", "corn", "coleslaw",
    "biscuit", "meal", "combo", "rice", "feast", "gyro", "falafel", "beverage",
    "snapple", "soda", "drink", "catering", "tex’s", "texs", "shahs", "restaurant"
  ];
  return foodKeywords.some((keyword) => text.includes(keyword));
}

// 4 Primary Visual Categories for Mobile Grid
export const FRAGRANCE_CATEGORIES = [
  {
    id: "for-him",
    title: "For Him",
    subtitle: "Bold woods & fresh aromatics",
    image: "/fragrance/cat-for-him.svg",
    filterKey: "him",
  },
  {
    id: "for-her",
    title: "For Her",
    subtitle: "Radiant florals & delicate ambers",
    image: "/fragrance/cat-for-her.svg",
    filterKey: "her",
  },
  {
    id: "unisex",
    title: "Unisex",
    subtitle: "Artisanal niche & balanced accords",
    image: "/fragrance/cat-unisex.svg",
    filterKey: "unisex",
  },
  {
    id: "gift-sets",
    title: "Gift Sets",
    subtitle: "Curated coffrets & travel sets",
    image: "/fragrance/cat-gift-sets.svg",
    filterKey: "gift-sets",
  },
];

// Illustrative Demo Fragrances (Strictly isolated for frontend design preview)
export interface IllustrativeFragrance {
  id: number;
  slug: string;
  name: string;
  house: string;
  concentration: string;
  category: "him" | "her" | "unisex" | "gift-sets";
  price: number;
  image: string;
  size: string;
}

export const ILLUSTRATIVE_DEMO_FRAGRANCES: IllustrativeFragrance[] = [
  {
    id: 101,
    slug: "dior-sauvage-edp",
    name: "Sauvage",
    house: "Dior",
    concentration: "Eau de Parfum",
    category: "him",
    price: 145,
    image: "/fragrance/sauvage-edp.svg",
    size: "100 ml",
  },
  {
    id: 102,
    slug: "miss-dior-blooming-bouquet",
    name: "Miss Dior",
    house: "Dior",
    concentration: "Eau de Parfum",
    category: "her",
    price: 138,
    image: "/fragrance/miss-dior.svg",
    size: "100 ml",
  },
  {
    id: 103,
    slug: "bleu-de-chanel-parfum",
    name: "Bleu de Chanel",
    house: "Chanel",
    concentration: "Parfum",
    category: "him",
    price: 178,
    image: "/fragrance/bleu-chanel.svg",
    size: "100 ml",
  },
  {
    id: 104,
    slug: "baccarat-rouge-540",
    name: "Baccarat Rouge 540",
    house: "Maison Francis Kurkdjian",
    concentration: "Extrait de Parfum",
    category: "unisex",
    price: 435,
    image: "/fragrance/baccarat-540.svg",
    size: "70 ml",
  },
  {
    id: 105,
    slug: "tom-ford-oud-wood",
    name: "Oud Wood",
    house: "Tom Ford",
    concentration: "Eau de Parfum",
    category: "unisex",
    price: 295,
    image: "/fragrance/tom-ford-oud.svg",
    size: "100 ml",
  },
  {
    id: 106,
    slug: "creed-aventus",
    name: "Aventus",
    house: "Creed",
    concentration: "Millesime",
    category: "him",
    price: 495,
    image: "/fragrance/creed-aventus.svg",
    size: "100 ml",
  },
];

// Hero Campaign Advertisement Data (Phase 2.6: Exactly 3 campaigns auto-rotating every 5 seconds)
export const HERO_ROTATION_INTERVAL_MS = 5000;

export interface HeroCampaign {
  id: number;
  eyebrow: string;
  headlineFirst: string;
  headlineSecond: string;
  headlineWord1: string;
  headlineWord2: string;
  description: string;
  ctaText: string;
  ctaTarget: "featured" | "category-unisex" | "category-gift-sets";
  image: string;
  alt: string;
}

export const HERO_CAMPAIGNS: HeroCampaign[] = [
  {
    id: 1,
    eyebrow: "LUXURY • ELEGANCE • EVERYDAY YOU",
    headlineFirst: "Find Your",
    headlineSecond: "Signature Scent",
    headlineWord1: "Signature",
    headlineWord2: "Scent",
    description:
      "Discover iconic fragrances and explore distinctive accords for every occasion. Curated with precision from renowned independent houses and master perfumers.",
    ctaText: "SHOP NOW",
    ctaTarget: "featured",
    image: "/fragrance/hero-sauvage-million.svg",
    alt: "Dior Sauvage and Paco Rabanne 1 Million luxury perfume flacons",
  },
  {
    id: 2,
    eyebrow: "NICHE & ARTISANAL • PRIVATE BLEND",
    headlineFirst: "Haute Parfumerie &",
    headlineSecond: "Artisanal Extraits",
    headlineWord1: "Artisanal",
    headlineWord2: "Extraits",
    description:
      "Immerse in rare botanical extraits, rich smoky ouds, and distinctive unisex accords crafted by visionary master perfumers.",
    ctaText: "EXPLORE NICHE",
    ctaTarget: "category-unisex",
    image: "/fragrance/hero-fragrance.svg",
    alt: "Artisanal private blend and niche perfume flacons",
  },
  {
    id: 3,
    eyebrow: "CURATED COFFRETS • DISCOVERY SETS",
    headlineFirst: "Curated Luxury",
    headlineSecond: "Discovery Sets",
    headlineWord1: "Discovery",
    headlineWord2: "Sets",
    description:
      "Experience iconic fragrance wardrobes before choosing your full flacon. Includes complimentary atomizers and verified authentic vials.",
    ctaText: "DISCOVER SETS",
    ctaTarget: "category-gift-sets",
    image: "/fragrance/discovery-set.svg",
    alt: "Curated fragrance discovery sets and luxury coffrets",
  },
];

/**
 * Phase 2.6 Helper: Formats headline so the final two words are displayed on two separate lines.
 * e.g. "Find Your Signature Scent" -> lead: "Find Your", line2: "Signature", line3: "Scent"
 */
export function getHeadlineLines(campaign: HeroCampaign): {
  leadText: string;
  line2: string;
  line3: string;
} {
  if (campaign.headlineWord1 && campaign.headlineWord2) {
    return {
      leadText: campaign.headlineFirst,
      line2: campaign.headlineWord1,
      line3: campaign.headlineWord2,
    };
  }
  const full = `${campaign.headlineFirst} ${campaign.headlineSecond}`.trim();
  const words = full.split(/\s+/);
  if (words.length >= 2) {
    return {
      leadText: words.slice(0, words.length - 2).join(" "),
      line2: words[words.length - 2],
      line3: words[words.length - 1],
    };
  }
  return {
    leadText: campaign.headlineFirst,
    line2: campaign.headlineSecond,
    line3: "",
  };
}

export default function LandingPage() {
  const navigate = useNavigate();
  const params = useParams<{ tenantSlug?: string }>();
  const [searchParams] = useSearchParams();
  const requestedTenant = params.tenantSlug || searchParams.get("tenant") || undefined;
  const { user, isAuthenticated } = useAuth();

  const storefrontQuery = trpc.company.storefront.useQuery(
    { slug: requestedTenant },
    { retry: false }
  );

  const tenant = storefrontQuery.data?.status === "active" ? storefrontQuery.data.tenant : null;
  const isWebsiteA = Boolean(
    tenant && (tenant.displayLabel === "Website A" || tenant.slug === "the-fragrance-store")
  );
  const storefrontPath = tenant?.slug ? `/store/${tenant.slug}` : "/store/the-fragrance-store";

  const guestCart = useGuestCart();
  const { isOrderActive, activeOrders, activeCount } = usePlacedOrder();
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "him" | "her" | "unisex" | "gift-sets">("all");
  const [isDemoPreviewActive, setIsDemoPreviewActive] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-rotate through exactly 3 hero advertisements every 5 seconds (Phase 2.6)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_CAMPAIGNS.length);
    }, HERO_ROTATION_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  function handleCampaignCta(campaign: HeroCampaign) {
    if (campaign.ctaTarget === "featured") {
      scrollToSection("featured-fragrances-section");
    } else if (campaign.ctaTarget === "category-unisex") {
      handleCategoryClick("unisex");
    } else if (campaign.ctaTarget === "category-gift-sets") {
      handleCategoryClick("gift-sets");
    }
  }
  const utils = trpc.useUtils();

  // Queries - scoped strictly to this tenant's ID
  const productsQuery = trpc.product.list.useQuery(
    {
      supplierId: tenant?.id,
      search: search.trim() || undefined,
      status: "active",
    },
    {
      enabled: !!tenant?.id,
      retry: false,
    }
  );

  const cartQuery = trpc.cart.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const cartCount = isAuthenticated
    ? (cartQuery.data?.count ?? 0)
    : guestCart.items.reduce((acc, item) => acc + item.quantity, 0);

  const addToCart = trpc.cart.add.useMutation({
    onSuccess: async () => {
      await utils.cart.list.invalidate();
      toast.success("Fragrance added to shopping bag.");
    },
    onError: (error) => toast.error(error.message || "Could not add to shopping bag."),
  });

  // Filter raw DB products to ensure zero restaurant/food contamination
  const dbFragranceProducts = useMemo(() => {
    const raw = (productsQuery.data ?? []) as MarketplaceProduct[];
    return raw.filter((product) => !isFoodOrRestaurantProduct(product));
  }, [productsQuery.data]);

  // Filtered illustrative demo items - ONLY for Website A to preserve luxury customer experience
  const filteredDemoProducts = useMemo(() => {
    if (!isWebsiteA) return [];
    let list = [...ILLUSTRATIVE_DEMO_FRAGRANCES];
    if (selectedFilter !== "all") {
      list = list.filter((p) => p.category === selectedFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.house.toLowerCase().includes(q) ||
          p.concentration.toLowerCase().includes(q)
      );
    }
    return list;
  }, [isWebsiteA, selectedFilter, search]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    scrollToSection("featured-fragrances-section");
  }

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleCategoryClick(filterKey: string) {
    setSelectedFilter(filterKey as "him" | "her" | "unisex" | "gift-sets");
    scrollToSection("featured-fragrances-section");
  }

  // Real DB product addition
  function handleAddGenuineProduct(product: MarketplaceProduct) {
    const options = parseProductOptions(product.options);
    if (options.length > 0) {
      navigate(`${storefrontPath}/products/${product.slug}`);
      toast.info("Please select size and concentration.");
      return;
    }

    if (isAuthenticated) {
      addToCart.mutate({ productId: product.id, quantity: 1 });
      return;
    }

    addGuestCartItem({
      id: product.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      productImage: product.image ?? null,
      productUnitType: product.unitType ?? "bottle",
      productUnitSize: product.unitSize ?? "100 ml",
      quantity: 1,
      unitPrice: String(product.unitPrice ?? 0),
    });
    toast.success("Fragrance added to shopping bag.");
  }

  // Demonstration product click handler: Explicitly prevents cart pollution
  function handleIllustrativeDemoClick(item: IllustrativeFragrance) {
    toast.info(
      `${item.house} ${item.name} is an illustrative design preview. Genuine inventory will be purchasable once cataloged.`
    );
  }

  // Loading state
  if (storefrontQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#111111] text-[#FDFBF7] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="h-10 w-10 rounded-xs border border-[#C5A059]/40 bg-[#1B1B1B] p-1 flex items-center justify-center animate-pulse">
          <Sparkles className="h-5 w-5 text-[#C5A059]" />
        </div>
        <p className="text-xs font-serif uppercase tracking-[0.2em] text-[#C5A059]">Curating Fragrance Boutique...</p>
      </div>
    );
  }

  // Unavailable Storefront: Not found
  if (storefrontQuery.data?.status === "not_found") {
    return (
      <div className="min-h-screen bg-[#111111] text-[#FDFBF7] flex flex-col">
        <header className="border-b border-[#262421] px-6 py-4 flex items-center justify-between">
          <Link to="/store/the-fragrance-store" className="flex items-center gap-2">
            <img src="/fragrance/brand-mark.svg" alt="The Fragrance Store" className="h-6 w-6" />
            <span className="font-serif text-sm uppercase tracking-widest text-white">The Fragrance Store</span>
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#1A1A1A] border border-[#262421] p-8 rounded-lg text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <Store className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-serif text-white">Boutique Not Found</h2>
            <p className="text-sm text-neutral-400">
              The boutique storefront you are looking for does not exist or has been relocated.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link to="/store/the-fragrance-store">
                <Button className="w-full bg-[#C5A059] hover:bg-[#D4AF37] text-black font-semibold text-xs tracking-wider uppercase">
                  Return to Main Storefront
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unavailable Storefront: Suspended or inactive
  if (storefrontQuery.data?.status === "suspended") {
    const suspended = storefrontQuery.data.tenant;
    return (
      <div className="min-h-screen bg-[#111111] text-[#FDFBF7] flex flex-col">
        <header className="border-b border-[#262421] px-6 py-4 flex items-center justify-between">
          <Link to="/store/the-fragrance-store" className="flex items-center gap-2">
            <img src="/fragrance/brand-mark.svg" alt="The Fragrance Store" className="h-6 w-6" />
            <span className="font-serif text-sm uppercase tracking-widest text-white">The Fragrance Store</span>
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#1A1A1A] border border-[#262421] p-8 rounded-lg text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400">
                {suspended.displayLabel}
              </span>
              <h2 className="text-xl font-serif text-white">{suspended.name}</h2>
            </div>
            <p className="text-sm text-neutral-400">
              This boutique storefront is currently suspended or undergoing curation. No catalog items are publicly available at this time.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link to="/store/the-fragrance-store">
                <Button className="w-full bg-[#C5A059] hover:bg-[#D4AF37] text-black font-semibold text-xs tracking-wider uppercase">
                  Return to Main Storefront
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] text-[#FDFBF7] flex flex-col font-sans selection:bg-[#C5A059] selection:text-[#111111] pb-24 sm:pb-20">

      {/* ====================================================================== */}
      {/* 1. MOBILE HEADER — SINGLE ROW (MATCHING WIREFRAME)                     */}
      {/* ====================================================================== */}
      <header className="sticky top-0 z-40 bg-[#111111]/98 backdrop-blur-md border-b border-[#262421] text-[#FDFBF7]">
        {/* Main Header Single Row */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* LEFT: [MENU] + [STORE LOGO + WORDMARK] */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* 1. Menu Icon */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-1.5 text-[#FDFBF7] hover:text-[#C5A059] focus:outline-none focus:ring-1 focus:ring-[#C5A059] transition-colors"
              aria-label="Open Navigation Menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* 2. Store Logo + Wordmark */}
            <Link
              to={storefrontPath}
              className="flex items-center gap-2 group"
              aria-label={tenant?.name || "The Fragrance Store - House of Brands"}
            >
              <div className="h-7 w-7 rounded-xs overflow-hidden border border-[#C5A059]/50 bg-[#1B1B1B] p-0.5 shrink-0 group-hover:border-[#C5A059] transition-colors">
                <img
                  src={tenant?.logo || "/fragrance/brand-mark.svg"}
                  alt={tenant?.name || "KTK Monogram Crest"}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-serif text-xs sm:text-base lg:text-lg font-bold tracking-[0.14em] uppercase text-[#FDFBF7] group-hover:text-[#E0C895] transition-colors leading-tight whitespace-nowrap">
                  {tenant?.name || "The Fragrance Store"}
                </span>
                <span className="text-[7.5px] sm:text-[9.5px] tracking-[0.28em] font-sans text-[#C5A059] uppercase leading-none font-semibold whitespace-nowrap">
                  {tenant?.displayLabel ? `${tenant.displayLabel} • House of Brands` : "House of Brands"}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Customer Navigation (Home, Shop, Categories, Cart, Account) */}
          <nav
            aria-label="Desktop Customer Navigation"
            className="hidden md:flex items-center gap-3.5 lg:gap-6 mx-3 text-xs font-sans tracking-wider uppercase"
          >
            <Link
              to={storefrontPath}
              onClick={(e) => {
                if (window.location.pathname === storefrontPath) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="text-[#C5A059] font-semibold hover:text-[#E0C895] transition-colors py-1"
            >
              Home
            </Link>
            <Link
              to={`${storefrontPath}/products`}
              className="text-[#C4BEB3] hover:text-[#FDFBF7] font-medium transition-colors py-1"
            >
              Shop
            </Link>
            <a
              href="#categories-section"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById("categories-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-[#C4BEB3] hover:text-[#FDFBF7] font-medium transition-colors py-1"
            >
              Categories
            </a>
            <Link
              to={`${storefrontPath}/cart`}
              className="text-[#C4BEB3] hover:text-[#FDFBF7] font-medium transition-colors py-1 flex items-center gap-1.5"
            >
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C5A059] px-1 text-[9px] font-bold text-[#111111]">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              to={`${storefrontPath}/account`}
              className="text-[#C4BEB3] hover:text-[#FDFBF7] font-medium transition-colors py-1 flex items-center gap-1"
            >
              <UserRound className="h-3.5 w-3.5 text-[#C5A059]" />
              <span>{isAuthenticated ? (user?.name?.split(" ")[0] ?? "Account") : "Account"}</span>
            </Link>
          </nav>

          {/* 3. FLEXIBLE EMPTY SPACE (Pushes right action icons to the far right edge) */}
          <div className="flex-1 min-w-2" />

          {/* RIGHT: [SEARCH ICON] + [BAG WITH LIVE COUNT] */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Active Orders Tracker if available (Desktop / Tablet) */}
            {isOrderActive && (
              <Link
                to={`/bill?orderId=${encodeURIComponent(activeOrders[0]?.id || "")}`}
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 border border-[#C5A059]/40 bg-[#1B1B1B] text-[#C5A059] hover:bg-[#C5A059]/10 text-[11px] font-medium"
              >
                <span>Orders ({activeCount})</span>
              </Link>
            )}

            {/* Desktop Account Link */}
            <Link
              to={`${storefrontPath}/account`}
              className="hidden lg:flex items-center gap-1.5 text-xs tracking-wider uppercase text-[#C4BEB3] hover:text-[#FDFBF7] transition-colors mr-1"
            >
              <UserRound className="h-4 w-4 text-[#C5A059]" />
              <span className="truncate max-w-[80px]">
                {isAuthenticated ? (user?.name?.split(" ")[0] ?? "Account") : "Sign In"}
              </span>
            </Link>

            {/* 4. Search Icon Button (Toggles search drawer / bar) */}
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen((prev) => {
                  const nextState = !prev;
                  if (nextState) {
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }
                  return nextState;
                });
              }}
              className={`p-2 transition-colors rounded-sm ${
                isSearchOpen
                  ? "text-[#C5A059] bg-[#1E1C19]"
                  : "text-[#FDFBF7] hover:text-[#C5A059]"
              }`}
              aria-label="Toggle Search"
              aria-expanded={isSearchOpen}
            >
              <Search className="h-5 w-5" />
            </button>

            {/* 5. Shopping Bag Icon Button with Live Counter Badge */}
            <Link
              to={`${storefrontPath}/cart`}
              id="header-cart-btn"
              className="relative p-2 text-[#FDFBF7] hover:text-[#C5A059] transition-colors group flex items-center justify-center"
              aria-label={`Shopping Bag (${cartCount} items)`}
            >
              <ShoppingCart className="h-5 w-5 transition-transform group-hover:scale-105" />
              {/* Badge: Visible on bag with clear counter */}
              <span
                className={`absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black leading-none transition-all ${
                  cartCount > 0
                    ? "bg-[#C5A059] text-[#111111]"
                    : "bg-[#2A2723] text-[#A69F94] border border-[#3E3A33]"
                }`}
              >
                {cartCount}
              </span>
            </Link>
          </div>
        </div>

        {/* SEARCH EXPANDABLE BAR (Reveals seamlessly when search icon is clicked or maintains active search query) */}
        {isSearchOpen && (
          <div className="px-3 pb-3 pt-1 border-t border-[#22201D] bg-[#161616] animate-in fade-in duration-150">
            <form onSubmit={handleSearchSubmit} className="relative w-full max-w-7xl mx-auto">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9E978C] pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fragrances, brands, notes..."
                className="h-9 w-full bg-[#1F1F1F] border border-[#2E2C29] pl-9.5 pr-20 text-xs text-[#FDFBF7] placeholder:text-[#888177] focus:outline-none focus:border-[#C5A059] transition-colors"
              />
              {search.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-14 top-1/2 -translate-y-1/2 text-xs text-[#9E978C] hover:text-[#FDFBF7] px-1.5"
                  aria-label="Clear Search"
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-3 bg-[#C5A059] hover:bg-[#D4AF37] text-[#111111] text-[10px] font-bold tracking-wider uppercase transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </header>

      {/* ====================================================================== */}
      {/* MOBILE SLIDE-OUT DRAWER MENU                                            */}
      {/* ====================================================================== */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="relative w-4/5 max-w-sm bg-[#161616] border-r border-[#262421] text-[#FDFBF7] p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#262421]">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-xs overflow-hidden border border-[#C5A059]/50 bg-[#1B1B1B] p-0.5">
                    <img
                      src="/fragrance/brand-mark.svg"
                      alt="Brand Monogram"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <span className="font-serif text-sm font-bold uppercase tracking-wider text-[#FDFBF7]">
                    The Fragrance Store
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-[#9E978C] hover:text-[#FDFBF7]"
                  aria-label="Close Navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="py-5 space-y-4">
                <div className="text-[10px] uppercase tracking-[0.25em] text-[#C5A059] font-bold">
                  Categories
                </div>
                <div className="flex flex-col space-y-2.5 pl-2 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleCategoryClick("him");
                    }}
                    className="text-left font-medium hover:text-[#C5A059] transition-colors py-1 border-b border-[#22201D]"
                  >
                    For Him
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleCategoryClick("her");
                    }}
                    className="text-left font-medium hover:text-[#C5A059] transition-colors py-1 border-b border-[#22201D]"
                  >
                    For Her
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleCategoryClick("unisex");
                    }}
                    className="text-left font-medium hover:text-[#C5A059] transition-colors py-1 border-b border-[#22201D]"
                  >
                    Unisex &amp; Niche
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleCategoryClick("gift-sets");
                    }}
                    className="text-left font-medium hover:text-[#C5A059] transition-colors py-1 border-b border-[#22201D]"
                  >
                    Gift Sets
                  </button>
                </div>

                <div className="pt-3 text-[10px] uppercase tracking-[0.25em] text-[#C5A059] font-bold">
                  Quick Links
                </div>
                <div className="flex flex-col space-y-2 pl-2 text-sm text-[#C4BEB3]">
                  <Link
                    to={storefrontPath}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-[#FDFBF7] py-1"
                  >
                    Home Storefront
                  </Link>
                  <Link
                    to={`${storefrontPath}/products`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-[#FDFBF7] py-1"
                  >
                    All Products Catalog
                  </Link>
                  <Link
                    to={`${storefrontPath}/cart`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-[#FDFBF7] py-1"
                  >
                    Shopping Cart ({cartCount})
                  </Link>
                  <Link
                    to={`${storefrontPath}/about`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-[#FDFBF7] py-1"
                  >
                    About The Store
                  </Link>
                  <Link
                    to={isAuthenticated ? "/dashboard" : "/admin/login"}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-[#FDFBF7] py-1"
                  >
                    {isAuthenticated ? "My Dashboard" : "Account / Sign In"}
                  </Link>
                </div>
              </nav>
            </div>

            <div className="pt-4 border-t border-[#262421] text-xs text-[#8A847C]">
              <p className="font-serif italic text-xs text-[#E0C895]">Discover Your Signature Scent.</p>
              <p className="mt-1">The Fragrance Store — House of Brands</p>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* 2. CINEMATIC HERO BANNER (AUTO-ROTATING 3 CAMPAIGNS, NO INNER BORDERS) */}
      {/* ====================================================================== */}
      {isWebsiteA ? (
        <section className="relative bg-[#101010] text-[#FDFBF7] overflow-hidden border-b border-[#24221F]">
        {/* Subtle radial ambient golden glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_25%,rgba(197,160,89,0.18),rgba(16,16,16,0))]" />
        
        {/* Subtle grain/mesh texture accent */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,16,16,0.95)_0%,rgba(16,16,16,0.7)_50%,rgba(16,16,16,0.4)_100%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-10 lg:py-14 relative z-10">
          
          {/* Eyebrow - Clean luxury typography placed at top across hero per wireframe */}
          <div className="mb-2 sm:mb-3.5 inline-flex items-center gap-1 sm:gap-1.5 text-[8.5px] sm:text-xs tracking-[0.16em] sm:tracking-[0.25em] font-bold uppercase text-[#C5A059]">
            <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-[#E0C895] shrink-0" />
            <span className="truncate">{HERO_CAMPAIGNS[activeSlide]?.eyebrow}</span>
          </div>

          <div className="grid grid-cols-12 gap-2 sm:gap-6 lg:gap-10 items-center">
            
            {/* Left Hero Content: ~40% width (col-span-5) */}
            <div className="col-span-5 sm:col-span-5 lg:col-span-5 text-left space-y-2 sm:space-y-4 pr-1 sm:pr-0">
              
              {/* Headline — Phase 2.6: Display final two words of each campaign on two separate lines */}
              {(() => {
                const { leadText, line2, line3 } = getHeadlineLines(
                  HERO_CAMPAIGNS[activeSlide] ?? HERO_CAMPAIGNS[0]
                );
                return (
                  <h1 className="font-serif text-lg sm:text-2xl md:text-3xl lg:text-5xl font-medium tracking-tight text-[#FDFBF7] leading-[1.12]">
                    {leadText && (
                      <span className="block text-[#FDFBF7]">{leadText}</span>
                    )}
                    <span className="block italic font-normal text-[#E0C895]">
                      {line2}
                    </span>
                    <span className="block italic font-normal text-[#E0C895]">
                      {line3}
                    </span>
                  </h1>
                );
              })()}

              {/* Description */}
              <p className="text-[9.5px] sm:text-xs lg:text-sm text-[#B8B1A2] font-normal leading-relaxed line-clamp-3 sm:line-clamp-none max-w-xs min-h-[2.4rem] sm:min-h-0">
                {HERO_CAMPAIGNS[activeSlide]?.description}
              </p>

              {/* Primary Action Button: [ SHOP NOW -> ] */}
              <div className="pt-0.5 sm:pt-1 flex flex-wrap items-center gap-2 sm:gap-3">
                <Button
                  onClick={() => handleCampaignCta(HERO_CAMPAIGNS[activeSlide] ?? HERO_CAMPAIGNS[0])}
                  className="h-7 sm:h-11 px-3 sm:px-8 bg-[#C5A059] hover:bg-[#D4AF37] text-[#111111] font-bold text-[9px] sm:text-xs tracking-[0.14em] uppercase rounded-none transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-1 sm:gap-1.5"
                >
                  <span>{HERO_CAMPAIGNS[activeSlide]?.ctaText ?? "SHOP NOW"}</span>
                  <ArrowRight className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => scrollToSection("categories-section")}
                  className="hidden sm:inline-flex h-8 sm:h-11 px-4 sm:px-6 border border-[#3A352F] bg-[#181818] text-[#FDFBF7] hover:bg-[#222222] hover:border-[#C5A059] font-medium text-[10px] sm:text-xs tracking-[0.14em] uppercase rounded-none transition-colors"
                >
                  Categories
                </Button>
              </div>

              {/* Auto-Rotating 3 Campaign Carousel Indicators (5-second cycle) */}
              <div className="pt-0.5 sm:pt-1.5 flex items-center gap-1.5" aria-label="Hero Carousel Navigation">
                {HERO_CAMPAIGNS.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={`h-1 sm:h-1.5 transition-all duration-300 rounded-full ${
                      activeSlide === idx ? "w-5 sm:w-7 bg-[#C5A059]" : "w-1.5 sm:w-2 bg-[#3A3835] hover:bg-[#5A554C]"
                    }`}
                    aria-label={`Go to hero slide ${idx + 1}`}
                    aria-current={activeSlide === idx ? "true" : undefined}
                  />
                ))}
              </div>
            </div>

            {/* Right Hero Perfume Showcase: ~60% width (col-span-7) — LARGE, PROMINENT, CLEAR, NO INNER BORDER */}
            <div className="col-span-7 sm:col-span-7 lg:col-span-7 flex justify-center sm:justify-end items-center">
              <div className="relative w-full aspect-[5/4] sm:aspect-[4/3] rounded-xs overflow-hidden flex items-center justify-center sm:justify-end">
                <img
                  key={HERO_CAMPAIGNS[activeSlide]?.image}
                  src={HERO_CAMPAIGNS[activeSlide]?.image}
                  alt={HERO_CAMPAIGNS[activeSlide]?.alt}
                  className="w-full h-full object-contain object-center sm:object-right transition-all duration-700 animate-in fade-in drop-shadow-xl"
                />
              </div>
            </div>

          </div>
        </div>
        </section>
      ) : (
        <section className="relative bg-[#101010] text-[#FDFBF7] overflow-hidden border-b border-[#24221F] py-10 sm:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_25%,rgba(197,160,89,0.18),rgba(16,16,16,0))]" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-3">
            <span className="text-[10px] sm:text-xs font-mono tracking-[0.25em] uppercase text-[#C5A059] font-bold">
              {tenant?.displayLabel} • Boutique Storefront
            </span>
            <h1 className="font-serif text-2xl sm:text-4xl text-[#FDFBF7] font-medium tracking-tight">
              {tenant?.name}
            </h1>
            {tenant?.description && (
              <p className="text-xs sm:text-sm text-[#A8A196] max-w-lg mx-auto leading-relaxed">
                {tenant.description}
              </p>
            )}
            <div className="pt-2">
              <Button
                onClick={() => scrollToSection("featured-fragrances-section")}
                className="h-10 px-6 bg-[#C5A059] hover:bg-[#D4AF37] text-[#111111] font-bold text-xs tracking-wider uppercase rounded-none"
              >
                Browse Fragrances
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ====================================================================== */}
      {/* 3. SHOP BY CATEGORY (2-COLUMN MOBILE GRID PER ASCII)                   */}
      {/* ====================================================================== */}
      <section
        id="categories-section"
        className="py-10 sm:py-14 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full border-b border-[#262421]"
      >
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-10">
          <span className="text-[10px] sm:text-xs tracking-[0.25em] uppercase text-[#C5A059] font-bold block mb-1">
            Collections
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-[#FDFBF7]">
            Shop by Category
          </h2>
        </div>

        {/* 2-Column Mobile Grid matching wireframe: [FOR HIM] [FOR HER] / [UNISEX] [GIFT SETS] */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {FRAGRANCE_CATEGORIES.map((category) => (
            <div
              key={category.id}
              onClick={() => handleCategoryClick(category.filterKey)}
              className="group cursor-pointer flex flex-col items-center text-center p-3 sm:p-5 bg-[#181818] border border-[#2E2C29] hover:border-[#C5A059] transition-all duration-300 shadow-xs hover:shadow-md"
            >
              {/* Category Image */}
              <div className="relative w-22 h-22 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full overflow-hidden border border-[#C5A059]/40 p-1 bg-[#111111] group-hover:border-[#C5A059] group-hover:scale-105 transition-all duration-300">
                <img
                  src={category.image}
                  alt={category.title}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              {/* Name */}
              <h3 className="mt-3 font-serif text-base sm:text-lg font-semibold text-[#FDFBF7] group-hover:text-[#E0C895] transition-colors leading-tight">
                {category.title}
              </h3>

              {/* Description */}
              <p className="mt-1 text-[11px] sm:text-xs text-[#9E978C] line-clamp-2 leading-relaxed">
                {category.subtitle}
              </p>

              {/* Tap action */}
              <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#C5A059] group-hover:text-[#FDFBF7] transition-colors">
                <span>View</span>
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================== */}
      {/* 4. BRAND PROMOTION BANNER                                              */}
      {/* ====================================================================== */}
      <section
        id="brands-banner"
        className="py-10 sm:py-16 bg-[#161616] border-b border-[#262421]"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-center">
            
            {/* Collection Image */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="relative aspect-[16/10] sm:aspect-[3/2] rounded-xs overflow-hidden border border-[#C5A059]/40 bg-[#111111] shadow-lg">
                <img
                  src="/fragrance/banner-brands.svg"
                  alt="Curated perfume flacons collection"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/70 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Text & Button per wireframe:
                Premium Brands Under One Roof
                Explore distinctive fragrances
                [ EXPLORE BRANDS -> ] */}
            <div className="lg:col-span-6 space-y-4 text-center lg:text-left order-1 lg:order-2">
              <span className="text-[10px] sm:text-xs tracking-[0.25em] uppercase text-[#C5A059] font-bold block">
                Brand Promotion
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-[#FDFBF7] leading-tight">
                Premium Brands Under One Roof
              </h2>
              <p className="text-xs sm:text-sm text-[#A8A196] leading-relaxed max-w-lg mx-auto lg:mx-0">
                Explore distinctive fragrances and iconic bottles from renowned world perfume houses.
              </p>
              
              <div className="pt-1">
                <Button
                  onClick={() => scrollToSection("featured-fragrances-section")}
                  className="w-full sm:w-auto h-11 px-7 bg-[#C5A059] hover:bg-[#D4AF37] text-[#111111] font-bold text-xs tracking-[0.16em] uppercase rounded-none transition-all flex items-center justify-center gap-2"
                >
                  <span>EXPLORE BRANDS</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* 5. FEATURED FRAGRANCES (2-COLUMN MOBILE CARDS + VIEW ALL)              */}
      {/* ====================================================================== */}
      <section
        id="featured-fragrances-section"
        className="py-10 sm:py-16 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full border-b border-[#262421]"
      >
        {/* Section Header: FEATURED FRAGRANCES on left, [VIEW ALL] on right */}
        <div className="flex items-center justify-between pb-6 border-b border-[#262421] gap-3">
          <div>
            <h2 className="font-serif text-xl sm:text-3xl font-medium tracking-tight text-[#FDFBF7]">
              Featured Fragrances
            </h2>
            <p className="text-[11px] sm:text-xs text-[#9E978C] mt-0.5">
              Curated bottles and distinctive accords.
            </p>
          </div>

          <Link
            to={`${storefrontPath}/products`}
            className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold tracking-widest uppercase text-[#C5A059] hover:text-[#E0C895] transition-colors shrink-0"
          >
            <span>VIEW ALL</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 py-4 overflow-x-auto no-scrollbar">
          {(["all", "him", "her", "unisex", "gift-sets"] as const).map((key) => {
            const labels: Record<string, string> = {
              all: "All",
              him: "For Him",
              her: "For Her",
              unisex: "Unisex",
              "gift-sets": "Gift Sets",
            };
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedFilter(key)}
                className={`px-3 py-1.5 text-xs tracking-wider uppercase whitespace-nowrap transition-colors ${
                  selectedFilter === key
                    ? "bg-[#C5A059] text-[#111111] font-bold"
                    : "bg-[#1C1C1C] text-[#C4BEB3] hover:text-[#FDFBF7] border border-[#2E2C29]"
                }`}
              >
                {labels[key]}
              </button>
            );
          })}
        </div>

        {/* Product Cards Grid: 2 columns on phones (per ASCII) */}
        <div className="pt-2">
          
          {/* A. If real DB fragrance products exist, render them */}
          {dbFragranceProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {dbFragranceProducts.map((product) => {
                const price = toNumber(product.unitPrice);
                return (
                  <div
                    key={product.id}
                    className="group flex flex-col justify-between bg-white text-[#111111] rounded-none overflow-hidden border border-[#E4E0D8] hover:border-[#C5A059] transition-all shadow-xs"
                  >
                    <Link
                      to={`${storefrontPath}/products/${product.slug}`}
                      className="relative aspect-square bg-[#0E0D0B] overflow-hidden block"
                    >
                      <img
                        src={resolveProductImageUrl(product.image ?? "/fragrance/hero-fragrance.svg")}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute bottom-2 right-2 bg-black/80 text-[#FDFBF7] text-[8.5px] font-mono px-1.5 py-0.5">
                        {product.unitSize ?? "100 ml"}
                      </span>
                    </Link>

                    <div className="p-3 sm:p-4 flex flex-col justify-between flex-1 bg-[#FDFBF7]">
                      <div>
                        <span className="text-[9px] tracking-[0.2em] uppercase text-[#9E7B35] font-bold block">
                          {product.categoryName ?? "Parfum"}
                        </span>
                        <Link to={`${storefrontPath}/products/${product.slug}`}>
                          <h3 className="font-serif text-sm sm:text-base font-medium text-[#111111] group-hover:text-[#9E7B35] transition-colors line-clamp-1 mt-0.5">
                            {product.name}
                          </h3>
                        </Link>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#E4E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-sm sm:text-base font-bold text-[#111111] font-mono tabular-nums">
                          {formatCurrency(price)}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleAddGenuineProduct(product)}
                          className="w-full sm:w-auto h-8 px-2.5 bg-[#111111] hover:bg-[#C5A059] hover:text-[#111111] text-[#FDFBF7] text-[10px] uppercase font-bold tracking-wider rounded-none transition-colors"
                        >
                          ADD TO BAG
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !isWebsiteA ? (
            /* Tenant without products: Render clean boutique empty state, NEVER merge products */
            <div className="border border-[#2E2C29] bg-[#161616] p-8 text-center max-w-xl mx-auto space-y-3">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[#222222] text-[#C5A059] mx-auto">
                <Store className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-medium text-[#FDFBF7]">
                {tenant?.name || "Boutique"} Catalog
              </h3>
              <p className="text-xs text-[#9E978C] max-w-sm mx-auto">
                No fragrances are currently published for this boutique. Products added by the shop owner will appear here live.
              </p>
            </div>
          ) : (
            /* B. Strict catalog rule implementation for Website A:
               Real DB contains zero fragrance products.
               Provide polished catalog staging status + explicit demo preview mode */
            <div className="space-y-6">
              {/* Catalog Staging Notice */}
              <div className="border border-[#2E2C29] bg-[#161616] p-5 sm:p-7 text-center max-w-2xl mx-auto">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[#222222] text-[#C5A059] mb-3">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg sm:text-xl font-medium text-[#FDFBF7]">
                  Curating Official Fragrance Inventory
                </h3>
                <p className="mt-1.5 text-xs text-[#9E978C] leading-relaxed max-w-md mx-auto">
                  Our team is cataloging genuine perfume flacons and discovery sets for The Fragrance Store. Genuine products published to the database will appear here live.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDemoPreviewActive((prev) => !prev)}
                    className="text-xs font-semibold text-[#C5A059] underline hover:text-[#E0C895] transition-colors cursor-pointer"
                  >
                    {isDemoPreviewActive ? "Hide Layout Preview" : "Show Illustrative Layout Preview"}
                  </button>
                </div>
              </div>

              {/* Illustrative Demo Mode (Strictly labeled to prevent fake inventory or checkout) */}
              {isDemoPreviewActive && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#9E978C] px-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#C5A059]">
                      Illustrative Layout Preview (Not for Sale)
                    </span>
                    <span className="text-[10px] text-[#777777]">
                      Demonstrates 2-column mobile card styling
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                    {filteredDemoProducts.map((item) => (
                      <div
                        key={item.id}
                        className="group flex flex-col justify-between bg-white text-[#111111] rounded-none overflow-hidden border border-[#E4E0D8] hover:border-[#C5A059] transition-all shadow-xs"
                      >
                        {/* Image */}
                        <div className="relative aspect-square bg-[#0E0D0B] overflow-hidden">
                          <img
                            src={item.image}
                            alt={`${item.house} ${item.name}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <span className="absolute top-2 left-2 bg-[#111111] text-[#E0C895] text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-[#C5A059]/40">
                            DEMO
                          </span>
                          <span className="absolute bottom-2 right-2 bg-black/80 text-[#FDFBF7] text-[8.5px] font-mono px-1.5 py-0.5">
                            {item.size}
                          </span>
                        </div>

                        {/* Card Content in clean Warm Ivory / White */}
                        <div className="p-3 sm:p-4 flex flex-col justify-between flex-1 bg-[#FDFBF7]">
                          <div>
                            <span className="text-[9px] tracking-[0.2em] uppercase text-[#9E7B35] font-bold block">
                              {item.house}
                            </span>
                            <h3 className="font-serif text-sm sm:text-base font-medium text-[#111111] group-hover:text-[#9E7B35] transition-colors line-clamp-1 mt-0.5">
                              {item.name}
                            </h3>
                            <p className="text-[10.5px] text-[#666666] line-clamp-1 mt-0.5">
                              {item.concentration}
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-[#E4E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-sm sm:text-base font-bold text-[#111111] font-mono tabular-nums">
                              {formatCurrency(item.price)}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleIllustrativeDemoClick(item)}
                              className="w-full sm:w-auto h-8 px-2.5 bg-[#111111] hover:bg-[#C5A059] hover:text-[#111111] text-[#FDFBF7] text-[10px] uppercase font-bold tracking-wider rounded-none transition-colors"
                            >
                              ADD TO BAG
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* More products link per wireframe: [More products ->] */}
          <div className="pt-6 text-center">
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-[#C5A059] hover:text-[#E0C895] transition-colors"
            >
              <span>More products</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* 6. WHY SHOP WITH US? (4 BALANCED ITEMS IN 2-COL MOBILE GRID)           */}
      {/* ====================================================================== */}
      <section className="py-10 sm:py-14 bg-[#141414] border-b border-[#262421]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
            <span className="text-[10px] sm:text-xs tracking-[0.25em] uppercase text-[#C5A059] font-bold block mb-1">
              Store Commitments
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-[#FDFBF7]">
              Why Shop With Us?
            </h2>
          </div>

          {/* 4 items matching ASCII wireframe:
              [SHIELD] Authenticity / Provenance
              [GEM]    Premium Brands
              [GIFT]   Gift-Ready Packaging
              [HELP]   Customer Assistance */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            
            {/* 1. Shield: Authenticity and Provenance */}
            <div className="p-4 sm:p-5 bg-[#1A1A1A] border border-[#2E2C29] flex flex-col items-center text-center">
              <div className="h-9 w-9 rounded-xs bg-[#242424] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] mb-3">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-sm sm:text-base font-semibold text-[#FDFBF7]">
                Authenticity &amp; Provenance
              </h3>
              <p className="text-[11px] text-[#8E877C] mt-1 leading-relaxed">
                Carefully inspected flacons sourced with verified batch provenance.
              </p>
            </div>

            {/* 2. Gem: Premium Brands */}
            <div className="p-4 sm:p-5 bg-[#1A1A1A] border border-[#2E2C29] flex flex-col items-center text-center">
              <div className="h-9 w-9 rounded-xs bg-[#242424] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] mb-3">
                <Gem className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-sm sm:text-base font-semibold text-[#FDFBF7]">
                Premium Brands
              </h3>
              <p className="text-[11px] text-[#8E877C] mt-1 leading-relaxed">
                A distinguished selection of designer icons and bespoke niche creations.
              </p>
            </div>

            {/* 3. Gift: Gift-Ready Packaging */}
            <div className="p-4 sm:p-5 bg-[#1A1A1A] border border-[#2E2C29] flex flex-col items-center text-center">
              <div className="h-9 w-9 rounded-xs bg-[#242424] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] mb-3">
                <Gift className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-sm sm:text-base font-semibold text-[#FDFBF7]">
                Gift-Ready Packaging
              </h3>
              <p className="text-[11px] text-[#8E877C] mt-1 leading-relaxed">
                Elegantly boxed presentation prepared with attention to fine detail.
              </p>
            </div>

            {/* 4. Help: Customer Assistance */}
            <div className="p-4 sm:p-5 bg-[#1A1A1A] border border-[#2E2C29] flex flex-col items-center text-center">
              <div className="h-9 w-9 rounded-xs bg-[#242424] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] mb-3">
                <Headphones className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-sm sm:text-base font-semibold text-[#FDFBF7]">
                Customer Assistance
              </h3>
              <p className="text-[11px] text-[#8E877C] mt-1 leading-relaxed">
                Dedicated advisory for fragrance inquiries, notes, and orders.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* 7. REFINED LUXURY FOOTER                                               */}
      {/* ====================================================================== */}
      <footer className="bg-[#0D0D0D] text-[#FDFBF7] pt-10 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-[#262421]">
            <div className="space-y-2">
              <span className="font-serif text-base font-bold tracking-[0.16em] uppercase text-[#FDFBF7] block">
                The Fragrance Store
              </span>
              <span className="text-[9px] tracking-[0.3em] font-sans text-[#C5A059] uppercase block font-semibold">
                House of Brands
              </span>
              <p className="text-xs text-[#8E877C] leading-relaxed pt-1">
                Discover your signature scent from our library of designer flacons and niche extraits.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#E0C895] block">
                Categories
              </span>
              <ul className="space-y-1.5 text-xs text-[#A8A196]">
                <li><button type="button" onClick={() => handleCategoryClick("him")} className="hover:text-[#FDFBF7]">For Him</button></li>
                <li><button type="button" onClick={() => handleCategoryClick("her")} className="hover:text-[#FDFBF7]">For Her</button></li>
                <li><button type="button" onClick={() => handleCategoryClick("unisex")} className="hover:text-[#FDFBF7]">Unisex &amp; Niche</button></li>
                <li><button type="button" onClick={() => handleCategoryClick("gift-sets")} className="hover:text-[#FDFBF7]">Gift Sets</button></li>
              </ul>
            </div>

            <div className="space-y-2">
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#E0C895] block">
                Navigation
              </span>
              <ul className="space-y-1.5 text-xs text-[#A8A196]">
                <li><Link to={storefrontPath} className="hover:text-[#FDFBF7]">Home</Link></li>
                <li><Link to={`${storefrontPath}/products`} className="hover:text-[#FDFBF7]">Shop All</Link></li>
                <li><Link to={`${storefrontPath}/cart`} className="hover:text-[#FDFBF7]">Cart ({cartCount})</Link></li>
                <li><Link to={`${storefrontPath}/about`} className="hover:text-[#FDFBF7]">About Store</Link></li>
                <li>
                  <Link to="/admin/login" className="hover:text-[#FDFBF7]">
                    Staff / Admin Sign In
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#E0C895] block">
                Advisory
              </span>
              <p className="text-xs text-[#8E877C] leading-relaxed">
                Need guidance selecting a bespoke fragrance? Explore notes and families on our About page.
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7A746B]">
            <p>© {new Date().getFullYear()} The Fragrance Store — House of Brands. All rights reserved.</p>
            <p className="tracking-[0.2em] uppercase text-[10px] text-[#C5A059]">Discover Your Signature Scent</p>
          </div>
        </div>
      </footer>

      {/* Orders Modal */}
      <ActiveOrdersModal
        isOpen={isOrdersModalOpen}
        onClose={() => setIsOrdersModalOpen(false)}
        orders={activeOrders}
      />

      {/* ====================================================================== */}
      {/* 8. FIXED MOBILE BOTTOM NAVIGATION                                      */}
      {/* ====================================================================== */}
      <CustomerBottomNav active="home" storefrontPath={storefrontPath} />
    </div>
  );
}
