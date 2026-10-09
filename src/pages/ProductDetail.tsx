import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { addGuestCartItem } from "@/lib/guestCart";
import { formatCurrency, toNumber, unitLabels } from "@/lib/i18n";
import { parseProductOptions } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";
import { ArrowLeft, Check, Minus, Package, Plus, Share2, ShoppingCart, Utensils, Zap } from "lucide-react";
import { resolveProductImageUrl } from "@/lib/image";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [imageFailed, setImageFailed] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [selectedMealChoiceName, setSelectedMealChoiceName] = useState<string>("");
  const [selectedPricingMode, setSelectedPricingMode] = useState<"standard" | "meal" | "only">("standard");
  const [selectedChoice, setSelectedChoice] = useState<string>("");

  const { data, isLoading, isError, error } = trpc.product.bySlug.useQuery({ slug: slug! }, { enabled: !!slug, retry: false });
  const relatedQuery = trpc.product.featured.useQuery({ limit: 5 }, { retry: false });
  const utils = trpc.useUtils();
  const addToCart = trpc.cart.add.useMutation({
    onSuccess: async () => {
      await utils.cart.list.invalidate();
      toast.success("Product added to cart.");
    },
    onError: (error) => toast.error(error.message || "Could not add product to cart."),
  });
  const product = data;
  const minQty = product?.minimumOrderQuantity ?? 1;
  const stock = product?.stock ?? 0;
  const isOutOfStock = stock < minQty;
  const unit = product?.unitType ?? "item";

  const productOptions = useMemo(() => parseProductOptions(product?.options), [product?.options]);
  const hasOptions = productOptions.length > 0;

  // Auto-select first option on load if available
  useEffect(() => {
    if (productOptions.length > 0) {
      if (!selectedOptionId || !productOptions.some((o) => o.id === selectedOptionId)) {
        const first = productOptions[0];
        setSelectedOptionId(first.id);
        if (first.mealOptions?.choices?.length) {
          setSelectedMealChoiceName(first.mealOptions.choices[0].name);
        } else if (first.mealPrice && !first.onlyPrice) {
          setSelectedPricingMode("meal");
        } else if (first.onlyPrice && !first.mealPrice) {
          setSelectedPricingMode("only");
        } else {
          setSelectedPricingMode("standard");
        }

        if (first.choiceGroup?.choices?.length) {
          setSelectedChoice(first.choiceGroup.choices[0]);
        }
      }
    }
  }, [productOptions, selectedOptionId]);

  const selectedOption = useMemo(() => {
    if (!hasOptions) return null;
    return productOptions.find((opt) => opt.id === selectedOptionId) || productOptions[0];
  }, [hasOptions, productOptions, selectedOptionId]);

  const selectedMealChoice = useMemo(() => {
    if (!selectedOption?.mealOptions?.choices?.length) return null;
    return (
      selectedOption.mealOptions.choices.find((c) => c.name === selectedMealChoiceName) ||
      selectedOption.mealOptions.choices[0]
    );
  }, [selectedOption, selectedMealChoiceName]);

  const choiceGroup = selectedOption?.choiceGroup;

  // Synchronize meal option and choice group when style changes
  useEffect(() => {
    if (!selectedOption) return;

    if (selectedOption.mealOptions?.choices?.length) {
      setSelectedMealChoiceName((current) => {
        const exists = selectedOption.mealOptions!.choices.some((c) => c.name === current);
        return exists ? current : selectedOption.mealOptions!.choices[0].name;
      });
    } else {
      setSelectedMealChoiceName("");
    }

    if (selectedOption.choiceGroup?.choices?.length) {
      setSelectedChoice((current) => {
        const exists = selectedOption.choiceGroup!.choices.includes(current);
        return exists ? current : selectedOption.choiceGroup!.choices[0];
      });
    } else {
      setSelectedChoice("");
    }
  }, [selectedOption]);

  const activeIncludedWith = useMemo(() => {
    if (hasOptions) {
      const val = selectedOption?.includedWith;
      return typeof val === "string" && val.trim() ? val.trim() : null;
    }
    const val = product?.includedWith;
    return typeof val === "string" && val.trim() ? val.trim() : null;
  }, [hasOptions, selectedOption?.includedWith, product?.includedWith]);

  const currentImage = (selectedOption?.image && selectedOption.image.trim()) || product?.image || null;

  useEffect(() => {
    setImageFailed(false);
  }, [currentImage]);

  const price = useMemo(() => {
    if (!selectedOption) return toNumber(product?.unitPrice);
    if (selectedMealChoice && (selectedMealChoice.price || 0) > 0) {
      return selectedMealChoice.price;
    }
    if (selectedPricingMode === "meal" && selectedOption.mealPrice) {
      return selectedOption.mealPrice;
    }
    if (selectedPricingMode === "only" && selectedOption.onlyPrice) {
      return selectedOption.onlyPrice;
    }
    return selectedOption.price || toNumber(product?.unitPrice);
  }, [selectedOption, selectedMealChoice, selectedPricingMode, product?.unitPrice]);

  const compareAt = useMemo(() => {
    // In variant mode, compare price must come from the selected variant option
    if (hasOptions) {
      if (
        selectedOption?.compareAtPrice != null &&
        selectedOption.compareAtPrice !== ""
      ) {
        const val = Number(selectedOption.compareAtPrice);
        if (Number.isFinite(val) && val > price) {
          return val;
        }
      }
      return null;
    }

    // In standard mode (no variants), compare price comes from product.compareAtPrice if explicitly configured and greater than price
    const raw = product?.compareAtPrice;
    if (
      raw != null &&
      raw !== "" &&
      raw !== "0" &&
      raw !== "0.00"
    ) {
      const val = toNumber(raw);
      if (Number.isFinite(val) && val > price) {
        return val;
      }
    }

    return null;
  }, [hasOptions, selectedOption, price, product?.compareAtPrice]);

  const resolvedOptionLabel = useMemo(() => {
    if (!selectedOption) return undefined;
    if (selectedMealChoice && selectedChoice) {
      return `${selectedOption.name} - ${selectedMealChoice.name} (${selectedChoice})`;
    }
    if (selectedMealChoice) {
      return `${selectedOption.name} - ${selectedMealChoice.name}`;
    }
    if (selectedChoice) {
      return `${selectedOption.name} (${selectedChoice})`;
    }
    if (selectedPricingMode === "meal" && selectedOption.mealPrice) {
      return `${selectedOption.name} (Meal)`;
    }
    if (selectedPricingMode === "only" && selectedOption.onlyPrice) {
      return `${selectedOption.name} (Only)`;
    }
    return selectedOption.name;
  }, [selectedOption, selectedMealChoice, selectedChoice, selectedPricingMode]);

  const related = useMemo(
    () => (relatedQuery.data ?? []).filter((item) => item.slug !== product?.slug).slice(0, 4),
    [product?.slug, relatedQuery.data],
  );

  useEffect(() => {
    setQuantity(minQty);
  }, [minQty]);

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl min-w-0 mx-auto space-y-6 px-4 md:px-0 pb-20 md:pb-0 overflow-x-hidden">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-[520px] w-full" />
        <CustomerBottomNav active="categories" />
      </div>
    );
  }

  if (!product || isError) {
    return (
      <div className="w-full max-w-xl min-w-0 mx-auto flex min-h-[420px] flex-col items-center justify-center text-center px-4 md:px-0 pb-20 md:pb-0 overflow-x-hidden">
        <Package className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h1 className="text-xl font-semibold break-words">Product not found</h1>
        <p className="mt-2 text-sm text-muted-foreground break-words">
          {error?.message ?? "This product may have been archived or is not available."}
        </p>
        <Link to="/">
          <Button className="mt-5" variant="outline">Back to Home</Button>
        </Link>
        <CustomerBottomNav active="categories" />
      </div>
    );
  }
  const currentProduct = product;

  function addProduct(destination?: string) {
    if (quantity > stock) {
      toast.error("Requested quantity exceeds available stock.");
      return;
    }
    if (hasOptions && !resolvedOptionLabel) {
      toast.error("Please select an option before adding to cart.");
      return;
    }
    if (selectedOption?.mealOptions?.choices?.length && !selectedMealChoice) {
      toast.error("Please select a meal option.");
      return;
    }
    if (choiceGroup && choiceGroup.choices.length > 0 && !selectedChoice) {
      toast.error(`Please select ${choiceGroup.label || "an option"}.`);
      return;
    }

    if (user && data) {
      addToCart.mutate(
        { productId: data.id, quantity, selectedOption: resolvedOptionLabel },
        { onSuccess: () => destination && navigate(destination) }
      );
      return;
    }

    addGuestCartItem({
      id: currentProduct.id,
      productId: currentProduct.id,
      productSlug: currentProduct.slug,
      productName: currentProduct.name,
      productImage: currentImage ?? currentProduct.image ?? null,
      productUnitType: unit,
      productUnitSize: resolvedOptionLabel || currentProduct.unitSize || unit,
      selectedOption: resolvedOptionLabel,
      quantity,
      unitPrice: String(price),
    });
    toast.success("Product added to cart.");
    if (destination) navigate(destination);
  }

  return (
    <div className="w-full max-w-6xl min-w-0 mx-auto flex flex-col gap-5 px-4 md:px-0 pb-20 md:pb-6 overflow-x-hidden">
      <section className="flex items-center justify-between md:border-b md:pb-3 w-full min-w-0">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <div className="hidden md:flex gap-2">
          <Button variant="outline" size="sm"><Share2 className="mr-2 h-4 w-4" />Share</Button>
        </div>
      </section>

      <section className="grid gap-6 lg:gap-8 md:grid-cols-[460px_1fr] lg:grid-cols-[520px_1fr] items-start w-full min-w-0">
        {/* 1. Product Main Image */}
        <div className="w-full max-w-full mx-auto overflow-hidden rounded-2xl border border-border/80 bg-white dark:bg-card p-1 sm:p-1.5 shadow-xs">
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-card p-2 sm:p-3">
            {currentImage && !imageFailed ? (
              <img
                key={currentImage}
                src={resolveProductImageUrl(currentImage)}
                alt={selectedOption?.name ? `${product.name} - ${selectedOption.name}` : product.name}
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full w-full h-full object-contain transition-opacity duration-200 select-none"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <Package className="h-24 w-24 text-muted-foreground/30" />
            )}
          </div>
        </div>

        <div className="space-y-4 w-full min-w-0">
          {/* 2. Product Name & Price */}
          <div className="w-full min-w-0">
            <div className="flex items-baseline justify-between gap-3 sm:gap-4 w-full min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground min-w-0 break-words flex-1">
                {product.name}
              </h1>
              <div className="shrink-0 text-right">
                <span className="text-2xl sm:text-3xl font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(price)}
                </span>
                {compareAt != null && compareAt > price && (
                  <span className="ml-2 text-sm sm:text-base text-muted-foreground line-through">
                    {formatCurrency(compareAt)}
                  </span>
                )}
              </div>
            </div>
            {/* 3. Product description / What Comes With It */}
            {(activeIncludedWith || product.description) && (
              <p className="mt-1.5 text-sm sm:text-base font-normal text-muted-foreground break-words min-w-0">
                {activeIncludedWith || product.description}
              </p>
            )}
          </div>

          {/* 4. Choose Style + 5. Meal Options + 6. Mild / Spicy Choice Group */}
          {hasOptions && (
            <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-3.5 sm:p-4 shadow-xs w-full min-w-0 overflow-hidden">
              {/* 4. Choose Style */}
              <div className="space-y-2.5 w-full min-w-0">
                <div className="flex items-center justify-between gap-x-2.5 gap-y-1 flex-wrap min-w-0 w-full">
                  <div className="inline-flex items-center gap-1.5 min-w-0">
                    <Utensils className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold text-foreground shrink-0">
                      Choose Style
                    </span>
                    <span className="text-[11px] sm:text-xs font-normal text-destructive shrink-0">
                      • Required
                    </span>
                  </div>
                  {selectedOption && (
                    <span className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate max-w-full">
                      Selected: <strong className="font-semibold text-foreground">{selectedOption.name}</strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full min-w-0">
                  {productOptions.map((opt) => {
                    const isSelected = selectedOption?.id === opt.id;
                    const optionImage = opt.image || product.image;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedOptionId(opt.id)}
                        className={`min-w-0 overflow-hidden rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs"
                            : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30"
                        }`}
                      >
                        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-muted/20 p-1 sm:p-1.5">
                          {optionImage ? (
                            <img
                              src={resolveProductImageUrl(optionImage)}
                              alt={`${product.name} - ${opt.name}`}
                              className="max-h-full max-w-full w-full h-full object-contain select-none"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground/35" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 p-1.5 sm:p-2 min-w-0">
                          <div
                            className={`h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted-foreground/40"
                            }`}
                          >
                            {isSelected && <Check className="h-1.5 w-1.5 sm:h-2 sm:w-2 stroke-[3]" />}
                          </div>
                          <p className="min-w-0 truncate text-[11px] sm:text-xs font-semibold leading-tight text-foreground">
                            {opt.name}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Meal Options */}
              {selectedOption?.mealOptions?.choices && selectedOption.mealOptions.choices.length > 0 && (
                <div className="pt-3 border-t border-border/60 w-full min-w-0">
                  <div className="flex items-center gap-x-2 gap-y-1 flex-wrap min-w-0 w-full mb-2">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">
                      {selectedOption.mealOptions.label || "Select Option"}
                    </p>
                    <span className="text-[11px] sm:text-xs font-normal text-destructive">• Required</span>
                  </div>

                  <div className="space-y-2 w-full min-w-0">
                    {selectedOption.mealOptions.choices.map((choice) => {
                      const isSelected = selectedMealChoice?.name === choice.name;
                      return (
                        <button
                          key={choice.name}
                          type="button"
                          onClick={() => setSelectedMealChoiceName(choice.name)}
                          className={`w-full min-w-0 rounded-lg border p-2.5 sm:p-3 text-left transition-all flex items-start gap-2.5 sm:gap-3 cursor-pointer ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/30 shadow-xs"
                              : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/20"
                          }`}
                        >
                          <div
                            className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-muted-foreground/40 bg-background"
                            }`}
                          >
                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2 w-full min-w-0">
                              <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                {choice.name}
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 shrink-0 ml-2">
                                {formatCurrency(choice.price)}
                              </span>
                            </div>
                            {choice.description && choice.description.trim() && (
                              <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground leading-normal break-words">
                                {choice.description.trim()}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Backward compatibility: Legacy Meal vs Only Toggle if Selected Option Offers Both without mealOptions */}
              {selectedOption && !selectedOption.mealOptions?.choices?.length && (selectedOption.mealPrice || selectedOption.onlyPrice) && (
                <div className="pt-3 border-t border-border/60 w-full min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-foreground mb-2">
                    Select Option <span className="font-normal text-destructive">• Required</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2 w-full min-w-0">
                    {selectedOption.onlyPrice != null && (
                      <button
                        type="button"
                        onClick={() => setSelectedPricingMode("only")}
                        className={`py-2 px-2 sm:px-3 rounded-md border text-center text-xs font-semibold transition-all min-w-0 truncate cursor-pointer ${
                          selectedPricingMode === "only"
                            ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                            : "border-border bg-card hover:bg-muted text-foreground"
                        }`}
                      >
                        Only: {formatCurrency(selectedOption.onlyPrice)}
                      </button>
                    )}
                    {selectedOption.mealPrice != null && (
                      <button
                        type="button"
                        onClick={() => setSelectedPricingMode("meal")}
                        className={`py-2 px-2 sm:px-3 rounded-md border text-center text-xs font-semibold transition-all min-w-0 truncate cursor-pointer ${
                          selectedPricingMode === "meal"
                            ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                            : "border-border bg-card hover:bg-muted text-foreground"
                        }`}
                      >
                        Combo Meal: {formatCurrency(selectedOption.mealPrice)}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 6. Choice Group (Mild / Spicy) */}
              {choiceGroup && choiceGroup.choices.length > 0 && (
                <div className="pt-3 border-t border-border/60 w-full min-w-0">
                  <div className="flex items-center gap-x-2 gap-y-1 flex-wrap min-w-0 w-full mb-1.5">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">
                      {choiceGroup.label || "Select one"}
                    </p>
                    <span className="text-[11px] sm:text-xs font-normal text-destructive">• Required</span>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full min-w-0">
                    {choiceGroup.choices.map((choice) => {
                      const isSelected = selectedChoice === choice;
                      return (
                        <button
                          key={choice}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedChoice(choice)}
                          className={`min-w-0 rounded-md border px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                              : "border-border bg-card text-foreground hover:bg-muted"
                          }`}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. Quantity / Add to Cart */}
          <div className="flex flex-col gap-3 mt-4 md:mt-2 w-full min-w-0">
            <div className="flex flex-col gap-2 md:block md:space-y-2 w-full min-w-0">
              <p className="text-sm font-medium hidden md:block">Quantity</p>
              <div className="flex items-center justify-between md:justify-start gap-3 sm:gap-4 flex-wrap w-full min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <Button variant="outline" size="icon" className="h-10 w-10 shadow-sm shrink-0" onClick={() => setQuantity(Math.max(minQty, quantity - 1))} disabled={quantity <= minQty || isOutOfStock}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-14 sm:min-w-16 text-center font-semibold">{quantity} {unitLabels[unit] ?? unit}</span>
                  <Button variant="outline" size="icon" className="h-10 w-10 shadow-sm shrink-0" onClick={() => {
                    if (quantity >= stock) {
                      toast.error(`Only ${stock} available.`);
                    } else {
                      setQuantity(quantity + 1);
                    }
                  }} disabled={isOutOfStock}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-right md:mt-4 md:text-left shrink-0">
                  <p className="text-sm text-muted-foreground md:hidden">Live Total</p>
                  <p className="text-lg font-bold text-foreground md:text-xl whitespace-nowrap">Total : {formatCurrency(price * quantity)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:hidden mt-2 w-full min-w-0">
              <Button variant="outline" className="h-12 bg-card w-full" onClick={() => addProduct("/")} disabled={isOutOfStock}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {isOutOfStock ? "Out of Stock" : "Add & Continue Shopping"}
              </Button>
              <Button className="h-12 bg-primary hover:bg-primary/90 w-full" onClick={() => addProduct("/info")} disabled={isOutOfStock}>
                <Zap className="mr-2 h-4 w-4" />
                {isOutOfStock ? "Out of Stock" : "Buy Now"}
              </Button>
            </div>
            <div className="hidden md:grid gap-3 grid-cols-2 md:mt-4 w-full min-w-0">
              <Button variant="outline" className="h-12 bg-card w-full" onClick={() => addProduct()} disabled={isOutOfStock}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </Button>
              <Button className="h-12 bg-primary hover:bg-primary/90 w-full" onClick={() => addProduct("/info")} disabled={isOutOfStock}>
                <Zap className="mr-2 h-4 w-4" />
                {isOutOfStock ? "Out of Stock" : "Buy Now"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="hidden md:block">
        <DetailSection title="Dietary & Preparation Info">
          100% Certified Halal meats. Prepared fresh to order with authentic spices, warm pita, and signature white and hot sauces.
        </DetailSection>
      </div>
      <DetailSection title="Restaurant & Kitchen Information">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="font-medium text-foreground">Restaurant:</span> {product.supplierName ?? "Tex’s Chicken & Burgers"}</p>
          <p><span className="font-medium text-foreground">Phone / Contact:</span> {product.supplierPhone ?? "+1 (718) 555-0199"}</p>
          <p className="sm:col-span-2"><span className="font-medium text-foreground">Address:</span> {formatSupplierAddress(product)}</p>
        </div>
      </DetailSection>
      {related.length > 0 && (
        <div className="hidden md:block">
          <DetailSection title="You Might Also Like">
            <div className="flex flex-wrap gap-2">
              {related.map((item) => (
                <Link key={item.slug} to={`/products/${item.slug}`} className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
                  {item.name}
                </Link>
              ))}
            </div>
          </DetailSection>
        </div>
      )}

      <CustomerBottomNav active="categories" />
    </div>
  );
}

function formatSupplierAddress(product: {
  supplierAddressLine1?: string | null;
  supplierAddressLine2?: string | null;
  supplierCity?: string | null;
  supplierState?: string | null;
  supplierPostalCode?: string | null;
  supplierCountry?: string | null;
}) {
  return [
    product.supplierAddressLine1,
    product.supplierAddressLine2,
    product.supplierCity,
    product.supplierState,
    product.supplierPostalCode,
    product.supplierCountry,
  ].filter(Boolean).join(", ") || "Not set";
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardContent className="space-y-3 p-4 sm:p-5 break-words min-w-0">
        <h2 className="font-semibold break-words">{title}</h2>
        <div className="text-sm text-muted-foreground break-words min-w-0">{children}</div>
      </CardContent>
    </Card>
  );
}
