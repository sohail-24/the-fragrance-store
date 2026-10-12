import { useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router";
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
  Activity,
  AlertTriangle,
  Ban,
  BarChart3,
  Building2,
  CheckCircle2,
  CreditCard,
  Crown,
  Database,
  ExternalLink,
  Globe,
  Layers,
  Lock,
  Package,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { isSuperMaster } from "@/lib/roles";

export default function SuperMasterDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  // Active section derived from URL path
  const getTabFromPath = (pathname: string) => {
    if (pathname.includes("/websites") || pathname.includes("/tenants")) return "websites";
    if (pathname.includes("/owners")) return "owners";
    if (pathname.includes("/analytics")) return "analytics";
    if (pathname.includes("/subscriptions")) return "subscriptions";
    if (pathname.includes("/monitoring")) return "monitoring";
    if (pathname.includes("/audit-logs")) return "audit-logs";
    if (pathname.includes("/settings")) return "settings";
    return "overview";
  };

  const activeTab = getTabFromPath(location.pathname);

  const handleTabChange = (val: string) => {
    if (val === "overview") navigate("/super-master");
    else if (val === "websites") navigate("/super-master/websites");
    else if (val === "owners") navigate("/super-master/owners");
    else if (val === "analytics") navigate("/super-master/analytics");
    else if (val === "subscriptions") navigate("/super-master/subscriptions");
    else if (val === "monitoring") navigate("/super-master/monitoring");
    else if (val === "audit-logs") navigate("/super-master/audit-logs");
    else if (val === "settings") navigate("/super-master/settings");
  };

  // State for search and filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [inspectingTenant, setInspectingTenant] = useState<any | null>(null);
  const [editingTenant, setEditingTenant] = useState<any | null>(null);
  const [assigningTenant, setAssigningTenant] = useState<any | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);

  // Create Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    type: "supplier" as "supplier" | "buyer" | "both",
    description: "",
    logo: "",
    website: "",
    email: "",
    phone: "",
    city: "Mumbai",
    country: "India",
    minimumOrderAmount: "0.00",
    assignedOwnerId: "" as string,
  });
  const [formError, setFormError] = useState("");

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    logo: "",
    website: "",
    email: "",
    phone: "",
    city: "",
    country: "India",
    minimumOrderAmount: "0.00",
    isActive: true,
    isVerified: true,
  });
  const [editFormError, setEditFormError] = useState("");

  // Queries
  const statsQuery = trpc.superMaster.stats.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const ownersQuery = trpc.superMaster.listOwners.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const healthQuery = trpc.superMaster.systemHealth.useQuery(undefined, {
    refetchInterval: 15000,
  });

  const auditQuery = trpc.superMaster.auditLogs.useQuery(undefined, {
    refetchInterval: 60000,
  });

  // Mutations
  const createTenantMutation = trpc.superMaster.createTenant.useMutation({
    onSuccess: async (created) => {
      if (formData.assignedOwnerId && !isNaN(Number(formData.assignedOwnerId))) {
        try {
          await assignOwnerMutation.mutateAsync({
            tenantId: created.id,
            userId: Number(formData.assignedOwnerId),
          });
        } catch {
          // non-fatal
        }
      }
      utils.superMaster.stats.invalidate();
      setIsCreateOpen(false);
      setFormData({
        name: "",
        slug: "",
        type: "supplier",
        description: "",
        logo: "",
        website: "",
        email: "",
        phone: "",
        city: "Mumbai",
        country: "India",
        minimumOrderAmount: "0.00",
        assignedOwnerId: "",
      });
      setFormError("");
    },
    onError: (err) => {
      setFormError(err.message || "Failed to provision website");
    },
  });

  const updateTenantMutation = trpc.superMaster.updateTenant.useMutation({
    onSuccess: () => {
      utils.superMaster.stats.invalidate();
      setEditingTenant(null);
      setEditFormError("");
    },
    onError: (err) => {
      setEditFormError(err.message || "Failed to update website");
    },
  });

  const setStatusMutation = trpc.superMaster.setStatus.useMutation({
    onSuccess: () => {
      utils.superMaster.stats.invalidate();
    },
  });

  const assignOwnerMutation = trpc.superMaster.assignOwner.useMutation({
    onSuccess: () => {
      utils.superMaster.stats.invalidate();
      setAssigningTenant(null);
      setSelectedOwnerId(null);
    },
  });

  const stats = statsQuery.data;
  const tenants = useMemo(() => stats?.tenants ?? [], [stats?.tenants]);
  const owners = useMemo(() => ownersQuery.data ?? [], [ownersQuery.data]);

  // Filtered websites
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.website && t.website.toLowerCase().includes(q)) ||
        (t.owner?.name && t.owner.name.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && t.isActive) ||
        (statusFilter === "inactive" && !t.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [tenants, search, statusFilter]);

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

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Website name is required");
      return;
    }
    createTenantMutation.mutate({
      name: formData.name.trim(),
      slug: formData.slug.trim() || undefined,
      type: formData.type,
      description: formData.description.trim() || undefined,
      logo: formData.logo.trim() || undefined,
      website: formData.website.trim() || undefined,
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      city: formData.city.trim() || undefined,
      country: formData.country.trim() || "India",
      minimumOrderAmount: formData.minimumOrderAmount || "0.00",
    });
  };

  // 1. Strict Server & Client Route Guard Access Denied
  if (user && !isSuperMaster(user)) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-neutral-900 border-rose-500/30 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Platform Access Restricted</h2>
            <p className="text-xs text-neutral-400">
              The Super Master Console is reserved strictly for Level 1 Platform Administrators ({user.email}). Ordinary administrators, boutique owners, and buyers are barred from platform-wide operations.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link to="/dashboard">
              <Button variant="outline" className="border-neutral-800 text-neutral-300 text-xs">
                Store Dashboard
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
          Connecting to Neon PostgreSQL & synchronizing SaaS Platform Control Center...
        </p>
      </div>
    );
  }

  // 3. Error State
  if (statsQuery.isError) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-neutral-900 border-amber-500/30 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Platform Synchronization Error</h2>
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
              <span>SaaS Level 1: Platform Control Center</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-white flex items-center gap-3">
              The Fragrance Store — Multi-Tenant Platform
            </h1>
            <p className="text-sm md:text-base text-neutral-400 max-w-3xl">
              Central SaaS governance command. Manage tenant websites, domain routing, shop owner credentials, platform-wide sales volume, and system health.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                statsQuery.refetch();
                healthQuery.refetch();
                ownersQuery.refetch();
              }}
              disabled={statsQuery.isFetching}
              className="border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${statsQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh Metrics
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Website
            </Button>
          </div>
        </div>

        {/* Database & Platform Badges */}
        <div className="mt-6 pt-4 border-t border-neutral-800/80 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-neutral-300 font-medium">Database:</span>
            <span className="text-emerald-400 font-mono">Neon PostgreSQL (Persistent Dedicated Pooler)</span>
          </div>
          <span className="text-neutral-700">|</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Super Master:</span>
            <span className="text-neutral-200 font-mono">{user?.email ?? "mdsohail88008@gmail.com"}</span>
          </div>
          <span className="text-neutral-700">|</span>
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Architecture:</span>
            <span className="text-blue-300 font-medium">Tenant Partitioned Multi-Tenancy</span>
          </div>
          <span className="text-neutral-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">Currency:</span>
            <span className="text-amber-400 font-mono">INR (₹)</span>
          </div>
        </div>
      </div>

      {/* High-Level SaaS Metrics Cards (Platform Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Websites */}
        <Card className="bg-neutral-900/90 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Websites
            </CardTitle>
            <Globe className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.totalTenants ?? (statsQuery.isLoading ? "—" : 1)}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                {stats?.activeTenants ?? 1} Active
              </Badge>
              {stats?.suspendedTenants ? (
                <Badge variant="secondary" className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px]">
                  {stats.suspendedTenants} Suspended
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Platform GMV */}
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
            <p className="text-[11px] text-neutral-400 mt-1">
              Gross sales across tenant websites (INR)
            </p>
          </CardContent>
        </Card>

        {/* Catalog SKUs */}
        <Card className="bg-neutral-900/90 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Catalog SKUs
            </CardTitle>
            <Package className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.totalProducts ?? (statsQuery.isLoading ? "—" : 0)}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Active luxury fragrances across shops
            </p>
          </CardContent>
        </Card>

        {/* Platform Orders */}
        <Card className="bg-neutral-900/90 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Total Orders
            </CardTitle>
            <ShoppingBag className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.totalOrders ?? (statsQuery.isLoading ? "—" : 0)}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Placed across all tenant boutiques
            </p>
          </CardContent>
        </Card>

        {/* Shop Owners */}
        <Card className="bg-neutral-900/90 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Shop Owners
            </CardTitle>
            <Users className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.totalOwners ?? owners.length}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Registered platform administrators
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Platform Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="bg-neutral-900 border border-neutral-800 p-1 flex-nowrap inline-flex">
            <TabsTrigger value="overview" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-amber-400 text-xs">
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              Platform Overview
            </TabsTrigger>
            <TabsTrigger value="websites" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-amber-400 text-xs">
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              Websites ({tenants.length})
            </TabsTrigger>
            <TabsTrigger value="owners" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-amber-400 text-xs">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Shop Owners ({owners.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-amber-400 text-xs">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              Analytics & Usage
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-amber-400 text-xs">
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-amber-400 text-xs">
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              Monitoring & Errors
            </TabsTrigger>
            <TabsTrigger value="audit-logs" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-amber-400 text-xs">
              <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-amber-400 text-xs">
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Platform Settings
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ====================================================================== */}
        {/* TAB 1: PLATFORM OVERVIEW                                               */}
        {/* ====================================================================== */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Websites Quick Snapshot */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">Active Tenant Websites</h3>
                  <p className="text-xs text-neutral-400">Snapshot of provisioned boutique storefronts on this platform.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/super-master/websites")}
                  className="text-xs border-neutral-800 text-neutral-300 hover:text-white"
                >
                  View All Websites ({tenants.length})
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tenants.slice(0, 4).map((tenant) => (
                  <Card key={tenant.id} className="bg-neutral-900 border-neutral-800 hover:border-amber-500/30 transition-all p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center p-1 overflow-hidden">
                          {tenant.logo ? (
                            <img src={tenant.logo} alt={tenant.name} className="w-full h-full object-contain" />
                          ) : (
                            <Store className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white truncate max-w-[170px]">{tenant.name}</h4>
                          <span className="text-[11px] font-mono text-amber-500/80">ID: #{tenant.id} • {tenant.slug}</span>
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

                    <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-2 rounded border border-neutral-800/80 text-center">
                      <div>
                        <span className="text-[9px] uppercase text-neutral-500 block">Catalog</span>
                        <span className="text-xs font-semibold text-neutral-200">{tenant.productCount} SKUs</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-neutral-500 block">Orders</span>
                        <span className="text-xs font-semibold text-neutral-200">{tenant.orderCount}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-neutral-500 block">Sales</span>
                        <span className="text-xs font-semibold text-amber-400">₹{tenant.totalRevenue}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
                      <div className="truncate max-w-[160px] text-[11px]">
                        <span className="text-neutral-500">Owner:</span> {tenant.owner?.name ?? "Unassigned"}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInspectingTenant(tenant)}
                        className="h-6 px-2 text-[11px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                      >
                        Details
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right Col: System Health & Security Status */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-white">Infrastructure & Governance</h3>
              <Card className="bg-neutral-900 border-neutral-800 p-4 space-y-4">
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <span className="text-neutral-400">Database Engine</span>
                    <span className="font-mono text-emerald-400 font-medium">Neon PostgreSQL</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <span className="text-neutral-400">DB Ping Latency</span>
                    <span className="font-mono text-white">{healthQuery.data?.database.latencyMs ?? 15} ms</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <span className="text-neutral-400">Multi-Tenant Mode</span>
                    <span className="text-blue-400 font-medium">Partitioned Isolation</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <span className="text-neutral-400">Server Uptime</span>
                    <span className="font-mono text-neutral-300">{Math.floor((healthQuery.data?.server.uptimeSeconds ?? 120) / 60)} mins</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Super Master Auth</span>
                    <span className="text-amber-400 font-semibold">Strict Level 1</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Cross-Tenant Security Enforced</span>
                  </div>
                  <p>
                    All queries enforce tenant boundaries. Individual shop owners cannot access cross-shop catalog items, customer records, or platform GMV.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ====================================================================== */}
        {/* TAB 2: WEBSITES MANAGEMENT PAGE                                        */}
        {/* ====================================================================== */}
        <TabsContent value="websites" className="space-y-4">
          {/* Search, Filter & Actions Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-neutral-900/60 p-3 rounded-lg border border-neutral-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <Input
                placeholder="Search by website name, slug, domain, or owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-neutral-950 border-neutral-800 text-neutral-200 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
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
                      {s === "inactive" ? "Suspended" : s}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create Website
              </Button>
            </div>
          </div>

          {/* Websites Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTenants.map((tenant) => (
              <Card
                key={tenant.id}
                className="bg-neutral-900 border-neutral-800 hover:border-amber-500/30 transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center p-1 overflow-hidden shrink-0">
                        {tenant.logo ? (
                          <img src={tenant.logo} alt={tenant.name} className="w-full h-full object-contain" />
                        ) : (
                          <Store className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base font-semibold text-white truncate">
                          {tenant.name}
                        </CardTitle>
                        <CardDescription className="text-xs font-mono text-amber-500/80 truncate">
                          ID: #{tenant.id} • slug: {tenant.slug}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${
                        tenant.isActive
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {tenant.isActive ? "Active" : "Suspended"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3.5 text-xs text-neutral-300">
                  {/* Domain Configuration & Verification */}
                  <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-500">Domain / Routing:</span>
                      {tenant.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                          <AlertTriangle className="w-3 h-3" />
                          DNS Pending
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs text-neutral-200 truncate flex items-center gap-1">
                      <Globe className="w-3 h-3 text-neutral-500 shrink-0" />
                      <span className="truncate">
                        {tenant.website || `${tenant.slug}.thefragrancestore.com`}
                      </span>
                    </div>
                  </div>

                  {/* Assigned Owner Info */}
                  <div className="flex items-center justify-between bg-neutral-950/70 p-2 rounded border border-neutral-800/60 text-[11px]">
                    <div className="truncate">
                      <span className="text-neutral-500 mr-1.5">Owner:</span>
                      {tenant.owner ? (
                        <span className="font-medium text-neutral-200">
                          {tenant.owner.name} ({tenant.owner.email})
                        </span>
                      ) : (
                        <span className="italic text-neutral-500">Unassigned</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAssigningTenant(tenant);
                        setSelectedOwnerId(tenant.owner?.id ?? null);
                      }}
                      className="h-6 px-1.5 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    >
                      {tenant.owner ? "Manage" : "Assign"}
                    </Button>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800/60 text-center">
                    <div>
                      <span className="text-[10px] uppercase text-neutral-500 block">Catalog</span>
                      <span className="font-semibold text-neutral-200 text-xs">
                        {tenant.productCount} SKUs
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-neutral-500 block">Orders</span>
                      <span className="font-semibold text-neutral-200 text-xs">
                        {tenant.orderCount} Orders
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-neutral-500 block">Revenue</span>
                      <span className="font-semibold text-amber-400 text-xs">
                        ₹{tenant.totalRevenue}
                      </span>
                    </div>
                  </div>
                </CardContent>

                {/* Card Actions Footer */}
                <div className="p-4 pt-0 border-t border-neutral-800/60 mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Suspend / Activate */}
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
                        title="Temporarily suspend website from public storefront"
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
                        title="Activate brand website"
                      >
                        <Power className="w-3.5 h-3.5 mr-1" />
                        Activate
                      </Button>
                    )}

                    {/* Deactivate */}
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
                        title="Deactivate website and remove verified badge"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" />
                        Deactivate
                      </Button>
                    )}

                    {/* Edit Settings */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 px-2 h-7"
                      onClick={() => {
                        setEditingTenant(tenant);
                        setEditFormData({
                          name: tenant.name,
                          description: tenant.description || "",
                          logo: tenant.logo || "",
                          website: tenant.website || "",
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInspectingTenant(tenant)}
                      className="text-xs border-neutral-800 bg-neutral-950 hover:bg-neutral-800 h-7 px-2"
                    >
                      Details
                    </Button>
                    <Link to={`/products?supplierId=${tenant.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-neutral-800 bg-neutral-950 hover:bg-neutral-800 h-7 px-2"
                        title="Open shop catalog view"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}

            {filteredTenants.length === 0 && (
              <div className="col-span-full py-12 text-center bg-neutral-900/40 border border-dashed border-neutral-800 rounded-xl">
                <Globe className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-neutral-400 text-sm">No websites match your filter criteria.</p>
                <Button
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-4 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create Website
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ====================================================================== */}
        {/* TAB 3: SHOP OWNERS                                                     */}
        {/* ====================================================================== */}
        <TabsContent value="owners" className="space-y-4">
          <div className="flex items-center justify-between bg-neutral-900/60 p-4 rounded-lg border border-neutral-800">
            <div>
              <h3 className="text-base font-semibold text-white">Registered Platform Shop Owners</h3>
              <p className="text-xs text-neutral-400">
                Administrative users registered in the database with store owner or platform credentials.
              </p>
            </div>
            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
              {owners.length} Registered Accounts
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {owners.map((owner) => {
              const assignedTenant = tenants.find((t) => t.id === owner.companyId);
              return (
                <Card key={owner.id} className="bg-neutral-900 border-neutral-800 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center text-amber-400 font-semibold text-xs">
                        {owner.name?.slice(0, 2).toUpperCase() || "SO"}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{owner.name}</h4>
                        <p className="text-xs text-neutral-400 font-mono">{owner.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-neutral-700 text-neutral-300 capitalize">
                      {owner.role}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 bg-neutral-950 p-2.5 rounded border border-neutral-800/80 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-500">Assigned Website:</span>
                      <span className="font-semibold text-neutral-200">
                        {assignedTenant ? assignedTenant.name : "Unassigned"}
                      </span>
                    </div>
                    {owner.phone && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-500">Phone:</span>
                        <span className="text-neutral-300 font-mono">{owner.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-500">Account ID:</span>
                      <span className="font-mono text-neutral-400">User #{owner.id}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ====================================================================== */}
        {/* TAB 4: ANALYTICS & USAGE                                               */}
        {/* ====================================================================== */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-neutral-900 border-neutral-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  Website GMV & Sales Breakdown
                </h3>
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                  Real DB Aggregation
                </Badge>
              </div>

              <div className="space-y-3">
                {tenants.map((t) => {
                  const revNum = parseFloat(t.totalRevenue) || 0;
                  const totalRevNum = parseFloat(stats?.totalRevenue ?? "0") || 1;
                  const pct = Math.min(100, Math.round((revNum / (totalRevNum || 1)) * 100));

                  return (
                    <div key={t.id} className="space-y-1.5 bg-neutral-950 p-3 rounded border border-neutral-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-white">{t.name}</span>
                        <span className="font-mono text-amber-400 font-semibold">₹{t.totalRevenue}</span>
                      </div>
                      <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-500 h-1.5 rounded-full"
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-500">
                        <span>{t.orderCount} total orders</span>
                        <span>{t.productCount} catalog fragrances</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  Clickstream & Session Telemetry Status
                </h3>
                <Badge variant="outline" className="text-[10px] border-neutral-700 text-neutral-400">
                  Module Status
                </Badge>
              </div>

              <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-3 text-xs text-neutral-300">
                <div className="flex items-center gap-2 text-amber-400 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  <span>External Telemetry Gateway Not Configured</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Real transaction, inventory, and order analytics are securely computed directly from the Neon PostgreSQL database above. Advanced third-party event streaming (e.g. Google Analytics 4, Mixpanel, or Plausible) requires tenant-level tracking IDs to be configured in platform settings.
                </p>
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
                  <span>Current Provider: Internal Database Aggregation</span>
                  <span className="text-emerald-400">Active</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ====================================================================== */}
        {/* TAB 5: SUBSCRIPTIONS                                                   */}
        {/* ====================================================================== */}
        <TabsContent value="subscriptions" className="space-y-6">
          <Card className="bg-neutral-900 border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  Platform License & Tenant Subscriptions
                </h3>
                <p className="text-xs text-neutral-400">Current SaaS licensing architecture and tenant plan allocation.</p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs font-semibold">
                Self-Hosted Enterprise License
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-2">
                <span className="text-[10px] uppercase text-neutral-500 font-semibold">Platform Tier</span>
                <div className="text-lg font-bold text-white">Full SaaS Platform</div>
                <p className="text-xs text-neutral-400">Unlimited brand tenants, unrestricted catalog SKUs, zero rev-share fees.</p>
              </div>
              <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-2">
                <span className="text-[10px] uppercase text-neutral-500 font-semibold">Active Tenant Seats</span>
                <div className="text-lg font-bold text-amber-400">{tenants.length} / Unlimited</div>
                <p className="text-xs text-neutral-400">Currently partitioned inside dedicated Neon PostgreSQL instance.</p>
              </div>
              <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-2">
                <span className="text-[10px] uppercase text-neutral-500 font-semibold">Recurring Gateway</span>
                <div className="text-lg font-bold text-neutral-300">Not Configured Yet</div>
                <p className="text-xs text-neutral-400">Razorpay Subscriptions / Stripe Billing gateway integration pending.</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-800">
              <h4 className="text-xs font-semibold uppercase text-neutral-400 tracking-wider mb-3">Tenant Subscription Status</h4>
              <div className="space-y-2">
                {tenants.map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-neutral-950 p-3 rounded border border-neutral-800 text-xs">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-amber-400" />
                      <span className="font-medium text-white">{t.name}</span>
                      <span className="text-neutral-500 font-mono text-[11px]">({t.slug})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                        House Enterprise Tier - Active
                      </Badge>
                      <span className="text-[11px] text-neutral-400 font-mono">Billed: Direct / Platform</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ====================================================================== */}
        {/* TAB 6: MONITORING & ERRORS                                             */}
        {/* ====================================================================== */}
        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-neutral-900 border-neutral-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Live Infrastructure Telemetry
                </h3>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
                  Online
                </Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between bg-neutral-950 p-3 rounded border border-neutral-800">
                  <span className="text-neutral-400">PostgreSQL Status:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {healthQuery.data?.database.status === "healthy" ? "Healthy (Connected)" : "Degraded"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-neutral-950 p-3 rounded border border-neutral-800">
                  <span className="text-neutral-400">Query Ping Latency:</span>
                  <span className="font-mono text-neutral-200">
                    {healthQuery.data?.database.latencyMs !== undefined ? `${healthQuery.data.database.latencyMs} ms` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-neutral-950 p-3 rounded border border-neutral-800">
                  <span className="text-neutral-400">Node.js Process Uptime:</span>
                  <span className="font-mono text-neutral-200">
                    {healthQuery.data?.server.uptimeSeconds !== undefined ? `${healthQuery.data.server.uptimeSeconds}s` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-neutral-950 p-3 rounded border border-neutral-800">
                  <span className="text-neutral-400">Runtime Node Version:</span>
                  <span className="font-mono text-neutral-300">{healthQuery.data?.server.nodeVersion ?? "Node.js v22"}</span>
                </div>
              </div>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Exception Aggregation Status
                </h3>
                <Badge variant="outline" className="text-[10px] border-neutral-700 text-neutral-400">
                  Sentry / CloudWatch
                </Badge>
              </div>

              <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-3 text-xs text-neutral-300">
                <div className="flex items-center gap-2 text-neutral-300 font-medium">
                  <XCircle className="w-4 h-4 text-neutral-500" />
                  <span>Central Error Aggregation Not Configured</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  No third-party Sentry DSN or OpenTelemetry collector is configured in environment variables. Runtime API errors are currently captured, sanitized, and logged directly to server process output.
                </p>
                <div className="pt-2 border-t border-neutral-800 text-[11px] text-neutral-500">
                  Server-side error logging: Active on stdout / stderr
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ====================================================================== */}
        {/* TAB 7: AUDIT LOGS                                                      */}
        {/* ====================================================================== */}
        <TabsContent value="audit-logs" className="space-y-4">
          <Card className="bg-neutral-900 border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Platform Action & Verification Log
                </h3>
                <p className="text-xs text-neutral-400">
                  Verifiable security events, tenant status modifications, and Super Master administrative operations.
                </p>
              </div>
              <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                {auditQuery.data?.events.length ?? tenants.length} Verified Events
              </Badge>
            </div>

            <div className="space-y-2">
              {auditQuery.data?.events.map((evt, idx) => (
                <div key={idx} className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] font-mono border-amber-500/30 text-amber-400">
                        {evt.action}
                      </Badge>
                      <span className="font-semibold text-white">{evt.target}</span>
                      <span className="text-neutral-500">•</span>
                      <span className="text-neutral-400">{evt.entity}</span>
                    </div>
                    <p className="text-neutral-400 text-[11px]">{evt.details}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono text-neutral-500 block">
                      {new Date(evt.timestamp).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-emerald-400">{evt.actor}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded bg-neutral-950/80 border border-neutral-800 text-[11px] text-neutral-400">
              <span className="font-semibold text-neutral-300">Notice:</span> {auditQuery.data?.message}
            </div>
          </Card>
        </TabsContent>

        {/* ====================================================================== */}
        {/* TAB 8: PLATFORM SETTINGS                                               */}
        {/* ====================================================================== */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="bg-neutral-900 border-neutral-800 p-6 space-y-6 max-w-3xl">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                SaaS Multi-Tenant Platform Configuration
              </h3>
              <p className="text-xs text-neutral-400">
                Central parameters governing tenant isolation, super master identity, and platform commerce defaults.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-neutral-300">Platform Title</Label>
                  <Input
                    value="The Fragrance Store — House of Brands"
                    disabled
                    className="bg-neutral-950 border-neutral-800 text-neutral-400 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-neutral-300">Authorized Super Master</Label>
                  <Input
                    value={user?.email ?? "mdsohail88008@gmail.com"}
                    disabled
                    className="bg-neutral-950 border-neutral-800 text-amber-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-neutral-300">Base Currency</Label>
                  <Input
                    value="INR (₹) — Indian Rupee"
                    disabled
                    className="bg-neutral-950 border-neutral-800 text-neutral-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-neutral-300">Tenant Isolation Policy</Label>
                  <Input
                    value="Partitioned Supplier ID & Company Filter"
                    disabled
                    className="bg-neutral-950 border-neutral-800 text-emerald-400 font-medium"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2 text-[11px] text-neutral-400">
                <span className="font-semibold text-neutral-200 block">Security Hardening Policy:</span>
                <p>
                  Level 1 Super Master endpoints are secured with server-side bearer / cookie authorization and identity checks against the configured Super Master email. Physical shop deletion is permanently disabled across all procedures to prevent data loss.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ====================================================================== */}
      {/* DIALOG 1: CREATE WEBSITE ONBOARDING FORM                               */}
      {/* ====================================================================== */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>SaaS Website Provisioning</span>
            </div>
            <DialogTitle className="text-xl text-white">Create New Tenant Website</DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Provision an isolated website partition with its own boutique catalog, custom domain routing, and assigned shop owner.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="create-name" className="text-xs text-neutral-300">
                  Website / Shop Name *
                </Label>
                <Input
                  id="create-name"
                  placeholder="e.g. Maison de Niche"
                  value={formData.name}
                  onChange={handleNameChange}
                  className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="create-slug" className="text-xs text-neutral-300">
                  Unique Slug *
                </Label>
                <Input
                  id="create-slug"
                  placeholder="maison-de-niche"
                  value={formData.slug}
                  onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                  className="bg-neutral-950 border-neutral-800 text-white font-mono text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="create-tagline" className="text-xs text-neutral-300">
                Business Description / Tagline
              </Label>
              <Input
                id="create-tagline"
                placeholder="Haute Parfumerie & Artisanal Extraits"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                className="bg-neutral-950 border-neutral-800 text-white text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="create-logo" className="text-xs text-neutral-300">
                Branding Configuration (Logo URL / Asset Path)
              </Label>
              <Input
                id="create-logo"
                placeholder="e.g. /branding/logo.png or https://example.com/logo.png"
                value={formData.logo}
                onChange={(e) => setFormData((p) => ({ ...p, logo: e.target.value }))}
                className="bg-neutral-950 border-neutral-800 text-white text-xs"
              />
              <p className="text-[10px] text-neutral-500">
                Custom boutique emblem displayed on tenant storefront and order documents.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="create-domain" className="text-xs text-neutral-300">
                Custom Domain (Optional)
              </Label>
              <Input
                id="create-domain"
                placeholder="boutique.maisonniche.com"
                value={formData.website}
                onChange={(e) => setFormData((p) => ({ ...p, website: e.target.value }))}
                className="bg-neutral-950 border-neutral-800 text-white font-mono text-xs"
              />
              <p className="text-[10px] text-neutral-500">
                Domain will remain in verification pending status until DNS CNAME is validated.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="create-owner" className="text-xs text-neutral-300">
                Assign Shop Owner
              </Label>
              <select
                id="create-owner"
                value={formData.assignedOwnerId}
                onChange={(e) => setFormData((p) => ({ ...p, assignedOwnerId: e.target.value }))}
                className="w-full h-9 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs px-3 focus:outline-none focus:border-amber-500"
              >
                <option value="">Leave Unassigned (Assign Later)</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.email}) - User #{o.id}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-neutral-500">
                Connects an existing registered administrator account as the primary tenant manager.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="create-email" className="text-xs text-neutral-300">Contact Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="contact@boutique.com"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className="bg-neutral-950 border-neutral-800 text-white text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-city" className="text-xs text-neutral-300">Boutique City</Label>
                <Input
                  id="create-city"
                  placeholder="Mumbai"
                  value={formData.city}
                  onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                  className="bg-neutral-950 border-neutral-800 text-white text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                className="text-neutral-400 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTenantMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
              >
                {createTenantMutation.isPending ? "Provisioning..." : "Create Website"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ====================================================================== */}
      {/* DIALOG 2: EDIT WEBSITE SETTINGS                                        */}
      {/* ====================================================================== */}
      <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-white flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-400" />
              Edit Website Settings: {editingTenant?.name}
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
                  setEditFormError("Website name is required.");
                  return;
                }
                updateTenantMutation.mutate({
                  id: editingTenant.id,
                  name: editFormData.name.trim(),
                  description: editFormData.description.trim() || undefined,
                  logo: editFormData.logo.trim() || undefined,
                  website: editFormData.website.trim() || undefined,
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
                <Label className="text-xs text-neutral-300">Website Name *</Label>
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
                  className="bg-neutral-950 border-neutral-800 text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-neutral-300">Branding Logo (URL / Asset Path)</Label>
                <Input
                  value={editFormData.logo}
                  onChange={(e) => setEditFormData((p) => ({ ...p, logo: e.target.value }))}
                  className="bg-neutral-950 border-neutral-800 text-white text-xs"
                  placeholder="/branding/logo.png"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-neutral-300">Custom Domain</Label>
                <Input
                  value={editFormData.website}
                  onChange={(e) => setEditFormData((p) => ({ ...p, website: e.target.value }))}
                  className="bg-neutral-950 border-neutral-800 text-white text-xs font-mono"
                  placeholder="boutique.brand.com"
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
                  <span>Active Status</span>
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
                  className="text-neutral-400 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateTenantMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
                >
                  {updateTenantMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ====================================================================== */}
      {/* DIALOG 3: ASSIGN SHOP OWNER                                            */}
      {/* ====================================================================== */}
      <Dialog open={!!assigningTenant} onOpenChange={(open) => !open && setAssigningTenant(null)}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-400" />
              Assign Shop Owner
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Assign a registered administrator to manage <span className="text-white font-semibold">{assigningTenant?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-neutral-300">Select Platform Administrator</Label>
              <select
                value={selectedOwnerId ?? ""}
                onChange={(e) => setSelectedOwnerId(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-9 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs px-3 focus:outline-none focus:border-amber-500"
              >
                <option value="">Choose an administrator...</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.email}) - User #{o.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
              <span className="font-semibold text-neutral-200 block">Security Policy:</span>
              <p>
                Assigning an owner links the tenant membership in PostgreSQL and sets the default company context. The user will be authorized to manage products, inventory, and orders for this website.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAssigningTenant(null)}
                className="text-neutral-400 text-xs"
              >
                Cancel
              </Button>
              <Button
                disabled={!selectedOwnerId || assignOwnerMutation.isPending}
                onClick={() => {
                  if (assigningTenant && selectedOwnerId) {
                    assignOwnerMutation.mutate({
                      tenantId: assigningTenant.id,
                      userId: selectedOwnerId,
                    });
                  }
                }}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
              >
                {assignOwnerMutation.isPending ? "Assigning..." : "Confirm Assignment"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====================================================================== */}
      {/* DIALOG 4: VIEW WEBSITE DETAILS                                         */}
      {/* ====================================================================== */}
      <Dialog open={!!inspectingTenant} onOpenChange={(open) => !open && setInspectingTenant(null)}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-400" />
              Website Profile: {inspectingTenant?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Verified platform attributes, tenant routing, and catalog usage metrics.
            </DialogDescription>
          </DialogHeader>

          {inspectingTenant && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase block">Shop ID</span>
                  <span className="font-mono text-white">#{inspectingTenant.id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase block">Unique Slug</span>
                  <span className="font-mono text-amber-400">{inspectingTenant.slug}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase block">Status</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      inspectingTenant.isActive
                        ? "border-emerald-500/30 text-emerald-400"
                        : "border-rose-500/30 text-rose-400"
                    }`}
                  >
                    {inspectingTenant.isActive ? "Active Storefront" : "Suspended"}
                  </Badge>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase block">Verification</span>
                  <span className="text-neutral-300">
                    {inspectingTenant.isVerified ? "Verified House" : "Pending"}
                  </span>
                </div>
              </div>

              <div className="space-y-1 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-500 uppercase block">Domain Configuration</span>
                <p className="font-mono text-neutral-200">
                  {inspectingTenant.website || `${inspectingTenant.slug}.thefragrancestore.com`}
                </p>
                <p className="text-[10px] text-neutral-500 pt-1">
                  Routing Mode: Multi-Tenant Tenant-Partition Subdomain
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-center">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase block">Catalog SKUs</span>
                  <span className="font-bold text-white text-sm">{inspectingTenant.productCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase block">Total Orders</span>
                  <span className="font-bold text-white text-sm">{inspectingTenant.orderCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase block">GMV Sales</span>
                  <span className="font-bold text-amber-400 text-sm">₹{inspectingTenant.totalRevenue}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link to={`/products?supplierId=${inspectingTenant.id}`}>
                  <Button variant="outline" size="sm" className="text-xs border-neutral-800 text-neutral-300">
                    <ExternalLink className="w-3.5 h-3.5 mr-1 text-blue-400" />
                    Open Catalog View
                  </Button>
                </Link>
                <Button
                  size="sm"
                  onClick={() => setInspectingTenant(null)}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
