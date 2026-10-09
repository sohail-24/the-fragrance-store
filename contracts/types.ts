export type * from "../db/schema";
export * from "./errors";

export type ProductMealOptionChoice = {
  name: string;
  description?: string | null;
  price: number;
};

export type ProductMealOptionsGroup = {
  label: string;
  choices: ProductMealOptionChoice[];
};

export type ProductOptionChoiceGroup = {
  label: string;
  choices: string[];
};

export type ProductOption = {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  mealPrice?: number | null;
  onlyPrice?: number | null;
  image?: string | null;
  includedWith?: string | null;
  mealOptions?: ProductMealOptionsGroup;
  choiceGroup?: ProductOptionChoiceGroup;
};

export const ProductOption = {} as unknown as ProductOption;

export function parseProductOptions(value?: unknown): ProductOption[] {
  if (!value) return [];
  try {
    const raw = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item: any, idx: number) => {
        if (!item || typeof item !== "object") return null;
        const name = String(item.name || "").trim();
        const price = Number(item.price ?? item.sellingPrice ?? 0);
        const mealPrice = item.mealPrice != null && Number(item.mealPrice) > 0 ? Number(item.mealPrice) : null;
        const onlyPrice = item.onlyPrice != null && Number(item.onlyPrice) > 0 ? Number(item.onlyPrice) : null;
        const compareAtPrice = item.compareAtPrice != null && Number(item.compareAtPrice) > 0 ? Number(item.compareAtPrice) : null;
        const image = typeof item.image === "string" && item.image.trim() ? item.image.trim() : null;
        const includedWith = typeof item.includedWith === "string" && item.includedWith.trim() ? item.includedWith.trim() : null;

        const parseMealOptions = (group: unknown): ProductMealOptionsGroup | undefined => {
          if (!group || typeof group !== "object") return undefined;
          const label = typeof (group as any)?.label === "string" && (group as any).label.trim()
            ? (group as any).label.trim()
            : "Select Option";
          const rawChoices = Array.isArray((group as any)?.choices) ? (group as any).choices : [];
          const choices: ProductMealOptionChoice[] = rawChoices
            .map((c: unknown) => {
              if (typeof c === "string") {
                const choiceName = c.trim();
                if (!choiceName) return null;
                return { name: choiceName, description: null, price: 0 };
              }
              if (c && typeof c === "object") {
                const choiceName = String((c as any).name || "").trim();
                if (!choiceName) return null;
                const desc = typeof (c as any).description === "string" ? (c as any).description.trim() : null;
                const cPrice = Number((c as any).price ?? 0);
                return {
                  name: choiceName,
                  description: desc || null,
                  price: isNaN(cPrice) ? 0 : cPrice,
                };
              }
              return null;
            })
            .filter((c): c is ProductMealOptionChoice => c !== null);

          return choices.length > 0 ? { label, choices } : undefined;
        };

        const parseChoiceGroup = (group: unknown): ProductOptionChoiceGroup | undefined => {
          const label = typeof (group as any)?.label === "string" ? (group as any).label.trim() : "";
          const choices = Array.isArray((group as any)?.choices)
            ? (group as any).choices.filter((choice: unknown): choice is string => typeof choice === "string").map((choice: string) => choice.trim()).filter(Boolean)
            : [];
          return label && choices.length > 0 ? { label, choices } : undefined;
        };

        const mealOptions = parseMealOptions(item.mealOptions);
        const choiceGroup = parseChoiceGroup(item.choiceGroup);

        const firstMealPrice = mealOptions?.choices.find((c) => c.price > 0)?.price ?? mealOptions?.choices[0]?.price;
        const resolvedPrice = !isNaN(price) && price > 0
          ? price
          : (firstMealPrice || mealPrice || onlyPrice || 0);

        if (!name && resolvedPrice <= 0 && !mealPrice && !onlyPrice && !firstMealPrice) return null;

        return {
          id: item.id ? String(item.id) : `opt-${idx + 1}-${Date.now()}`,
          name: name || `Option ${idx + 1}`,
          price: resolvedPrice,
          compareAtPrice,
          mealPrice,
          onlyPrice,
          image,
          includedWith,
          mealOptions,
          choiceGroup,
        } as ProductOption;
      })
      .filter((opt): opt is ProductOption => opt !== null);
  } catch {
    return [];
  }
}
