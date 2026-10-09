import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate, formatTime } from "@/lib/i18n";
import { getAppRole } from "@/lib/roles";
import { PageHeader } from "@/components/freshflow/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Calendar, ClipboardList, Search, Trash2 } from "lucide-react";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "ready_for_dispatch"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

type DeliveryEstimate =
  | "same_day"
  | "next_day"
  | "within_2_days"
  | "within_3_5_days";

type OrderItemSummary = {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: unknown;
  totalPrice?: unknown;
};

type OrderSummary = {
  id: number;
  orderNumber: string;
  ticketNumber?: string;
  lastFour?: string;
  shippingMobileNumber?: string | null;
  paymentMethod?: string | null;
  totalAmount: unknown;
  status: OrderStatus;
  deliveryEstimate: DeliveryEstimate | null;
  orderedAt: Date;
  relatedCompanyName: string | null;
  itemCount: number;
  items?: OrderItemSummary[];
};

function getOrderTicket(order: OrderSummary): string {
  if (order.ticketNumber) return order.ticketNumber;
  if (order.shippingMobileNumber) {
    const digits = order.shippingMobileNumber.replace(/\D/g, "");
    if (digits.length >= 4) return `T ${digits.slice(-4)}`;
  }
  if (order.orderNumber) {
    const match = order.orderNumber.match(/T[- ]?(\d{4})/i);
    if (match) return `T ${match[1]}`;
    const digits = order.orderNumber.replace(/\D/g, "");
    if (digits.length >= 4) return `T ${digits.slice(-4)}`;
  }
  return order.orderNumber;
}

function getPaymentLabel(method?: string | null): string {
  if (!method || method === "cod") return "Pay at Counter";
  if (method === "upi") return "Online (UPI)";
  return method;
}

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  packed: "Packed",
  ready_for_dispatch: "Ready for Dispatch",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const deliveryLabels: Record<DeliveryEstimate, string> = {
  same_day: "Same Day",
  next_day: "Next Day",
  within_2_days: "Within 2 Days",
  within_3_5_days: "Within 3-5 Days",
};

const pageSize = 10;

