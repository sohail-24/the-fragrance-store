import React, { useState } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { formatCurrency, toNumber } from "@/lib/i18n";
import { uploadProductImage, resolveProductImageUrl } from "@/lib/image";
import type { ProductOption } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Flame, ImagePlus, Layers, Plus, Sparkles, Trash2, UploadCloud, Utensils, X } from "lucide-react";

interface ProductOptionsEditorProps {
  options: ProductOption[];
  onChange: (options: ProductOption[]) => void;
  basePrice?: number | string;
  onBasePriceChange?: (price: string) => void;
}

export function getPresetOptions(presetName: string, basePrice?: number | string): ProductOption[] {
  let presetOptions: ProductOption[] = [];
  if (presetName === "signature-chicken") {
    presetOptions = [
      {
        id: nanoid(6),
        name: "2 PC",
        price: 10.49,
        mealPrice: null,
        onlyPrice: null,
        mealOptions: {
          label: "Select Option",
          choices: [
            { name: "Meal", description: "1 Reg Side & Biscuit", price: 10.49 },
            { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 11.49 },
          ],
        },
        choiceGroup: { label: "Select one", choices: ["Mild", "Spicy"] },
      },
      {
        id: nanoid(6),
        name: "3 PC",
        price: 12.49,
        mealPrice: null,
        onlyPrice: null,
        mealOptions: {
          label: "Select Option",
          choices: [
            { name: "Meal", description: "1 Reg Side & Biscuit", price: 12.49 },
            { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 13.49 },
          ],
        },
        choiceGroup: { label: "Select one", choices: ["Mild", "Spicy"] },
      },
      {
        id: nanoid(6),
        name: "4 PC",
        price: 14.49,
        mealPrice: null,
        onlyPrice: null,
        mealOptions: {
          label: "Select Option",
          choices: [
            { name: "Meal", description: "1 Reg Side & Biscuit", price: 14.49 },
            { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 15.49 },
          ],
        },
        choiceGroup: { label: "Select one", choices: ["Mild", "Spicy"] },
      },
    ];
  } else if (presetName === "fiery-wings") {
    presetOptions = [
      {
        id: nanoid(6),
        name: "6 PC",
        price: 11.99,
        mealPrice: null,
        onlyPrice: null,
        mealOptions: {
          label: "Select Option",
          choices: [
            { name: "Meal", description: "1 Reg Side & Dip", price: 11.99 },
            { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 12.99 },
          ],
        },
        choiceGroup: { label: "Select one", choices: ["Mild", "Spicy"] },
      },
      {
        id: nanoid(6),
        name: "15 PC",
        price: 22.99,
        mealPrice: null,
        onlyPrice: null,
        mealOptions: {
          label: "Select Option",
          choices: [
            { name: "Meal", description: "1 Reg Side & Dip", price: 22.99 },
            { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 24.99 },
          ],
        },
        choiceGroup: { label: "Select one", choices: ["Mild", "Spicy"] },
      },
    ];
  } else if (presetName === "sandwich") {
    presetOptions = [
      {
        id: nanoid(6),
        name: "Classic",
        price: 5.88,
        mealPrice: null,
        onlyPrice: null,
        mealOptions: {
          label: "Select Option",
          choices: [
            { name: "Meal", description: "1 Reg Side & Red Drink", price: 5.88 },
            { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 6.88 },
          ],
        },
        choiceGroup: {
          label: "Select one",
          choices: ["Mild", "Spicy"],
        },
      },
      {
        id: nanoid(6),
        name: "Deluxe",
        price: 6.88,
        mealPrice: null,
        onlyPrice: null,
        mealOptions: {
          label: "Select Option",
          choices: [
            { name: "Meal", description: "1 Reg Side & Red Drink", price: 6.88 },
            { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 7.88 },
          ],
        },
        choiceGroup: {
          label: "Select one",
          choices: ["Mild", "Spicy"],
        },
      },
      {
        id: nanoid(6),
        name: "Grilled",
        price: 7.38,
        mealPrice: null,
        onlyPrice: null,
        mealOptions: {
          label: "Select Option",
          choices: [
            { name: "Meal", description: "1 Reg Side & Red Drink", price: 7.38 },
            { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 8.38 },
          ],
        },
        choiceGroup: {
          label: "Select one",
          choices: ["Mild", "Spicy"],
        },
      },
    ];
  } else if (presetName === "tenders") {
    presetOptions = [
      {
        id: nanoid(6),
        name: "3 PC",
        price: 9.49,
        mealPrice: null,
        onlyPrice: null,
        mealOptions: {
          label: "Select Option",
          choices: [
            { name: "Meal", description: "1 Reg Side & Dip", price: 9.49 },
            { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 10.49 },
          ],
        },
        choiceGroup: { label: "Select one", choices: ["Mild", "Spicy"] },
      },
      {
        id: nanoid(6),
        name: "5 PC",
        price: 12.99,
        mealPrice: null,
        onlyPrice: null,
        mealOptions: {
          label: "Select Option",
          choices: [
            { name: "Meal", description: "1 Reg Side & Dip", price: 12.99 },
            { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 13.99 },
          ],
        },
        choiceGroup: { label: "Select one", choices: ["Mild", "Spicy"] },
      },
    ];
  } else if (presetName === "meal-only") {
    presetOptions = [
      {
        id: nanoid(6),
        name: "Regular Order",
        price: 10.99,
        mealPrice: null,
        onlyPrice: null,
        mealOptions: {
          label: "Select Option",
          choices: [
            { name: "Meal", description: "1 Reg Side & Drink", price: 10.99 },
            { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 11.99 },
          ],
        },
        choiceGroup: { label: "Select one", choices: ["Mild", "Spicy"] },
      },
    ];
  }
  return presetOptions;
}

