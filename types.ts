
export enum Category {
  DESAYUNO = 'Desayuno',
  ALMUERZO = 'Almuerzo',
  CENA = 'Cena',
  MEDIAS_NUEVES = 'Medias Nueves',
  ONCES = 'Onces'
}

export interface Ingredient {
  id: string;
  name: string;
  unit: 'g' | 'ml' | 'und';
  pricePerUnit: number; // Price per g, ml or unit
  isProtein?: boolean;
  isCarb?: boolean;
  isLegume?: boolean;
}

export interface RecipeIngredient {
  ingredientId: string;
  amount: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: Category;
  ingredients: RecipeIngredient[];
  image: string;
}

export interface CartItem {
  id: string;
  recipeId: string;
  recipeName: string;
  category: Category;
  quantity: number;
}

export interface PickingItem {
  name: string;
  totalAmount: number;
  unit: string;
  unitPriceWithMargin: number;
  totalPrice: number;
}

export type AgeRange = '1-3' | '4-6' | '7-9' | '10-12' | '13-15';
export type AppetiteIntensity = 0 | 0.1 | 0.2 | 0.3;

export interface PersonConfig {
  id: string;
  type: 'adult' | 'child';
  ageRange?: AgeRange;
  intensity: AppetiteIntensity;
}