export default function Orders() {
  const { user } = useAuth();
  const ownerMode = getAppRole(user) !== "buyer";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [deliveryEstimate, setDeliveryEstimate] = useState<DeliveryEstimate | "all">("all");
  const [page, setPage] = useState(1);
  const [orderToDelete, setOrderToDelete] = useState<OrderSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const ordersQuery = trpc.order.list.useQuery(
    {
      type: ownerMode ? "supplier" : "buyer",
      search: search.trim() || undefined,
      status: status === "all" ? undefined : status,
      deliveryEstimate: deliveryEstimate === "all" ? undefined : deliveryEstimate,
      page,
      size: pageSize,
    },
    { retry: false, refetchInterval: ownerMode ? 10000 : false },
  );

  const deleteOrderMutation = trpc.order.delete.useMutation({
    onSuccess: async () => {
      toast.success("Order deleted successfully");
      setOrderToDelete(null);
      await ordersQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete order");
    },
    onSettled: () => {
      setIsDeleting(false);
    },
  });

  async function handleConfirmDelete() {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      await deleteOrderMutation.mutateAsync({ orderId: orderToDelete.id });
    } catch {
      // Handled in onError
    }
  }

  const orders = (ordersQuery.data?.items ?? []) as OrderSummary[];
  const total = ordersQuery.data?.total ?? 0;
  const hasNextPage = page * pageSize < total;

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
      <PageHeader backTo="/dashboard" backLabel="Back to Dashboard" title={ownerMode ? "Orders" : "My Orders"} />

      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search Orders..."
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(value) => { setStatus(value as OrderStatus | "all"); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={deliveryEstimate} onValueChange={(value) => { setDeliveryEstimate(value as DeliveryEstimate | "all"); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Delivery" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Delivery</SelectItem>
              {Object.entries(deliveryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {ordersQuery.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load orders</AlertTitle>
          <AlertDescription>{ordersQuery.error.message}</AlertDescription>
        </Alert>
      )}

      {ordersQuery.isLoading ? (
        <OrderListSkeleton />
      ) : orders.length ? (
        <>
          {ownerMode ? (
            <OwnerOrdersTable orders={orders} onDelete={(order) => setOrderToDelete(order)} />
          ) : (
            <div className="grid gap-3">
              {orders.map((order, index) => <BuyerOrderCard key={`buyer-order-${order.id || index}-${order.orderNumber || index}`} order={order} />)}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing {orders.length} of {total} orders
            </p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                Previous
              </Button>
              <Button variant="outline" disabled={!hasNextPage} onClick={() => setPage((current) => current + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <EmptyOrders />
      )}

      {/* Confirmation Dialog for Order Deletion */}
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && !isDeleting && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              {orderToDelete && (
                <span>
                  Are you sure you want to permanently delete order{" "}
                  <strong className="font-mono text-foreground">{getOrderTicket(orderToDelete)}</strong>{" "}
                  ({orderToDelete.orderNumber}) and all its associated items from the database? This action cannot be undone.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
            >
              {isDeleting ? "Deleting..." : "Delete Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OwnerOrdersTable({
  orders,
  onDelete,
}: {
  orders: OrderSummary[];
  onDelete: (order: OrderSummary) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        {/* Desktop / Tablet view: clean, responsive table */}
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Ticket</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Ordered Items & Quantities</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order Time</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order, index) => {
                const ticket = getOrderTicket(order);
                return (
                  <TableRow key={`owner-order-row-${order.id || index}-${order.orderNumber || index}`}>
                    <TableCell className="font-medium whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-base text-primary">
                          {ticket}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {order.orderNumber}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {order.relatedCompanyName ?? "Counter Customer"}
                        </span>
                        {order.shippingMobileNumber && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {order.shippingMobileNumber}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[240px] max-w-[340px]">
                      {order.items && order.items.length > 0 ? (
                        <div className="space-y-1.5 py-1">
                          {order.items.map((item, i) => (
                            <div key={item.id || i} className="flex items-center justify-between gap-3 text-xs">
                              <span className="font-medium text-foreground truncate">
                                {item.quantity}× {item.productName}
                              </span>
                              <span className="text-muted-foreground whitespace-nowrap font-mono">
                                {formatCurrency(item.unitPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline" className="font-normal text-xs bg-muted/30">
                        {getPaymentLabel(order.paymentMethod)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col text-xs">
                        <span className="font-medium text-foreground">
                          {formatTime(order.orderedAt)}
                        </span>
                        <span className="text-muted-foreground">
                          {formatDate(order.orderedAt)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`/orders/${order.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                          onClick={() => onDelete(order)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Phone view: 2-column grid showing two order cards side by side */}
        <div className="grid grid-cols-2 gap-2 p-2 sm:gap-3 sm:p-3 md:hidden">
          {orders.map((order, index) => (
            <AdminOrderCard
              key={`admin-order-card-${order.id || index}-${order.orderNumber || index}`}
              order={order}
              onDelete={() => onDelete(order)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminOrderCard({
  order,
  onDelete,
}: {
  order: OrderSummary;
  onDelete: () => void;
}) {
  const ticket = getOrderTicket(order);
  return (
    <Card className="flex flex-col justify-between overflow-hidden border border-border/80 shadow-xs hover:border-primary/30 transition-all bg-card text-left">
      <CardContent className="flex flex-col flex-1 p-2 sm:p-3 gap-2">
        {/* Top: Ticket & Status */}
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <span className="font-mono font-bold text-sm sm:text-base text-primary block truncate">
              {ticket}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono block truncate">
              {order.orderNumber}
            </span>
          </div>
          <OrderStatusBadge status={order.status} compact />
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span className="truncate">{formatTime(order.orderedAt)} • {formatDate(order.orderedAt)}</span>
        </div>

        {/* Customer Info */}
        <div className="text-[11px] leading-tight border-t pt-1.5">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">Customer</span>
          <span className="font-medium text-foreground block truncate">
            {order.relatedCompanyName ?? "Counter Customer"}
          </span>
          {order.shippingMobileNumber && (
            <span className="text-[10px] text-muted-foreground font-mono block truncate">
              {order.shippingMobileNumber}
            </span>
          )}
        </div>

        {/* Ordered items (compact & readable) */}
        <div className="rounded border bg-muted/20 p-1.5 text-[11px] space-y-1">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
            Items ({order.itemCount})
          </span>
          {order.items && order.items.length > 0 ? (
            <div className="space-y-0.5 max-h-24 overflow-y-auto pr-0.5">
              {order.items.map((item, i) => (
                <div key={item.id || i} className="flex items-start justify-between gap-1 text-[11px] leading-tight">
                  <span className="font-medium text-foreground truncate" title={item.productName}>
                    {item.quantity}× {item.productName}
                  </span>
                  <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                    {formatCurrency(item.unitPrice)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">
              {order.itemCount} items
            </span>
          )}
        </div>

        {/* Total & Payment Method */}
        <div className="flex items-baseline justify-between gap-1 pt-1 border-t mt-auto">
          <span className="font-bold text-sm sm:text-base text-foreground font-mono">
            {formatCurrency(order.totalAmount)}
          </span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal bg-muted/40 shrink-0">
            {getPaymentLabel(order.paymentMethod)}
          </Badge>
        </div>

        {/* Action buttons: View & Delete */}
        <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t">
          <Link to={`/orders/${order.id}`} className="w-full">
            <Button variant="outline" size="sm" className="w-full h-7 px-1 text-xs">
              View
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 px-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3 mr-1 shrink-0" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BuyerOrderCard({ order, customerLabel = "Customer" }: { order: OrderSummary; customerLabel?: string }) {
  const ticket = getOrderTicket(order);
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-base text-primary">
                {ticket}
              </span>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {formatTime(order.orderedAt)} • {formatDate(order.orderedAt)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-semibold text-base">{formatCurrency(order.totalAmount)}</p>
            <Badge variant="outline" className="mt-1 text-xs bg-muted/30">
              {getPaymentLabel(order.paymentMethod)}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3 text-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{customerLabel}: {order.relatedCompanyName ?? "Counter Customer"}</span>
            {order.shippingMobileNumber && <span>{order.shippingMobileNumber}</span>}
          </div>
          <div className="border-t pt-2 space-y-1">
            <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
              Ordered Items
            </p>
            {order.items && order.items.length > 0 ? (
              order.items.map((item, i) => (
                <div key={item.id || i} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    {item.quantity}× {item.productName}
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {formatCurrency(item.unitPrice)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">{order.itemCount} items</p>
            )}
          </div>
        </div>

        <Link to={`/orders/${order.id}`}>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <ClipboardList className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function OrderStatusBadge({ status, compact }: { status: OrderStatus; compact?: boolean }) {
  return (
    <Badge
      variant={status === "cancelled" ? "destructive" : status === "delivered" ? "default" : "secondary"}
      className={compact ? "rounded px-1.5 py-0 text-[10px] font-medium shrink-0" : "rounded-md"}
    >
      {statusLabels[status]}
    </Badge>
  );
}

function formatDelivery(value: DeliveryEstimate | null) {
  return value ? deliveryLabels[value] : "Not set";
}

function EmptyOrders() {
  return (
    <Card>
      <CardContent className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
        <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h2 className="font-semibold">No orders found.</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Orders matching the current filters will appear here.
        </p>
      </CardContent>
    </Card>
  );
}

function OrderListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-28" />
      ))}
    </div>
  );
}
