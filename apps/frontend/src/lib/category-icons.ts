import type { LucideIcon } from "lucide-react";
import { Droplets, Hammer, HardHat, Package, Paintbrush, Trees, Wrench, Zap } from "lucide-react";

const CATEGORY_ICON_BY_NAME: Record<string, LucideIcon> = {
  droplets: Droplets,
  hammer: Hammer,
  hardhat: HardHat,
  package: Package,
  paintbrush: Paintbrush,
  trees: Trees,
  wrench: Wrench,
  zap: Zap,
};

const CATEGORY_KEYWORD_MATCHERS: Array<{ keywords: string[]; icon: LucideIcon }> = [
  {
    keywords: ["cimento", "argamassa", "construcao", "bloco", "tijolo"],
    icon: HardHat,
  },
  {
    keywords: ["ferramenta", "obra", "reforma"],
    icon: Hammer,
  },
  {
    keywords: ["tinta", "pintura", "acessorio", "acabamento"],
    icon: Paintbrush,
  },
  {
    keywords: ["eletrico", "eletrica", "cabo", "energia"],
    icon: Zap,
  },
  {
    keywords: ["hidraulica", "agua", "cano"],
    icon: Droplets,
  },
  {
    keywords: ["madeira", "madeiras"],
    icon: Trees,
  },
  {
    keywords: ["ferro", "metais", "metal", "serralheria"],
    icon: Wrench,
  },
];

const CATEGORY_COLOR_CLASSES = [
  "text-brand-blue",
  "text-brand-red",
  "text-brand-yellow",
  "text-emerald-600",
];

function normalizeToken(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .toLowerCase();
}

function normalizeLookupText(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getCategoryIcon(iconName?: string, context?: string) {
  const normalizedIconName = normalizeToken(iconName);
  if (normalizedIconName && CATEGORY_ICON_BY_NAME[normalizedIconName]) {
    return CATEGORY_ICON_BY_NAME[normalizedIconName];
  }

  const normalizedContext = normalizeLookupText(context);
  const matched = CATEGORY_KEYWORD_MATCHERS.find(({ keywords }) =>
    keywords.some((keyword) => normalizedContext.includes(keyword)),
  );

  return matched?.icon || Package;
}

export function getCategoryColorClass(index: number) {
  return CATEGORY_COLOR_CLASSES[index % CATEGORY_COLOR_CLASSES.length];
}
