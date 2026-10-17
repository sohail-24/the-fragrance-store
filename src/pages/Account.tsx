import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  User,
  UserRound,
  X,
} from "lucide-react";
import { trpc, setStoredCustomerToken } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";
import { toast } from "sonner";

export default function Account() {
  const params = useParams<{ tenantSlug?: string }>();
  const tenantSlug = params.tenantSlug || "the-fragrance-store";
  const storefrontPath = `/store/${tenantSlug}`;

  const storefrontQuery = trpc.company.storefront.useQuery(
    { slug: params.tenantSlug },
    { enabled: !!params.tenantSlug, retry: false }
  );
  const tenant =
    storefrontQuery.data?.status === "active"
      ? storefrontQuery.data.tenant
      : null;

  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const utils = trpc.useUtils();

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);

  // Register Form State
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Mutations
  const loginMutation = trpc.auth.loginCustomer.useMutation({
    onSuccess: async (data) => {
      if (data.token) {
        setStoredCustomerToken(data.token);
      }
      setSignInEmail("");
      setSignInPassword("");
      setSignInError(null);
      await utils.auth.me.invalidate();
      await utils.cart.invalidate();
      toast.success("Welcome back. Signed in successfully.");
    },
    onError: (err) => {
      setSignInError(err.message || "Invalid email or password.");
    },
  });

  const registerMutation = trpc.auth.registerCustomer.useMutation({
    onSuccess: async (data) => {
      if (data.token) {
        setStoredCustomerToken(data.token);
      }
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");
      setRegisterError(null);
      await utils.auth.me.invalidate();
      await utils.cart.invalidate();
      toast.success("Account created successfully. Welcome to The Fragrance Store.");
    },
    onError: (err) => {
      setRegisterError(err.message || "Failed to create account. Please try again.");
    },
  });

  const isSubmitting = loginMutation.isPending || registerMutation.isPending;

  function handleSignInSubmit(e: FormEvent) {
    e.preventDefault();
    setSignInError(null);

    const email = signInEmail.trim().toLowerCase();
    if (!email) {
      setSignInError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSignInError("Please enter a valid email address.");
      return;
    }
    if (!signInPassword) {
      setSignInError("Please enter your password.");
      return;
    }

    loginMutation.mutate({
      email,
      password: signInPassword,
      tenantSlug,
    });
  }

  function handleRegisterSubmit(e: FormEvent) {
    e.preventDefault();
    setRegisterError(null);

    const email = registerEmail.trim().toLowerCase();
    if (!email) {
      setRegisterError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setRegisterError("Please enter a valid email address format.");
      return;
    }
    if (registerPassword.length < 6) {
      setRegisterError("Password must be at least 6 characters long.");
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setRegisterError("Passwords do not match. Please re-enter.");
      return;
    }

    registerMutation.mutate({
      email,
      password: registerPassword,
      confirmPassword: registerConfirmPassword,
      tenantSlug,
    });
  }

  // Boutique Not Found state
  if (params.tenantSlug && storefrontQuery.data?.status === "not_found") {
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
              The boutique storefront you are looking for does not exist.
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
    <div className="min-h-screen bg-[#0C0A09] text-[#FDFBF7] flex flex-col font-sans selection:bg-[#C5A059] selection:text-[#111111]">
      {/* Editorial Announcement Bar */}
      <div className="bg-[#111111] text-[#E0C895] text-[11px] sm:text-xs tracking-[0.2em] uppercase py-2 px-4 text-center border-b border-[#262421] font-medium">
        {tenant?.name || "The Fragrance Store"} — {tenant?.displayLabel ? `${tenant.displayLabel} • House of Brands` : "House of Brands"}
      </div>

      {/* Main Luxury Header */}
      <header className="sticky top-0 z-40 bg-[#111111]/95 backdrop-blur-md border-b border-[#262421] text-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <Link
            to={storefrontPath}
            id="back-to-home-link"
            className="flex items-center gap-3 group shrink-0 whitespace-nowrap"
            aria-label={tenant?.name || "The Fragrance Store - House of Brands"}
          >
            <div className="h-9 w-9 rounded-md overflow-hidden border border-[#C5A059]/40 bg-[#1B1B1B] p-0.5 shadow-sm group-hover:border-[#C5A059] transition-colors">
              <img
                src={tenant?.logo || "/fragrance/brand-mark.svg"}
                alt={tenant?.name || "The Fragrance Store Monogram"}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-base sm:text-lg font-bold tracking-[0.16em] uppercase text-[#FDFBF7] group-hover:text-[#E0C895] transition-colors leading-none">
                {tenant?.name || "The Fragrance Store"}
              </span>
              <span className="text-[9px] sm:text-[9.5px] tracking-[0.26em] font-sans text-[#C5A059] uppercase mt-1 leading-none font-medium">
                Customer Account
              </span>
            </div>
          </Link>

          {/* Desktop Back link */}
          <Link
            to={storefrontPath}
            className="text-xs tracking-wider uppercase text-[#C4BEB3] hover:text-[#C5A059] transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-16 pb-28 md:pb-16 relative">
        {/* Subtle decorative background glow */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C5A059]/5 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="w-full max-w-md relative z-10">
          {/* Top Brand Monogram Crest */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#181614] border border-[#C5A059]/30 text-[#C5A059] shadow-inner mb-3">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal tracking-wide text-[#FDFBF7]">
              {isAuthenticated ? "My Account" : mode === "signin" ? "Sign In" : "Create Account"}
            </h1>
            <p className="text-xs sm:text-sm text-[#9E978C] mt-1.5 font-light">
              {isAuthenticated
                ? "Manage your luxury fragrance account and orders"
                : mode === "signin"
                ? "Access your saved fragrances, orders, and privileges"
                : "Join the House of Brands for an exclusive fragrance experience"}
            </p>
          </div>

          {/* ======================================================== */}
          {/* AUTHENTICATED STATE: CUSTOMER PROFILE OVERVIEW           */}
          {/* ======================================================== */}
          {isAuthenticated && user ? (
            <Card className="bg-[#141210] border-[#2A2621] shadow-2xl text-[#FDFBF7]">
              <CardHeader className="border-b border-[#221F1B] pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-full bg-[#24211D] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-serif text-[#FDFBF7] truncate">
                      {user.name || "Fragrance Connoisseur"}
                    </CardTitle>
                    <p className="text-xs text-[#9E978C] truncate font-mono mt-0.5">
                      {user.email}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 text-[10px] tracking-wider uppercase font-semibold text-[#C5A059] bg-[#C5A059]/10 border border-[#C5A059]/30 px-2 py-0.5 rounded-full shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Member</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-5">
                {/* Account details info card */}
                <div className="bg-[#1A1815] border border-[#2C2822] rounded-md p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[#9E978C]">
                    <span>Account Type</span>
                    <span className="text-[#FDFBF7] font-medium">Storefront Customer</span>
                  </div>
                  <div className="flex items-center justify-between text-[#9E978C]">
                    <span>Boutique</span>
                    <span className="text-[#C5A059] font-medium">{tenant?.name || "The Fragrance Store"}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#9E978C]">
                    <span>Security Status</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Protected
                    </span>
                  </div>
                </div>

                {/* Quick Storefront Actions */}
                <div className="space-y-2.5 pt-2">
                  <Link to={`${storefrontPath}/products`} className="block">
                    <Button
                      variant="outline"
                      className="w-full justify-between h-11 border-[#2C2822] bg-[#171513] hover:bg-[#201D1A] text-[#FDFBF7] hover:text-[#C5A059] text-xs tracking-wider uppercase"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#C5A059]" />
                        Explore Fragrance Collection
                      </span>
                      <span>→</span>
                    </Button>
                  </Link>

                  <Link to={`${storefrontPath}/cart`} className="block">
                    <Button
                      variant="outline"
                      className="w-full justify-between h-11 border-[#2C2822] bg-[#171513] hover:bg-[#201D1A] text-[#FDFBF7] hover:text-[#C5A059] text-xs tracking-wider uppercase"
                    >
                      <span className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-[#C5A059]" />
                        View Shopping Bag
                      </span>
                      <span>→</span>
                    </Button>
                  </Link>

                  <Link to={storefrontPath} className="block">
                    <Button
                      variant="outline"
                      className="w-full justify-between h-11 border-[#2C2822] bg-[#171513] hover:bg-[#201D1A] text-[#FDFBF7] hover:text-[#C5A059] text-xs tracking-wider uppercase"
                    >
                      <span className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-[#C5A059]" />
                        Return to Storefront
                      </span>
                      <span>→</span>
                    </Button>
                  </Link>
                </div>

                {/* Sign Out Button */}
                <div className="pt-4 border-t border-[#221F1B]">
                  <Button
                    onClick={() => logout()}
                    variant="ghost"
                    className="w-full h-10 text-[#9E978C] hover:text-rose-400 hover:bg-rose-950/20 text-xs tracking-wider uppercase flex items-center justify-center gap-2"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out of Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* ======================================================== */
            /* UNAUTHENTICATED STATE: SIGN IN / CREATE ACCOUNT TABS     */
            /* ======================================================== */
            <Card className="bg-[#141210] border-[#2A2621] shadow-2xl text-[#FDFBF7]">
              {/* Tab Selector: Sign In vs Create Account */}
              <div className="grid grid-cols-2 border-b border-[#24211C] bg-[#110F0D]">
                <button
                  type="button"
                  id="tab-signin"
                  onClick={() => {
                    setMode("signin");
                    setSignInError(null);
                  }}
                  className={`py-3.5 text-xs tracking-widest uppercase font-medium transition-all relative ${
                    mode === "signin"
                      ? "text-[#C5A059] bg-[#161412] font-semibold"
                      : "text-[#9E978C] hover:text-[#FDFBF7]"
                  }`}
                >
                  Sign In
                  {mode === "signin" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C5A059]" />
                  )}
                </button>
                <button
                  type="button"
                  id="tab-register"
                  onClick={() => {
                    setMode("register");
                    setRegisterError(null);
                  }}
                  className={`py-3.5 text-xs tracking-widest uppercase font-medium transition-all relative ${
                    mode === "register"
                      ? "text-[#C5A059] bg-[#161412] font-semibold"
                      : "text-[#9E978C] hover:text-[#FDFBF7]"
                  }`}
                >
                  Create Account
                  {mode === "register" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C5A059]" />
                  )}
                </button>
              </div>

              <CardContent className="pt-6 sm:p-8 space-y-6">
                {/* ──────────────────────────────────────────────────────── */}
                {/* SIGN IN FORM                                            */}
                {/* ──────────────────────────────────────────────────────── */}
                {mode === "signin" && (
                  <form onSubmit={handleSignInSubmit} className="space-y-4.5" noValidate>
                    {signInError && (
                      <div
                        role="alert"
                        className="p-3 rounded-md bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs leading-relaxed flex items-start gap-2"
                      >
                        <Info className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                        <span>{signInError}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="signin-email"
                        className="text-xs uppercase tracking-wider text-[#C4BEB3] font-medium"
                      >
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E978C]" />
                        <Input
                          id="signin-email"
                          type="email"
                          autoComplete="email"
                          required
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          placeholder="client@luxuryfragrance.com"
                          className="pl-10 h-11 bg-[#1A1815] border-[#2C2822] text-[#FDFBF7] placeholder:text-[#635D54] focus-visible:border-[#C5A059] focus-visible:ring-1 focus-visible:ring-[#C5A059]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="signin-password"
                          className="text-xs uppercase tracking-wider text-[#C4BEB3] font-medium"
                        >
                          Password
                        </Label>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E978C]" />
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          required
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-10 pr-10 h-11 bg-[#1A1815] border-[#2C2822] text-[#FDFBF7] placeholder:text-[#635D54] focus-visible:border-[#C5A059] focus-visible:ring-1 focus-visible:ring-[#C5A059]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9E978C] hover:text-[#FDFBF7] transition-colors p-1"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      id="signin-submit-button"
                      disabled={isSubmitting}
                      className="w-full h-11 mt-2 bg-[#C5A059] hover:bg-[#D4AF37] text-[#111111] font-semibold text-xs tracking-widest uppercase transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Signing In...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>

                    {/* Divider */}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#262421]" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-[#9E978C]">
                        <span className="bg-[#141210] px-3 font-medium">Or</span>
                      </div>
                    </div>

                    {/* Continue with Google */}
                    <Button
                      type="button"
                      id="google-signin-button"
                      onClick={() => setShowGoogleModal(true)}
                      variant="outline"
                      className="w-full h-11 border-[#2C2822] bg-[#181614] hover:bg-[#201D1A] text-[#FDFBF7] hover:text-[#C5A059] text-xs font-medium tracking-wide flex items-center justify-center gap-2.5 transition-colors"
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.1 7.5 23 12 23z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </Button>

                    {/* Switch to Create Account */}
                    <div className="pt-2 text-center text-xs text-[#9E978C]">
                      <span>New to The Fragrance Store? </span>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("register");
                          setSignInError(null);
                        }}
                        className="text-[#C5A059] hover:underline font-medium ml-1 transition-colors"
                      >
                        Create an account
                      </button>
                    </div>
                  </form>
                )}

                {/* ──────────────────────────────────────────────────────── */}
                {/* CREATE ACCOUNT FORM                                     */}
                {/* ──────────────────────────────────────────────────────── */}
                {mode === "register" && (
                  <form onSubmit={handleRegisterSubmit} className="space-y-4" noValidate>
                    {registerError && (
                      <div
                        role="alert"
                        className="p-3 rounded-md bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs leading-relaxed flex items-start gap-2"
                      >
                        <Info className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                        <span>{registerError}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="register-email"
                        className="text-xs uppercase tracking-wider text-[#C4BEB3] font-medium"
                      >
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E978C]" />
                        <Input
                          id="register-email"
                          type="email"
                          autoComplete="email"
                          required
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          placeholder="client@luxuryfragrance.com"
                          className="pl-10 h-11 bg-[#1A1815] border-[#2C2822] text-[#FDFBF7] placeholder:text-[#635D54] focus-visible:border-[#C5A059] focus-visible:ring-1 focus-visible:ring-[#C5A059]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="register-password"
                        className="text-xs uppercase tracking-wider text-[#C4BEB3] font-medium"
                      >
                        New Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E978C]" />
                        <Input
                          id="register-password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="pl-10 pr-10 h-11 bg-[#1A1815] border-[#2C2822] text-[#FDFBF7] placeholder:text-[#635D54] focus-visible:border-[#C5A059] focus-visible:ring-1 focus-visible:ring-[#C5A059]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9E978C] hover:text-[#FDFBF7] transition-colors p-1"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="register-confirm-password"
                        className="text-xs uppercase tracking-wider text-[#C4BEB3] font-medium"
                      >
                        Confirm New Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E978C]" />
                        <Input
                          id="register-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          value={registerConfirmPassword}
                          onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="pl-10 pr-10 h-11 bg-[#1A1815] border-[#2C2822] text-[#FDFBF7] placeholder:text-[#635D54] focus-visible:border-[#C5A059] focus-visible:ring-1 focus-visible:ring-[#C5A059]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9E978C] hover:text-[#FDFBF7] transition-colors p-1"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#9E978C] flex items-center gap-1.5 pt-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#C5A059] shrink-0" />
                      <span>Passwords are securely encrypted with bcrypt.</span>
                    </div>

                    <Button
                      type="submit"
                      id="register-submit-button"
                      disabled={isSubmitting}
                      className="w-full h-11 mt-2 bg-[#C5A059] hover:bg-[#D4AF37] text-[#111111] font-semibold text-xs tracking-widest uppercase transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating Account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>

                    {/* Divider */}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#262421]" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-[#9E978C]">
                        <span className="bg-[#141210] px-3 font-medium">Or</span>
                      </div>
                    </div>

                    {/* Continue with Google */}
                    <Button
                      type="button"
                      onClick={() => setShowGoogleModal(true)}
                      variant="outline"
                      className="w-full h-11 border-[#2C2822] bg-[#181614] hover:bg-[#201D1A] text-[#FDFBF7] hover:text-[#C5A059] text-xs font-medium tracking-wide flex items-center justify-center gap-2.5 transition-colors"
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.1 7.5 23 12 23z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </Button>

                    {/* Switch to Sign In */}
                    <div className="pt-2 text-center text-xs text-[#9E978C]">
                      <span>Already have an account? </span>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("signin");
                          setRegisterError(null);
                        }}
                        className="text-[#C5A059] hover:underline font-medium ml-1 transition-colors"
                      >
                        Sign in here
                      </button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reassurance note */}
          <div className="mt-6 text-center text-[11px] text-[#9E978C]/70 flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3 text-[#C5A059]/80" />
            <span>Customer shopping account strictly isolated to {tenant?.name || "The Fragrance Store"}</span>
          </div>
        </div>
      </main>

      {/* Google OAuth Modal / Information Dialog */}
      {showGoogleModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
        >
          <div className="max-w-md w-full bg-[#181614] border border-[#2E2A24] rounded-lg p-6 shadow-2xl relative text-[#FDFBF7] space-y-4">
            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 text-[#9E978C] hover:text-[#FDFBF7] transition-colors p-1"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#24211D] border border-[#C5A059]/30 flex items-center justify-center shrink-0">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.1 7.5 23 12 23z"
                  />
                </svg>
              </div>
              <div>
                <h3 id="google-dialog-title" className="font-serif text-lg font-medium text-[#FDFBF7]">
                  Google OAuth Configuration Required
                </h3>
                <p className="text-xs text-[#9E978C]">Setup Requirement Notice</p>
              </div>
            </div>

            <div className="bg-[#121110] border border-[#25221E] rounded-md p-3.5 text-xs text-[#C4BEB3] space-y-2 leading-relaxed">
              <p>
                Google Sign-In is not currently configured for this storefront. To enable real Google authentication:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[#9E978C]">
                <li>Google Cloud OAuth 2.0 Web Client ID must be provisioned.</li>
                <li>Authorized JavaScript origins and redirect callback URLs must be registered.</li>
                <li>Client credentials must be supplied via backend environment settings.</li>
              </ul>
              <p className="pt-1 text-[#C5A059]">
                Please sign in or create your account above using your email and password.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="w-full bg-[#C5A059] hover:bg-[#D4AF37] text-[#111111] font-semibold text-xs tracking-wider uppercase"
            >
              Understand & Return to Sign In
            </Button>
          </div>
        </div>
      )}

      {/* Tenant-aware Customer Bottom Navigation */}
      <CustomerBottomNav active="account" storefrontPath={storefrontPath} />
    </div>
  );
}