export function ProductOptionsEditor({
  options,
  onChange,
  basePrice,
  onBasePriceChange,
}: ProductOptionsEditorProps) {
  const [uploadingOptionId, setUploadingOptionId] = useState<string | null>(null);

  const handleImageUpload = async (optionId: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPEG, WebP).");
      return;
    }
    setUploadingOptionId(optionId);
    try {
      const url = await uploadProductImage(file);
      updateOption(optionId, { image: url });
      toast.success("Variant image uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload variant image.");
    } finally {
      setUploadingOptionId(null);
    }
  };

  const addOption = () => {
    const base = toNumber(basePrice) || 5.88;
    const newOption: ProductOption = {
      id: nanoid(6),
      name: `Option ${options.length + 1}`,
      price: base,
      compareAtPrice: null,
      mealPrice: null,
      onlyPrice: null,
      image: null,
      includedWith: null,
      mealOptions: {
        label: "Select Option",
        choices: [
          { name: "Meal", description: "1 Reg Side & Red Drink", price: base },
          { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: +(base + 1).toFixed(2) },
        ],
      },
      choiceGroup: {
        label: "Select one",
        choices: ["Mild", "Spicy"],
      },
    };
    onChange([...options, newOption]);
  };

  const updateOption = (id: string, updates: Partial<ProductOption>) => {
    const next = options.map((opt) => (opt.id === id ? { ...opt, ...updates } : opt));
    onChange(next);
  };

  const removeOption = (id: string) => {
    onChange(options.filter((opt) => opt.id !== id));
  };

  const applyPreset = (presetName: string) => {
    const presetOptions = getPresetOptions(presetName, basePrice);
    if (presetOptions.length > 0) {
      onChange(presetOptions);
      if (onBasePriceChange && presetOptions[0]) {
        onBasePriceChange(String(presetOptions[0].price));
      }
    }
  };

  return (
    <Card className="border-emerald-200/60 bg-card shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Layers className="h-4 w-4 text-emerald-600" />
                Multiple Price Options & Product Variants
              </CardTitle>
              {options.length > 0 ? (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 bg-emerald-50/50 text-[11px] font-normal py-0 h-5">
                  Variant Mode Active ({options.length} {options.length === 1 ? "Option" : "Options"})
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[11px] font-normal py-0 h-5">
                  Standard Mode
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              {options.length > 0
                ? "Variant Mode is active. Variant pricing and the first variant image serve as the product's primary price and photo."
                : "Configure multiple options (e.g. 2 PC, 3 PC, 4 PC or SM/LG) to activate Variant Mode."}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOption}
            className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 shrink-0"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Option
          </Button>
        </div>

        {/* Quick Menu Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          <span className="text-[11px] font-medium text-muted-foreground mr-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" /> Quick Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset("signature-chicken")}
            className="text-[11px] bg-muted/60 hover:bg-muted text-foreground px-2 py-0.5 rounded border border-border transition-colors"
          >
            Signature (2, 3, 4 PC)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("fiery-wings")}
            className="text-[11px] bg-muted/60 hover:bg-muted text-foreground px-2 py-0.5 rounded border border-border transition-colors"
          >
            Wings (6, 15 PC)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("sandwich")}
            className="text-[11px] bg-muted/60 hover:bg-muted text-foreground px-2 py-0.5 rounded border border-border transition-colors"
          >
            Sandwiches (Classic, Deluxe, Grilled)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("tenders")}
            className="text-[11px] bg-muted/60 hover:bg-muted text-foreground px-2 py-0.5 rounded border border-border transition-colors"
          >
            Tenders (3, 5 PC)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("meal-only")}
            className="text-[11px] bg-muted/60 hover:bg-muted text-foreground px-2 py-0.5 rounded border border-border transition-colors"
          >
            Meal vs Only
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {options.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-6 text-center">
            <Utensils className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium text-foreground">Single Standard Price (No Variants)</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
              Currently this item has one standard price. If this dish comes in multiple portions or sizes (like 2 PC / 3 PC / 4 PC), click &ldquo;Add Option&rdquo; or pick a preset above.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
              className="mt-3 text-xs"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Enable Multiple Options
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>{options.length} {options.length === 1 ? "Option" : "Options"} Defined</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-destructive hover:underline text-[11px]"
              >
                Clear all options (revert to single price)
              </button>
            </div>

            <div className="space-y-2.5">
              {options.map((opt, index) => (
                <div
                  key={opt.id}
                  className="rounded-lg border border-border bg-card p-3 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        {index + 1}
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        Option #{index + 1}
                      </span>
                      {index === 0 && (
                        <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0 h-4">
                          Default Product Image
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOption(opt.id)}
                      title="Remove option"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3.5 items-start">
                    {/* Variant Image Area */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0 w-28 sm:w-32">
                      <div className="relative aspect-square w-28 h-28 sm:w-32 sm:h-32 rounded-lg border border-border bg-muted/20 overflow-hidden flex items-center justify-center group">
                        {opt.image ? (
                          <>
                            <img
                              src={resolveProductImageUrl(opt.image)}
                              alt={opt.name || "Variant image"}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateOption(opt.id, { image: null });
                              }}
                              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-muted-foreground flex items-center justify-center shadow-xs transition-colors"
                              title="Remove variant image"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            {index === 0 && (
                              <div className="absolute inset-x-0 bottom-0 bg-emerald-700/90 py-0.5 text-center text-[9px] font-semibold text-white">
                                Default Store Image
                              </div>
                            )}
                          </>
                        ) : index === 0 ? (
                          <label
                            htmlFor={`opt-file-${opt.id}`}
                            className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-2 text-center hover:bg-muted/40 transition-colors"
                          >
                            <ImagePlus className="h-6 w-6 text-emerald-600 mb-1" />
                            <span className="text-[10px] text-emerald-700 font-semibold">Upload Default Photo</span>
                            <span className="text-[9px] text-muted-foreground/80">Used on Home & Catalog</span>
                          </label>
                        ) : (
                          <label
                            htmlFor={`opt-file-${opt.id}`}
                            className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-2 text-center hover:bg-muted/40 transition-colors"
                          >
                            <ImagePlus className="h-6 w-6 text-muted-foreground/50 mb-1" />
                            <span className="text-[10px] text-muted-foreground font-medium">No variant image</span>
                            <span className="text-[9px] text-muted-foreground/70">Falls back to Option #1</span>
                          </label>
                        )}
                      </div>

                      {/* Hidden File Input */}
                      <input
                        id={`opt-file-${opt.id}`}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={uploadingOptionId === opt.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(opt.id, file);
                          e.target.value = "";
                        }}
                      />

                      {/* Upload / Change Image Label Button */}
                      <label
                        htmlFor={`opt-file-${opt.id}`}
                        className={`w-full cursor-pointer inline-flex items-center justify-center rounded-md text-[11px] font-medium border border-input bg-background hover:bg-muted h-7 px-2 transition-colors ${
                          uploadingOptionId === opt.id ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        {uploadingOptionId === opt.id ? (
                          <>
                            <span className="h-3 w-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-1.5" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <UploadCloud className="mr-1 h-3 w-3 shrink-0 text-emerald-600" />
                            {opt.image ? "Change Image" : "Upload Image"}
                          </>
                        )}
                      </label>
                    </div>

                    {/* Inputs Grid */}
                    <div className="flex-1 min-w-0 space-y-3 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[11px] font-bold text-foreground">Option Label *</Label>
                          <Input
                            value={opt.name}
                            onChange={(e) => updateOption(opt.id, { name: e.target.value })}
                            placeholder="e.g. SM, 2 PC, Classic"
                            className="h-8 text-xs font-medium mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] font-normal text-muted-foreground">What Comes With It</Label>
                          <Input
                            value={opt.includedWith ?? ""}
                            onChange={(e) => updateOption(opt.id, { includedWith: e.target.value })}
                            placeholder="e.g. With Fries and Juice"
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                      </div>

                      {/* Meal Options */}
                      {(() => {
                        const currentMealOptions: import("@/types").ProductMealOptionsGroup = opt.mealOptions ?? {
                          label: "Select Option",
                          choices: [
                            { name: "Meal", description: "1 Reg Side & Red Drink", price: opt.price || 5.88 },
                            { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: opt.price ? +(opt.price + 1).toFixed(2) : 6.88 },
                          ],
                        };

                        return (
                          <div className="rounded-md border border-dashed border-border/80 bg-muted/15 p-3 space-y-3">
                            <div>
                              <Label className="text-[11px] font-bold text-foreground">Meal Options</Label>
                              <p className="text-[10px] text-muted-foreground">
                                Customer selection for meal formats (e.g. Meal, Large Meals). Each choice sets its own price.
                              </p>
                            </div>

                            <div className="space-y-3 pt-1">
                              <div>
                                <Label className="text-[11px] font-medium text-foreground">Label</Label>
                                <Input
                                  value={currentMealOptions.label}
                                  onChange={(e) => {
                                    const nextMealOptions = { ...currentMealOptions, label: e.target.value };
                                    updateOption(opt.id, { mealOptions: nextMealOptions });
                                  }}
                                  placeholder="Select Option"
                                  className="mt-1 h-8 text-xs"
                                />
                              </div>

                              <div className="space-y-2.5">
                                <Label className="text-[11px] font-medium text-foreground">Choices</Label>
                                {currentMealOptions.choices.map((choice, choiceIndex) => (
                                  <div key={choiceIndex} className="rounded-md border bg-card p-3 space-y-2 shadow-2xs">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-bold text-foreground">
                                        Choice #{choiceIndex + 1}
                                      </span>
                                      {currentMealOptions.choices.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
                                          onClick={() => {
                                            const nextChoices = currentMealOptions.choices.filter((_, index) => index !== choiceIndex);
                                            const nextGroup = { ...currentMealOptions, choices: nextChoices };
                                            updateOption(opt.id, {
                                              mealOptions: nextGroup,
                                              price: nextChoices[0]?.price ?? opt.price,
                                            });
                                          }}
                                        >
                                          Remove Choice
                                        </Button>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                                      <div className="sm:col-span-4">
                                        <Label className="text-[10px] font-medium text-foreground">Name *</Label>
                                        <Input
                                          value={choice.name}
                                          onChange={(e) => {
                                            const choices = [...currentMealOptions.choices];
                                            choices[choiceIndex] = { ...choice, name: e.target.value };
                                            updateOption(opt.id, { mealOptions: { ...currentMealOptions, choices } });
                                          }}
                                          placeholder={choiceIndex === 0 ? "Meal" : "Large Meals"}
                                          className="mt-1 h-8 text-xs font-medium"
                                        />
                                      </div>

                                      <div className="sm:col-span-5">
                                        <Label className="text-[10px] font-medium text-muted-foreground">What Comes With It</Label>
                                        <Input
                                          value={choice.description ?? ""}
                                          onChange={(e) => {
                                            const choices = [...currentMealOptions.choices];
                                            choices[choiceIndex] = { ...choice, description: e.target.value };
                                            updateOption(opt.id, { mealOptions: { ...currentMealOptions, choices } });
                                          }}
                                          placeholder={choiceIndex === 0 ? "1 Reg Side & Red Drink" : "2 Reg Sides & Lg Drink"}
                                          className="mt-1 h-8 text-xs"
                                        />
                                      </div>

                                      <div className="sm:col-span-3">
                                        <Label className="text-[10px] font-bold text-foreground">Price ($) *</Label>
                                        <div className="relative mt-1">
                                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                            $
                                          </span>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={choice.price || ""}
                                            onChange={(e) => {
                                              const val = e.target.value ? Number(e.target.value) : 0;
                                              const choices = [...currentMealOptions.choices];
                                              choices[choiceIndex] = { ...choice, price: val };
                                              const newBase = choiceIndex === 0 ? val : (currentMealOptions.choices[0]?.price || val);
                                              updateOption(opt.id, {
                                                mealOptions: { ...currentMealOptions, choices },
                                                price: newBase,
                                              });
                                            }}
                                            placeholder={choiceIndex === 0 ? "5.88" : "6.88"}
                                            className="h-8 text-xs font-bold pl-6"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-[11px]"
                                  onClick={() => {
                                    const choices = [
                                      ...currentMealOptions.choices,
                                      { name: "", description: "", price: 0 },
                                    ];
                                    updateOption(opt.id, {
                                      mealOptions: { ...currentMealOptions, choices },
                                    });
                                  }}
                                >
                                  <Plus className="mr-1 h-3 w-3" /> Add Choice
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Choice Group */}
                      <div className="rounded-md border border-dashed border-border/80 bg-muted/15 p-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <Label className="text-[11px] font-bold text-foreground">Choice Group</Label>
                            <p className="text-[10px] text-muted-foreground">Optional customer choice for this option. It does not change variant pricing.</p>
                          </div>
                          {opt.choiceGroup ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                              onClick={() => updateOption(opt.id, { choiceGroup: undefined })}
                            >
                              Remove Choice Group
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => updateOption(opt.id, { choiceGroup: { label: "Select one", choices: ["Mild", "Spicy"] } })}
                            >
                              <Plus className="mr-1 h-3 w-3" /> Add Choice Group
                            </Button>
                          )}
                        </div>

                        {opt.choiceGroup && (
                          <div className="space-y-2 pt-1">
                            <div>
                              <Label className="text-[11px] font-medium text-foreground">Label</Label>
                              <Input
                                value={opt.choiceGroup.label}
                                onChange={(e) => updateOption(opt.id, {
                                  choiceGroup: { ...opt.choiceGroup!, label: e.target.value },
                                })}
                                placeholder="Select one"
                                className="mt-1 h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-medium text-foreground">Choices</Label>
                              {opt.choiceGroup.choices.map((choice, choiceIndex) => (
                                <div key={choiceIndex} className="flex gap-2">
                                  <Input
                                    value={choice}
                                    onChange={(e) => {
                                      const choices = [...opt.choiceGroup!.choices];
                                      choices[choiceIndex] = e.target.value;
                                      updateOption(opt.id, { choiceGroup: { ...opt.choiceGroup!, choices } });
                                    }}
                                    placeholder={choiceIndex === 0 ? "Mild" : "Spicy"}
                                    className="h-8 text-xs"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-[11px] text-destructive hover:text-destructive"
                                    onClick={() => updateOption(opt.id, {
                                      choiceGroup: {
                                        ...opt.choiceGroup!,
                                        choices: opt.choiceGroup!.choices.filter((_, index) => index !== choiceIndex),
                                      },
                                    })}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => updateOption(opt.id, {
                                  choiceGroup: { ...opt.choiceGroup!, choices: [...(opt.choiceGroup!.choices || []), ""] },
                                })}
                              >
                                <Plus className="mr-1 h-3 w-3" /> Add Choice
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Storefront Customer View Summary */}
            <div className="mt-3 rounded-lg border border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Storefront Customer Experience:
              </p>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400 mt-1">
                Customers on the product page will see radio selection buttons for each option (
                {options.map((o) => {
                  const mealPrices = o.mealOptions?.choices?.filter(c => (c.price || 0) > 0).map(c => `${c.name}: ${formatCurrency(c.price)}`).join(", ");
                  const displayPrice = mealPrices || formatCurrency(o.price);
                  return `${o.name}${o.includedWith ? ` [${o.includedWith}]` : ''} (${displayPrice})`;
                }).join(", ")}) and cannot add the item to cart without selecting their option.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
