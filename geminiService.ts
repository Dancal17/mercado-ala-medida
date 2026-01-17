
import { GoogleGenAI } from "@google/genai";
import { CartItem, PickingItem, Ingredient, Recipe, PersonConfig, AgeRange } from "./types";

const getApiKey = () => {
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
};

const apiKey = getApiKey();
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'PLACEHOLDER_API_KEY') {
  try {
    ai = new GoogleGenAI(apiKey);
  } catch (e) {
    console.warn("Error al inicializar GoogleGenAI:", e);
  }
}

const AGE_MULTIPLIERS: Record<AgeRange, number> = {
  '1-3': 0.27,
  '4-6': 0.45,
  '7-9': 0.65,
  '10-12': 0.77,
  '13-15': 0.92
};

function getPersonMultiplier(person: PersonConfig): number {
  const base = person.type === 'adult' ? 1.0 : AGE_MULTIPLIERS[person.ageRange || '7-9'];
  return base * (1 + person.intensity);
}

export async function optimizePickingList(
  cart: CartItem[],
  allRecipes: Recipe[],
  allIngredients: Ingredient[],
  persons: PersonConfig[]
): Promise<{ picking: PickingItem[], suggestions: string[] }> {

  const pickingMap = new Map<string, { amount: number, price: number }>();
  const MARGIN = 1.2;

  // Multiplicador total de la casa sumando los pesos de cada persona
  const totalHouseholdWeight = persons.reduce((acc, p) => acc + getPersonMultiplier(p), 0);

  cart.forEach(item => {
    const recipe = allRecipes.find(r => r.id === item.recipeId);
    if (!recipe) return;

    recipe.ingredients.forEach(ri => {
      const ingredient = allIngredients.find(i => i.id === ri.ingredientId);
      if (!ingredient) return;

      // La receta base es para 1 adulto. 
      // Multiplicamos por la cantidad de veces que se pidió la receta
      // y por el peso total de la casa.
      const totalAmountToAdd = ri.amount * item.quantity * totalHouseholdWeight;

      const existing = pickingMap.get(ingredient.id) || { amount: 0, price: 0 };
      const currentPrice = totalAmountToAdd * ingredient.pricePerUnit * MARGIN;

      pickingMap.set(ingredient.id, {
        amount: existing.amount + totalAmountToAdd,
        price: existing.price + currentPrice
      });
    });
  });

  const pickingList: PickingItem[] = Array.from(pickingMap.entries()).map(([id, data]) => {
    const ingredient = allIngredients.find(i => i.id === id)!;
    const unitPriceWithMargin = ingredient.pricePerUnit * MARGIN;

    return {
      name: ingredient.name,
      totalAmount: Math.round(data.amount * 100) / 100,
      unit: ingredient.unit,
      unitPriceWithMargin: Math.round(unitPriceWithMargin * 100) / 100,
      totalPrice: Math.round(data.price)
    };
  });

  if (!ai) {
    return { picking: pickingList, suggestions: ["Ajusta las proteínas según el crecimiento de los menores.", "Usa recipientes medidores para las porciones infantiles."] };
  }

  try {
    const prompt = `
      Actúa como nutricionista experto en FoodTech.
      Configuración del hogar: ${persons.length} personas. 
      Composición: ${persons.map(p => `${p.type === 'adult' ? 'Adulto' : 'Niño ' + p.ageRange} (Apetito: +${p.intensity * 100}%)`).join(', ')}.
      Recetas seleccionadas: ${cart.map(i => `${i.recipeName} (x${i.quantity})`).join(', ')}.
      Genera 3 consejos breves sobre cómo organizar estos ingredientes crudos para asegurar que los niños reciban sus porciones adecuadas según su edad en Madrid, Cundinamarca.
    `;

    const model = (ai as any).getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const suggestions = text.split('\n').filter(s => s.trim().length > 0).slice(0, 3) || [];
    return { picking: pickingList, suggestions };
  } catch (error) {
    return { picking: pickingList, suggestions: ["Ajusta las proteínas según el crecimiento de los menores.", "Usa recipientes medidores para las porciones infantiles."] };
  }
}
