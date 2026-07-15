// Mock marketplace data — no backend, no real labs/peptides/orders. Purely
// UI demo content, same spirit as the mock market prices elsewhere in the
// app. Icon field picks a lucide-react icon name resolved in the component.

export type Category = { id: string; label: string; icon: string };

export const CATEGORIES: Category[] = [
  { id: "all", label: "All Peptides", icon: "Hexagon" },
  { id: "weight-loss", label: "Weight Loss", icon: "Flame" },
  { id: "muscle-growth", label: "Muscle Growth", icon: "Dumbbell" },
  { id: "anti-aging", label: "Anti-Aging", icon: "Sparkles" },
  { id: "regenerative", label: "Regenerative", icon: "Recycle" },
  { id: "research-tools", label: "Research Tools", icon: "FlaskConical" },
  { id: "sexual-health", label: "Sexual Health", icon: "Heart" },
  { id: "skin-hair", label: "Skin & Hair", icon: "Sparkle" },
  { id: "cognitive-health", label: "Cognitive Health", icon: "Brain" },
  { id: "other", label: "Other", icon: "MoreHorizontal" },
];

export type Peptide = {
  id: string;
  name: string;
  category: string;
  description: string;
  dosage: string;
  purity: string;
  form: string;
  labCount: number;
  rating: number;
  ratingCount: number;
  priceFrom: number;
  inStock: boolean;
  bestseller?: boolean;
  researchUseOnly: boolean;
  icon: string;
};

export const PEPTIDES: Peptide[] = [
  {
    id: "cjc-1295",
    name: "CJC-1295 No DAC",
    category: "muscle-growth",
    description: "Growth Hormone Releasing Hormone",
    dosage: "5mg",
    purity: "≥99% Purity",
    form: "Lyophilized",
    labCount: 12,
    rating: 4.9,
    ratingCount: 342,
    priceFrom: 65.0,
    inStock: true,
    bestseller: true,
    researchUseOnly: true,
    icon: "Atom",
  },
  {
    id: "bpc-157",
    name: "BPC-157",
    category: "regenerative",
    description: "Body Protection Compound",
    dosage: "5mg",
    purity: "≥98% Purity",
    form: "Lyophilized",
    labCount: 18,
    rating: 4.9,
    ratingCount: 521,
    priceFrom: 58.0,
    inStock: true,
    bestseller: true,
    researchUseOnly: true,
    icon: "Dna",
  },
  {
    id: "tb-500",
    name: "TB-500",
    category: "regenerative",
    description: "Thymosin Beta-4",
    dosage: "5mg",
    purity: "≥98% Purity",
    form: "Lyophilized",
    labCount: 15,
    rating: 4.8,
    ratingCount: 298,
    priceFrom: 72.0,
    inStock: true,
    researchUseOnly: true,
    icon: "Waves",
  },
  {
    id: "ghk-cu",
    name: "GHK-Cu",
    category: "skin-hair",
    description: "Copper Tripeptide-1",
    dosage: "10mg",
    purity: "≥99% Purity",
    form: "Lyophilized",
    labCount: 20,
    rating: 4.9,
    ratingCount: 642,
    priceFrom: 42.0,
    inStock: true,
    researchUseOnly: true,
    icon: "Sparkle",
  },
  {
    id: "ipamorelin",
    name: "Ipamorelin",
    category: "muscle-growth",
    description: "Growth Hormone Secretagogue",
    dosage: "5mg",
    purity: "≥98% Purity",
    form: "Lyophilized",
    labCount: 11,
    rating: 4.7,
    ratingCount: 210,
    priceFrom: 61.0,
    inStock: true,
    researchUseOnly: true,
    icon: "Hexagon",
  },
  {
    id: "semaglutide",
    name: "Semaglutide",
    category: "weight-loss",
    description: "GLP-1 Receptor Agonist",
    dosage: "5mg",
    purity: "≥99% Purity",
    form: "Lyophilized",
    labCount: 9,
    rating: 4.8,
    ratingCount: 187,
    priceFrom: 89.0,
    inStock: true,
    researchUseOnly: true,
    icon: "Flame",
  },
];

export type Lab = {
  id: string;
  name: string;
  verified: boolean;
  rating: number;
  ratingCount: number;
  successRate: number;
  region: string;
  shipTime: string;
  freeShipping: boolean;
  price: number;
};

export const LABS: Lab[] = [
  { id: "purepeptide", name: "PurePeptide Labs", verified: true, rating: 4.9, ratingCount: 342, successRate: 98.7, region: "USA", shipTime: "2-3 Days", freeShipping: true, price: 65.0 },
  { id: "biosynth", name: "BioSynth Research", verified: true, rating: 4.8, ratingCount: 298, successRate: 97.2, region: "EU", shipTime: "3-5 Days", freeShipping: true, price: 68.0 },
  { id: "peptidegenix", name: "PeptideGenix", verified: true, rating: 4.9, ratingCount: 521, successRate: 99.1, region: "USA", shipTime: "2-3 Days", freeShipping: true, price: 70.0 },
];

export const MARKETPLACE_STATS = {
  peptidesListed: "2,450+",
  verifiedLabs: 128,
  successRate: "98.7%",
  avgResponse: "24-48h",
};

export const HOW_IT_WORKS = [
  { step: 1, title: "Browse peptides", description: "Search from thousands of verified peptides" },
  { step: 2, title: "Connect with labs", description: "Compare labs, reviews and request a quote" },
  { step: 3, title: "Order & receive", description: "Secure payment with crypto and fast global shipping" },
];
