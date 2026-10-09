import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Clock, ReceiptText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/i18n";
import type { PlacedOrder } from "@/lib/placedOrder";

interface ActiveOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: PlacedOrder[];
}

function formatPlacedTime(timestamp: number): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function getMinutesLeft(createdAt: number): number {
  const windowMs = 30 * 60 * 1000;
  const elapsed = Date.now() - createdAt;
  const remaining = Math.max(0, Math.ceil((windowMs - elapsed) / (60 * 1000)));
  return remaining;
}

export default function ActiveOrdersModal({
  isOpen,
  onClose,
  orders,
}: ActiveOrdersModalProps) {
  const navigate = useNavigate();

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-orders-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-card text-card-foreground border border-border/80 shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-600/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="active-orders-title"
                  className="text-base font-extrabold tracking-tight text-foreground"
                >
                  ACTIVE ORDERS
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {orders.length} {orders.length === 1 ? "order" : "orders"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Orders placed in the last 30 minutes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close active orders"
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Order Cards List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1 divide-y-0">
          {orders.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">
                No active orders at this time.
              </p>
              <p className="text-xs text-muted-foreground/80">
                Orders are accessible for 30 minutes after placement.
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const totalItems = order.items.reduce(
                (sum, item) => sum + (item.quantity || 1),
                0
              );
              const placedTime = formatPlacedTime(order.createdAt);
              const minutesLeft = getMinutesLeft(order.createdAt);

              return (
                <div
                  key={order.id}
                  id={`active-order-${order.id}`}
                  className="rounded-2xl border border-border/80 bg-background/60 hover:bg-muted/20 hover:border-emerald-600/40 p-4 transition-all shadow-xs space-y-3"
                >
                  {/* Top Row: Ticket Number & Time Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-600/20">
                      <span className="text-base sm:text-lg font-black tracking-widest text-emerald-700 dark:text-emerald-400 font-mono">
                        {order.ticketNumber || `T ${order.lastFour}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>{placedTime ? `Placed ${placedTime}` : "Recently placed"}</span>
                      {minutesLeft > 0 && (
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded-md ml-1">
                          {minutesLeft}m left
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Item count & Total */}
                  <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground">
                        {totalItems} {totalItems === 1 ? "item" : "items"}
                      </span>
                      {order.items.length > 0 && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-[240px]">
                          {order.items.map((i) => i.productName).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-black text-base text-foreground tabular-nums">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Action Button: View Bill */}
                  <div className="pt-1 border-t border-border/50 flex justify-end">
                    <Button
                      size="sm"
                      id={`view-bill-btn-${order.id}`}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-xl shadow-xs"
                      onClick={() => {
                        onClose();
                        navigate(`/bill?orderId=${encodeURIComponent(order.id)}`);
                      }}
                    >
                      View Bill
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
