import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  CheckCircle2,
  Crown,
  Database,
  ExternalLink,
  Globe,
  Layers,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  AlertTriangle,
  ShieldAlert,
  Power,
  PowerOff,
  Ban,
} from "lucide-react";
import { Link } from "react-router";
import { isSuperMaster } from "@/lib/roles";

export default function SuperMasterDashboard() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("brands");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    type: "supplier" as "supplier" | "buyer" | "both",
    description: "",
    email: "",
    phone: "",
    city: "Mumbai",
    country: "India",
    minimumOrderAmount: "0.00",
  });
  const [formError, setFormError] = useState("");

  // Edit Tenant state
  const [editingTenant, setEditingTenant] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    email: "",
    phone: "",
    city: "",
    country: "India",
    minimumOrderAmount: "0.00",
    isActive: true,
    isVerified: true,
  });
  const [editFormError, setEditFormError] = useState("");

  const statsQuery = trpc.superMaster.stats.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const createTenantMutation = trpc.superMaster.createTenant.useMutation({
    onSuccess: () => {
      utils.superMaster.stats.invalidate();
      setIsProvisionOpen(false);
      setFormData({
        name: "",
        slug: "",
        type: "supplier",
        description: "",
        email: "",
        phone: "",
        city: "Mumbai",
        country: "India",
        minimumOrderAmount: "0.00",
      });
      setFormError("");
    },
    onError: (err) => {
      setFormError(err.message || "Failed to provision brand");
    },
  });

  const updateTenantMutation = trpc.superMaster.updateTenant.useMutation({
    onSuccess: () => {
      utils.superMaster.stats.invalidate();
      setEditingTenant(null);
      setEditFormError("");
    },
    onError: (err) => {
      setEditFormError(err.message || "Failed to update brand tenant");
    },
  });

  const setStatusMutation = trpc.superMaster.setStatus.useMutation({
    onSuccess: () => {
      utils.superMaster.stats.invalidate();
    },
  });

  const stats = statsQuery.data;
  const tenants = stats?.tenants ?? [];

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      (t.email && t.email.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && t.isActive) ||
      (statusFilter === "inactive" && !t.isActive);

    return matchesSearch && matchesStatus;
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const derivedSlug = val
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: prev.slug === "" || prev.slug === derivedSlug.slice(0, -1) ? derivedSlug : prev.slug,
    }));
  };

  const handleProvisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Brand name is required");
      return;
    }
    createTenantMutation.mutate({
      name: formData.name.trim(),
      slug: formData.slug.trim() || undefined,
      type: formData.type,
      description: formData.description.trim() || undefined,
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      city: formData.city.trim() || undefined,
      country: formData.country.trim() || "India",
      minimumOrderAmount: formData.minimumOrderAmount || "0.00",
    });
  };

  // 1. Access Denied State (if user is authenticated but not authorized as Super Master)
  if (user && !isSuperMaster(user)) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-neutral-900 border-rose-500/30 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Access Restricted</h2>
            <p className="text-xs text-neutral-400">
              The Super Master Console is reserved strictly for the SaaS Platform Owner ({user.email}). Your current account does not have Level 1 privileges.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link to="/dashboard">
              <Button variant="outline" className="border-neutral-800 text-neutral-300 text-xs">
                Go to Store Dashboard
              </Button>
            </Link>
            <Link to="/">
              <Button className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold">
                Storefront
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 2. Loading State
  if (statsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
        <p className="text-sm font-mono text-neutral-400 animate-pulse">
          Connecting to Neon PostgreSQL & loading Super Master metrics...
        </p>
      </div>
    );
  }

  // 3. Query Error State
  if (statsQuery.isError) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-neutral-900 border-amber-500/30 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Console Synchronization Error</h2>
            <p className="text-xs text-neutral-400">
              {statsQuery.error.message || "Failed to load platform SaaS metrics from server."}
            </p>
          </div>
          <Button
            onClick={() => statsQuery.refetch()}
            className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry Connection
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8 space-y-8">
      {/* Platform Level 1 Master Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-amber-950/40 border border-amber-500/20 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>SaaS Level 1: Super Master Foundation</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-white flex items-center gap-3">
              The Fragrance Store — House of Brands
            </h1>
            <p className="text-sm md:text-base text-neutral-400 max-w-2xl">
              Central multi-tenant administrative command. Manage luxury fragrance houses, brand tenant provisioning, cross-store catalog metrics, and SaaS platform governance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => statsQuery.refetch()}
              disabled={statsQuery.isFetching}
              className="border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${statsQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setIsProvisionOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Provision Brand House
            </Button>
          </div>
        </div>

        {/* Database & Platform Badges */}
        <div className="mt-6 pt-4 border-t border-neutral-800/80 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-neutral-300 font-medium">Database:</span>
            <span className="text-emerald-400 font-mono">Dedicated Neon PostgreSQL (Persistent)</span>
          </div>
          <span className="text-neutral-700">|</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Super Master:</span>
            <span className="text-neutral-200 font-mono">{user?.email ?? "Platform Admin"}</span>
          </div>
          <span className="text-neutral-700">|</span>
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Tenant Isolation:</span>
            <span className="text-blue-300 font-medium">Multi-Tenant Partitioned</span>
          </div>
        </div>
      </div>

      {/* High-Level SaaS Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-neutral-900/90 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Brand Tenants
            </CardTitle>
            <Building2 className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.totalTenants ?? (statsQuery.isLoading ? "—" : 1)}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                {stats?.activeTenants ?? 1} Active
              </Badge>
              <span>{stats?.verifiedTenants ?? 1} Verified</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/90 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Global Catalog SKUs
            </CardTitle>
            <Package className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.totalProducts ?? (statsQuery.isLoading ? "—" : 0)}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Active luxury fragrances across brands
            </p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/90 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Platform Orders
            </CardTitle>
            <ShoppingBag className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.totalOrders ?? (statsQuery.isLoading ? "—" : 0)}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Total orders placed across all tenants
            </p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/90 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Platform GMV
            </CardTitle>
            <Crown className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ₹{stats ? Number(stats.totalRevenue).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Gross platform volume
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-neutral-900 border border-neutral-800 p-1">
          <TabsTrigger value="brands" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-amber-400">
            <Building2 className="w-4 h-4 mr-2" />
            Brand Houses ({tenants.length})
          </TabsTrigger>
          <TabsTrigger value="provision" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-amber-400">
            <Plus className="w-4 h-4 mr-2" />
            Provision New Brand
          </TabsTrigger>
          <TabsTrigger value="architecture" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-amber-400">
            <Layers className="w-4 h-4 mr-2" />
            SaaS Hierarchy & Governance
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Brand Houses & Tenants */}
        <TabsContent value="brands" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-neutral-900/60 p-3 rounded-lg border border-neutral-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <Input
                placeholder="Search by brand name, slug, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-neutral-950 border-neutral-800 text-neutral-200 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Status:</span>
              <div className="inline-flex rounded-lg border border-neutral-800 bg-neutral-950 p-0.5 text-xs">
                {(["all", "active", "inactive"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded capitalize font-medium transition ${
                      statusFilter === s ? "bg-amber-500/20 text-amber-400" : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tenants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTenants.map((tenant) => (
              <Card
                key={tenant.id}
                className="bg-neutral-900 border-neutral-800 hover:border-amber-500/30 transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center p-1 overflow-hidden">
                        {tenant.logo ? (
                          <img src={tenant.logo} alt={tenant.name} className="w-full h-full object-contain" />
                        ) : (
                          <Store className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold text-white">
                          {tenant.name}
                        </CardTitle>
                        <CardDescription className="text-xs font-mono text-amber-500/80">
                          slug: {tenant.slug}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        tenant.isActive
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {tenant.isActive ? "Active" : "Suspended"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-xs text-neutral-300">
                  <p className="text-neutral-400 line-clamp-2 italic">
                    {tenant.description || "Luxury fragrance house on The Fragrance Store platform."}
                  </p>

                  <div className="grid grid-cols-2 gap-2 bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800/60">
                    <div>
                      <span className="text-[10px] uppercase text-neutral-500 block">Catalog SKUs</span>
                      <span className="font-semibold text-neutral-200 text-sm">
                        {tenant.productCount} Fragrances
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-neutral-500 block">Total Orders</span>
                      <span className="font-semibold text-neutral-200 text-sm">
                        {tenant.orderCount} Orders
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-neutral-400 text-[11px]">
                    {tenant.email && (
                      <div className="truncate">
                        <span className="text-neutral-500">Email:</span> {tenant.email}
                      </div>
                    )}
                    {tenant.city && (
                      <div>
                        <span className="text-neutral-500">Location:</span> {tenant.city}, {tenant.country}
                      </div>
                    )}
                  </div>
                </CardContent>

                <div className="p-4 pt-0 border-t border-neutral-800/60 mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {tenant.isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 px-2 h-7"
                        onClick={() =>
                          setStatusMutation.mutate({
                            id: tenant.id,
                            isActive: false,
                          })
                        }
                        disabled={setStatusMutation.isPending}
                        title="Temporarily suspend brand from public storefront"
                      >
                        <PowerOff className="w-3.5 h-3.5 mr-1" />
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2 h-7"
                        onClick={() =>
                          setStatusMutation.mutate({
                            id: tenant.id,
                            isActive: true,
                          })
                        }
                        disabled={setStatusMutation.isPending}
                        title="Activate brand storefront and boutique"
                      >
                        <Power className="w-3.5 h-3.5 mr-1" />
                        Activate
                      </Button>
                    )}

                    {tenant.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2 h-7"
                        onClick={() =>
                          setStatusMutation.mutate({
                            id: tenant.id,
                            isActive: false,
                            isVerified: false,
                          })
                        }
                        disabled={setStatusMutation.isPending}
                        title="Deactivate brand house operations"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" />
                        Deactivate
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 px-2 h-7"
                      onClick={() => {
                        setEditingTenant(tenant);
                        setEditFormData({
                          name: tenant.name,
                          description: tenant.description || "",
                          email: tenant.email || "",
                          phone: tenant.phone || "",
                          city: tenant.city || "Mumbai",
                          country: tenant.country || "India",
                          minimumOrderAmount: tenant.minimumOrderAmount || "0.00",
                          isActive: tenant.isActive,
                          isVerified: tenant.isVerified,
                        });
                        setEditFormError("");
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1 text-amber-400" />
                      Edit
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link to="/products">
                      <Button variant="outline" size="sm" className="text-xs border-neutral-800 bg-neutral-950 hover:bg-neutral-800 h-7 px-2.5">
                        <Package className="w-3.5 h-3.5 mr-1 text-blue-400" />
                        Fragrances
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}

            {filteredTenants.length === 0 && (
              <div className="col-span-full py-12 text-center bg-neutral-900/40 border border-dashed border-neutral-800 rounded-xl">
                <Store className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-neutral-400 text-sm">No fragrance brand houses match your filter.</p>
                <Button
                  size="sm"
                  onClick={() => setIsProvisionOpen(true)}
                  className="mt-4 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Provision Brand Now
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: Provision New Brand Form */}
        <TabsContent value="provision">
          <Card className="bg-neutral-900 border-neutral-800 max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Brand Onboarding</span>
              </div>
              <CardTitle className="text-xl text-white">Provision a New Brand House</CardTitle>
              <CardDescription className="text-neutral-400">
                Create a distinct brand tenant inside The Fragrance Store multi-tenant architecture. The brand receives its own catalog partition, inventory tracking, and warehouse routing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProvisionSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="brandName" className="text-xs text-neutral-300">
                      Brand House Name *
                    </Label>
                    <Input
                      id="brandName"
                      placeholder="e.g. Maison de Niche"
                      value={formData.name}
                      onChange={handleNameChange}
                      className="bg-neutral-950 border-neutral-800 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="brandSlug" className="text-xs text-neutral-300">
                      Tenant Slug (Identifier)
                    </Label>
                    <Input
                      id="brandSlug"
                      placeholder="e.g. maison-de-niche"
                      value={formData.slug}
                      onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                      className="bg-neutral-950 border-neutral-800 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="brandDesc" className="text-xs text-neutral-300">
                    Brand Heritage & Description
                  </Label>
                  <Input
                    id="brandDesc"
                    placeholder="e.g. Artisanal extrait de parfum formulated in Grasse & Mumbai."
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    className="bg-neutral-950 border-neutral-800 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="brandEmail" className="text-xs text-neutral-300">
                      Official Contact Email
                    </Label>
                    <Input
                      id="brandEmail"
                      type="email"
                      placeholder="concierge@maisondeniche.com"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      className="bg-neutral-950 border-neutral-800 text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="brandPhone" className="text-xs text-neutral-300">
                      Business Phone
                    </Label>
                    <Input
                      id="brandPhone"
                      placeholder="+91 98765 00000"
                      value={formData.phone}
                      onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                      className="bg-neutral-950 border-neutral-800 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="brandCity" className="text-xs text-neutral-300">
                      Flagship Boutique / City
                    </Label>
                    <Input
                      id="brandCity"
                      placeholder="Mumbai"
                      value={formData.city}
                      onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                      className="bg-neutral-950 border-neutral-800 text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="brandCountry" className="text-xs text-neutral-300">
                      Country
                    </Label>
                    <Input
                      id="brandCountry"
                      placeholder="India"
                      value={formData.country}
                      onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                      className="bg-neutral-950 border-neutral-800 text-white"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setActiveTab("brands")}
                    className="text-neutral-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTenantMutation.isPending}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                  >
                    {createTenantMutation.isPending ? "Provisioning..." : "Provision Brand Tenant"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: SaaS Hierarchy & Governance */}
        <TabsContent value="architecture" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  SaaS 4-Tier Security Hierarchy
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400">
                  Role-based access boundaries established in contracts and API middleware.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-neutral-950 border border-amber-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-400">Level 1: Super Master</span>
                    <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">Active</Badge>
                  </div>
                  <p className="text-neutral-400">
                    SaaS Platform Owner. Governs multi-brand tenant provisioning, cross-tenant catalog oversight, system health, and persistent database connections.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-200">Level 2: Brand / Tenant Owner</span>
                    <Badge variant="outline" className="text-[10px]">Scoped</Badge>
                  </div>
                  <p className="text-neutral-400">
                    Owner of a specific fragrance house (e.g. The Fragrance Store). Manages tenant products, price tiers, stock movements, and invoices within their tenant partition.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-200">Level 3: Tenant Operations & Staff</span>
                    <Badge variant="outline" className="text-[10px]">Role-based</Badge>
                  </div>
                  <p className="text-neutral-400">
                    Store staff, warehouse operators, and order dispatchers with scoped functional capabilities within the assigned brand.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-200">Level 4: Buyer / Customer</span>
                    <Badge variant="outline" className="text-[10px]">Public/Guest</Badge>
                  </div>
                  <p className="text-neutral-400">
                    Discovers fragrances across brands, adds items to cart, and completes checkout via Razorpay with encrypted payment verification.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Database Persistence & Isolation State
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400">
                  Neon PostgreSQL dedicated connection architecture.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-medium text-neutral-200">Persistent Connection</div>
                      <div className="text-[11px] text-neutral-500">Dedicated Neon PostgreSQL instance</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                    Verified
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-medium text-neutral-200">Tenant Foreign Key Scoping</div>
                      <div className="text-[11px] text-neutral-500">products.supplierId & orders.supplierId</div>
                    </div>
                  </div>
                  <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">
                    Partitioned
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-medium text-neutral-200">Session Security & Timing-Safe Auth</div>
                      <div className="text-[11px] text-neutral-500">crypto.timingSafeEqual on credentials</div>
                    </div>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                    Protected
                  </Badge>
                </div>

                <div className="p-3 rounded-lg bg-neutral-950/80 border border-neutral-800 text-[11px] text-neutral-400">
                  <span className="text-neutral-300 font-medium">Phase 1 Milestone:</span> Level 1 Super Master Foundation is operational. All brand provisioning, tenant query endpoints, and role authorizations are in place.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Provision Dialog */}
      <Dialog open={isProvisionOpen} onOpenChange={setIsProvisionOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              Provision Brand Tenant
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Add a new luxury brand house to The Fragrance Store SaaS platform.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleProvisionSubmit} className="space-y-4">
            {formError && (
              <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-neutral-300">Brand Name *</Label>
              <Input
                placeholder="e.g. Velvet Oud Parfums"
                value={formData.name}
                onChange={handleNameChange}
                className="bg-neutral-950 border-neutral-800 text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-neutral-300">Brand Slug</Label>
              <Input
                placeholder="e.g. velvet-oud-parfums"
                value={formData.slug}
                onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                className="bg-neutral-950 border-neutral-800 text-white font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-neutral-300">Tagline / Heritage</Label>
              <Input
                placeholder="Artisanal niche fragrances"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                className="bg-neutral-950 border-neutral-800 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-neutral-300">Contact Email</Label>
                <Input
                  type="email"
                  placeholder="contact@brand.com"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className="bg-neutral-950 border-neutral-800 text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-neutral-300">Boutique City</Label>
                <Input
                  placeholder="Mumbai"
                  value={formData.city}
                  onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                  className="bg-neutral-950 border-neutral-800 text-white text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsProvisionOpen(false)}
                className="text-neutral-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTenantMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                {createTenantMutation.isPending ? "Provisioning..." : "Provision Now"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Brand Dialog */}
      <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-white flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-400" />
              Manage Brand Tenant: {editingTenant?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Update branding profile, boutique location, and operating status.
            </DialogDescription>
          </DialogHeader>

          {editingTenant && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editFormData.name.trim()) {
                  setEditFormError("Brand name is required.");
                  return;
                }
                updateTenantMutation.mutate({
                  id: editingTenant.id,
                  name: editFormData.name.trim(),
                  description: editFormData.description.trim() || undefined,
                  email: editFormData.email.trim() || undefined,
                  phone: editFormData.phone.trim() || undefined,
                  city: editFormData.city.trim() || undefined,
                  country: editFormData.country.trim() || "India",
                  minimumOrderAmount: editFormData.minimumOrderAmount || "0.00",
                  isActive: editFormData.isActive,
                  isVerified: editFormData.isVerified,
                });
              }}
              className="space-y-4"
            >
              {editFormError && (
                <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {editFormError}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-neutral-300">Brand Name *</Label>
                <Input
                  value={editFormData.name}
                  onChange={(e) => setEditFormData((p) => ({ ...p, name: e.target.value }))}
                  className="bg-neutral-950 border-neutral-800 text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-neutral-300">Tagline / Heritage</Label>
                <Input
                  value={editFormData.description}
                  onChange={(e) => setEditFormData((p) => ({ ...p, description: e.target.value }))}
                  className="bg-neutral-950 border-neutral-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-neutral-300">Contact Email</Label>
                  <Input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData((p) => ({ ...p, email: e.target.value }))}
                    className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-neutral-300">Boutique City</Label>
                  <Input
                    value={editFormData.city}
                    onChange={(e) => setEditFormData((p) => ({ ...p, city: e.target.value }))}
                    className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.isActive}
                    onChange={(e) => setEditFormData((p) => ({ ...p, isActive: e.target.checked }))}
                    className="rounded border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-0"
                  />
                  <span>Active Operating Status</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.isVerified}
                    onChange={(e) => setEditFormData((p) => ({ ...p, isVerified: e.target.checked }))}
                    className="rounded border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-0"
                  />
                  <span>Verified House Badge</span>
                </label>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingTenant(null)}
                  className="text-neutral-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateTenantMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                >
                  {updateTenantMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
