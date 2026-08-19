import { getFashionImageUrl } from "./images";
import type {
  BudgetRange,
  ColorTag,
  Gender,
  Occasion,
  Outfit,
  OutfitItem,
  Product,
  Season,
  StyleTag,
  TrendItem,
} from "@/types";

const STYLES: StyleTag[] = [
  "Minimal",
  "Streetwear",
  "Old Money",
  "Smart Casual",
  "Formal",
  "Casual",
  "Vintage",
  "Y2K",
  "Athleisure",
];

const OCCASIONS: Occasion[] = [
  "Everyday",
  "Date",
  "Office",
  "Wedding",
  "Party",
  "Travel",
];

const SEASONS: Season[] = ["Summer", "Winter", "Monsoon", "Spring"];
const COLORS: ColorTag[] = [
  "Black",
  "White",
  "Beige",
  "Navy",
  "Brown",
  "Green",
  "Grey",
  "Other",
];
const GENDERS: Gender[] = ["men", "women", "unisex"];

const BRANDS = [
  "Uniqlo",
  "Zara",
  "H&M",
  "Mango",
  "Levi's",
  "Nike",
  "Adidas",
  "Raymond",
  "FabIndia",
  "Westside",
  "Marks & Spencer",
  "Allen Solly",
];

const CREATORS = [
  "@styleedit",
  "@minimalmuse",
  "@streetlayer",
  "@oldmoneydaily",
  "@wardrobeedit",
  "@fitcheck",
  "@lookbookin",
  "@neutraltones",
];

const TITLES = [
  "Relaxed Summer Minimal",
  "Urban Street Edge",
  "Old Money Elegance",
  "Smart Office Layers",
  "Monochrome Statement",
  "Casual Weekend Ease",
  "Wedding Guest Charm",
  "Travel Ready Neutrals",
  "Date Night Polish",
  "Oversized Street Cool",
  "Linen Summer Breeze",
  "Winter Layered Warmth",
  "Monsoon Layered Look",
  "Spring Fresh Palette",
  "Vintage Inspired Fit",
  "Y2K Revival Energy",
  "Athleisure Off-Duty",
  "Formal Evening Sharp",
  "Beige Neutral Harmony",
  "Black on Black Edit",
  "Navy Tailored Classic",
  "Earth Tone Weekend",
  "Green Accent Casual",
  "Grey Minimal Uniform",
  "Delhi Wedding Ready",
  "Mumbai Monsoon Layers",
  "Goa Travel Capsule",
  "Office Power Minimal",
  "Party Night Shine",
  "Relaxed Trousers Edit",
];

const DESCRIPTIONS = [
  "A relaxed neutral look built around breathable fabrics and clean proportions.",
  "Streetwear energy with oversized silhouettes and layered textures.",
  "Timeless elegance with refined tailoring and understated luxury.",
  "Polished layers that transition seamlessly from desk to dinner.",
  "A bold monochrome palette with sculptural shapes and sharp lines.",
  "Easy weekend dressing with comfort-first fabrics and relaxed fits.",
  "Celebration-ready styling with refined details and graceful movement.",
  "Packable neutrals designed for effortless travel and versatility.",
  "Evening polish with subtle texture and confident proportions.",
  "Contemporary street style with volume, contrast, and attitude.",
];

