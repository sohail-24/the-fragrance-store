import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
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
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const isSuperMasterIntent = Boolean(returnTo?.includes("super-master"));
  const [email, setEmail] = useState(isSuperMasterIntent ? SUPER_MASTER_EMAIL : "admin@freshflow.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const login = trpc.auth.loginAdmin.useMutation();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (returnTo?.startsWith("/")) {
        navigate(returnTo, { replace: true });
      } else if (isSuperMaster(user)) {
        navigate("/super-master", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, user, navigate, returnTo]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await login.mutateAsync({ email, password });
      if (result?.token) {
        setStoredAdminToken(result.token);
      }
      utils.auth.me.setData(undefined, result.user);
      await utils.auth.me.refetch();
      if (returnTo?.startsWith("/")) {
        navigate(returnTo, { replace: true });
      } else if (isSuperMaster(result.user)) {
        navigate("/super-master", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-100 px-4 py-10">
      <div className="w-full max-w-md space-y-3">
        <Link
          id="back-to-home-link"
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-amber-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
        <Card className="w-full bg-neutral-900 border-neutral-800 text-neutral-100 shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-sm">
              {isSuperMasterIntent ? <Crown className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
            </div>
            <div>
              <CardTitle className="text-2xl text-white font-serif">
                {isSuperMasterIntent ? "Super Master Platform Console" : "Shop Administration"}
              </CardTitle>
              <p className="mt-1 text-xs text-neutral-400">
                {isSuperMasterIntent
                  ? "Authenticate to access central multi-tenant SaaS governance."
                  : "Sign in to manage boutique catalog, inventory, and operations."}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-1.5 rounded-lg bg-neutral-950/80 p-3 text-xs border border-neutral-800">
                <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Select Role Credentials:
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(SUPER_MASTER_EMAIL);
                      setPassword("admin123");
                    }}
                    className={`px-2.5 py-1 rounded text-xs transition border ${
                      email.toLowerCase() === SUPER_MASTER_EMAIL.toLowerCase()
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-medium"
                        : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
                    }`}
                  >
                    👑 Super Master ({SUPER_MASTER_EMAIL})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("admin@freshflow.com");
                      setPassword("admin123");
                    }}
                    className={`px-2.5 py-1 rounded text-xs transition border ${
                      email.toLowerCase() === "admin@freshflow.com"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-medium"
                        : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
                    }`}
                  >
                    Store Admin (admin@freshflow.com)
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-xs text-neutral-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                  <Input
                    id="admin-email"
                    className="pl-9 bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600 text-sm"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
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
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded" role="alert">{error}</p>}
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold text-sm h-10 shadow-lg shadow-amber-500/10"
                type="submit"
                disabled={login.isPending}
              >
                {login.isPending ? "Signing in…" : isSuperMasterIntent ? "Open Super Master Console" : "Sign in to Dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
