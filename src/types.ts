export interface Ingredient {
  en: string;
  fr: string;
  cat: string;
  nrec: number;
  nmol: number;
}

export interface Tag {
  en: string;
  fr: string;
}

/** [a, b, recipeScore(0-1000), molScore(0-1000), cooc, nShared, compIds, tagIds] */
export type RawPair = [number, number, number, number, number, number, number[], number[]];

export interface PairData {
  ingredients: Ingredient[];
  molecules: string[];
  tags: Tag[];
  pairs: RawPair[];
  meta: { n_recipes: number; sources: string };
}

export interface Partner {
  other: number;
  r: number;
  m: number;
  cooc: number;
  nShared: number;
  comps: number[];
  tags: number[];
}

export const CAT_EMOJI: Record<string, string> = {
  fruit: "🍓", legume: "🥬", herbe: "🌿", epice: "🌶️", viande: "🥩",
  poisson: "🦐", fromage: "🧀", laitier: "🥛", feculent: "🌾",
  noix: "🥜", condiment: "🫙", boisson: "🍷", autre: "🍫",
};