const ITEM_NAMES: Record<string, string[]> = {
  shirt: [
    "Linen Oversized Shirt",
    "Oxford Button-Down",
    "Silk Blend Blouse",
    "Cotton Poplin Shirt",
    "Relaxed Camp Collar",
    "Striped Linen Shirt",
  ],
  trousers: [
    "Relaxed Linen Trousers",
    "Tailored Wool Trousers",
    "Wide-Leg Pants",
    "Pleated Chinos",
    "Straight Fit Denim",
    "Cropped Tapered Pants",
  ],
  shoes: [
    "White Leather Sneakers",
    "Suede Loafers",
    "Chelsea Boots",
    "Canvas Slip-Ons",
    "Retro Running Sneakers",
    "Leather Derby Shoes",
  ],
  accessories: [
    "Silver Chain Necklace",
    "Leather Crossbody Bag",
    "Minimalist Watch",
    "Structured Tote",
    "Silk Scarf",
    "Leather Belt",
  ],
  jacket: [
    "Oversized Blazer",
    "Denim Jacket",
    "Wool Overcoat",
    "Bomber Jacket",
    "Trench Coat",
    "Leather Jacket",
  ],
  dress: [
    "Midi Slip Dress",
    "Wrap Midi Dress",
    "Linen Shirt Dress",
    "Satin Evening Dress",
    "Knit Maxi Dress",
    "Pleated Midi Dress",
  ],
};

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function pickMultiple<T>(arr: T[], count: number, seed: number): T[] {
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    result.push(arr[(seed + i * 3) % arr.length]);
  }
  return [...new Set(result)];
}

function getBudgetRange(totalPrice: number): BudgetRange {
  if (totalPrice < 1000) return "under-1000";
  if (totalPrice < 2500) return "1000-2500";
  if (totalPrice < 5000) return "2500-5000";
  return "5000-plus";
}

function generateOutfitItems(seed: number): OutfitItem[] {
  const types: Array<keyof typeof ITEM_NAMES> = [
    "shirt",
    "trousers",
    "shoes",
    "accessories",
  ];
  if (seed % 5 === 0) types.push("jacket");
  if (seed % 7 === 0 && seed % 2 === 0) {
    return [
      {
        id: `item-${seed}-dress`,
        type: "dress",
        name: pick(ITEM_NAMES.dress, seed),
        brand: pick(BRANDS, seed),
        image: getFashionImageUrl(seed + 10, 400),
        price: 1200 + (seed % 8) * 450,
        currency: "INR",
        color: pick(["Beige", "Black", "Navy", "White", "Brown"], seed),
        fit: pick(["Relaxed", "Fitted", "Straight", "Oversized"], seed),
        category: "dress",
      },
      {
        id: `item-${seed}-shoes`,
        type: "shoes",
        name: pick(ITEM_NAMES.shoes, seed + 1),
        brand: pick(BRANDS, seed + 2),
        image: getFashionImageUrl(seed + 20, 400),
        price: 1800 + (seed % 6) * 600,
        currency: "INR",
        color: pick(["White", "Black", "Brown", "Tan"], seed),
        fit: pick(["Regular", "Low-profile", "Chunky"], seed),
        category: "shoes",
      },
      {
        id: `item-${seed}-acc`,
        type: "accessories",
        name: pick(ITEM_NAMES.accessories, seed + 3),
        brand: pick(BRANDS, seed + 4),
        image: getFashionImageUrl(seed + 30, 400),
        price: 500 + (seed % 5) * 350,
        currency: "INR",
        color: pick(["Silver", "Gold", "Black", "Tan"], seed),
        fit: "One Size",
        category: "accessories",
      },
    ];
  }

  return types.map((type, i) => ({
    id: `item-${seed}-${type}`,
    type: type as OutfitItem["type"],
    name: pick(ITEM_NAMES[type], seed + i),
    brand: pick(BRANDS, seed + i + 1),
    image: getFashionImageUrl(seed + i * 7, 400),
    price: 800 + ((seed + i * 11) % 12) * 350,
    currency: "INR",
    color: pick(["Beige", "Black", "Navy", "White", "Brown", "Grey"], seed + i),
    fit: pick(["Relaxed", "Fitted", "Straight", "Oversized", "Slim"], seed + i),
    category: type,
    productUrl: "#",
  }));
}

