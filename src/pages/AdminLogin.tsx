import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Crown, Lock, Mail, ShieldCheck } from "lucide-react";
import { setStoredAdminToken, trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUPER_MASTER_EMAIL, isSuperMaster } from "@/lib/roles";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const modeParam = searchParams.get("mode");
  const isSuperMasterIntent = Boolean(
    location.pathname === "/" ||
    location.pathname.startsWith("/super-master") ||
    returnTo?.includes("super-master") ||
    modeParam === "super_master"
  );
  const [loginMode, setLoginMode] = useState<"super_master" | "admin">(
    isSuperMasterIntent ? "super_master" : "admin"
  );
  const [email, setEmail] = useState(
    isSuperMasterIntent && SUPER_MASTER_EMAIL ? SUPER_MASTER_EMAIL : ""
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const login = trpc.auth.loginAdmin.useMutation();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    setLoginMode(isSuperMasterIntent ? "super_master" : "admin");
    if (isSuperMasterIntent && SUPER_MASTER_EMAIL) {
      setEmail((prev) => (prev ? prev : SUPER_MASTER_EMAIL));
    } else if (!isSuperMasterIntent) {
      setEmail((prev) => (prev === SUPER_MASTER_EMAIL ? "" : prev));
    }
  }, [isSuperMasterIntent]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (isSuperMaster(user)) {
        const target = returnTo?.startsWith("/super-master") ? returnTo : "/super-master";
        navigate(target, { replace: true });
      } else {
        const target =
          returnTo?.startsWith("/") && !returnTo.startsWith("/super-master")
            ? returnTo
            : "/dashboard";
        navigate(target, { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, user, navigate, returnTo]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await login.mutateAsync({ email: email.trim(), password });
      if (result?.token) {
        setStoredAdminToken(result.token);
      }
      utils.auth.me.setData(undefined, result.user);
      await utils.auth.me.refetch();
      if (isSuperMaster(result.user)) {
        const target = returnTo?.startsWith("/super-master") ? returnTo : "/super-master";
        navigate(target, { replace: true });
      } else {
        const target =
          returnTo?.startsWith("/") && !returnTo.startsWith("/super-master")
            ? returnTo
            : "/dashboard";
        navigate(target, { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    }
  }

  const isSuperMasterActive = loginMode === "super_master";

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-100 px-4 py-10">
      <div className="w-full max-w-md space-y-3">
        <Link
          id="back-to-home-link"
          to="/store/the-fragrance-store"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-amber-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{isSuperMasterActive ? "Visit Storefront" : "Back to Storefront"}</span>
        </Link>
        <Card className="w-full bg-neutral-900 border-neutral-800 text-neutral-100 shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-sm">
              {isSuperMasterActive ? <Crown className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
            </div>
            <div>
              <CardTitle className="text-2xl text-white font-serif">
                {isSuperMasterActive ? "Super Master Platform Console" : "Shop Administration"}
              </CardTitle>
              <p className="mt-1 text-xs text-neutral-400">
                {isSuperMasterActive
                  ? "Authenticate with configured Super Master credentials to access central SaaS governance."
                  : "Sign in with administrator credentials to manage boutique catalog, inventory, and operations."}
              </p>
            </div>
            {/* Show badge only when accessing Super Master platform login explicitly; hide from tenant storefront visitors */}
            {isSuperMasterIntent && (
              <div className="inline-flex rounded-lg border border-amber-500/30 bg-neutral-950 px-3 py-1 text-xs mx-auto text-amber-300 font-semibold items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                <span>Super Master Authentication</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-xs text-neutral-300">
                  {isSuperMasterActive ? "Super Master Email" : "Administrator Email"}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                  <Input
                    id="admin-email"
                    className="pl-9 bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600 text-sm"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={isSuperMasterActive ? "supermaster@example.com" : "admin@freshflow.com"}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-xs text-neutral-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                  <Input
                    id="admin-password"
                    className="pl-9 bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600 text-sm"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
              {error && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded" role="alert">
                  {error}
                </p>
              )}
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold text-sm h-10 shadow-lg shadow-amber-500/10"
                type="submit"
                disabled={login.isPending}
              >
                {login.isPending
                  ? "Signing in…"
                  : isSuperMasterActive
                  ? "Open Super Master Console"
                  : "Sign in to Dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