function generateOutfits(count: number): Outfit[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = i + 1;
    const items = generateOutfitItems(seed);
    const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
    const styles = pickMultiple(STYLES, 2 + (seed % 2), seed);
    const occasions = pickMultiple(OCCASIONS, 1 + (seed % 2), seed + 5);
    const seasons = pickMultiple(SEASONS, 1 + (seed % 2), seed + 10);
    const colors = pickMultiple(COLORS, 2, seed + 15);

    return {
      id: `outfit-${seed}`,
      title: TITLES[seed % TITLES.length],
      image: getFashionImageUrl(seed, 900),
      aspectRatio: [0.65, 0.72, 0.78, 0.85, 0.92, 1.0, 1.08, 1.15, 1.25][
        seed % 9
      ],
      category: pick(
        [
          "Casual",
          "Smart Casual",
          "Streetwear",
          "Formal",
          "Wedding",
          "Travel",
          "Seasonal",
        ],
        seed
      ),
      gender: pick(GENDERS, seed),
      styles,
      occasions,
      seasons,
      colors,
      description: DESCRIPTIONS[seed % DESCRIPTIONS.length],
      items,
      tags: [...styles, ...occasions.slice(0, 1), ...colors.slice(0, 1)],
      likes: 120 + (seed * 37) % 2400,
      saves: 45 + (seed * 23) % 890,
      creator: pick(CREATORS, seed),
      budgetRange: getBudgetRange(totalPrice),
    };
  });
}

function generateProducts(count: number): Product[] {
  const allTypes = Object.keys(ITEM_NAMES) as Array<keyof typeof ITEM_NAMES>;
  return Array.from({ length: count }, (_, i) => {
    const seed = i + 100;
    const type = pick(allTypes, seed);
    return {
      id: `product-${seed}`,
      name: pick(ITEM_NAMES[type], seed),
      brand: pick(BRANDS, seed),
      category: type as Product["category"],
      price: 699 + (seed % 15) * 400,
      currency: "INR",
      image: getFashionImageUrl(seed + 5, 500),
      colors: pickMultiple(["Black", "White", "Beige", "Navy", "Brown"], 2, seed),
      fit: pick(["Relaxed", "Fitted", "Straight", "Oversized", "Slim"], seed),
      styles: pickMultiple(STYLES, 2, seed),
      productUrl: "#",
      similarity: 78 + (seed % 20),
    };
  });
}

export const outfits: Outfit[] = generateOutfits(105);
export const products: Product[] = generateProducts(55);

export const trends: TrendItem[] = [
  { name: "Oversized shirts", change: 32, category: "silhouette" },
  { name: "Earth tones", change: 21, category: "color" },
  { name: "Relaxed trousers", change: 18, category: "silhouette" },
  { name: "Retro sneakers", change: 15, category: "look" },
  { name: "Old Money", change: 28, category: "style" },
  { name: "Monochrome", change: 24, category: "style" },
  { name: "Linen layers", change: 19, category: "look" },
  { name: "Navy tailoring", change: 14, category: "style" },
  { name: "Beige neutrals", change: 22, category: "color" },
  { name: "Wide-leg pants", change: 17, category: "silhouette" },
  { name: "Streetwear layers", change: 26, category: "style" },
  { name: "Minimal basics", change: 20, category: "look" },
];

export const styleCollections = [
  {
    slug: "minimal",
    name: "Minimal",
    description: "Clean lines, neutral palettes, and effortless simplicity.",
    image: getFashionImageUrl(1, 1200),
  },
  {
    slug: "streetwear",
    name: "Streetwear",
    description: "Urban energy with bold silhouettes and layered attitude.",
    image: getFashionImageUrl(8, 1200),
  },
  {
    slug: "old-money",
    name: "Old Money",
    description: "Timeless elegance with refined tailoring and quiet luxury.",
    image: getFashionImageUrl(15, 1200),
  },
  {
    slug: "smart-casual",
    name: "Smart Casual",
    description: "Polished yet relaxed looks for modern everyday life.",
    image: getFashionImageUrl(22, 1200),
  },
];
