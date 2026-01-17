import { GoogleGenerativeAI } from "@google/generative-ai";
import { CartItem, PickingItem, Ingredient, Recipe, PersonConfig, AgeRange } from "./types";

const getApiKey = () => {
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
};

const apiKey = getApiKey();
let ai: GoogleGenerativeAI | null = null;

if (apiKey && apiKey !== 'PLACEHOLDER_API_KEY') {
  try {
    ai = new GoogleGenerativeAI(apiKey);
  } catch (e) {
    console.warn("Error al inicializar GoogleGenerativeAI:", e);
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

export async function auditCatalog(ingredients: Ingredient[]): Promise<{
  missingPrices: string[];
  suggestedCodes: Record<string, string>;
  optimizationTips: string[];
}> {
  if (!ai) {
    return {
      missingPrices: ingredients.filter(i => (i.cost || 0) <= 0).map(i => i.name),
      suggestedCodes: {},
      optimizationTips: ["Conecta la IA para generar códigos automáticos."]
    };
  }

  const missingPrices = ingredients.filter(i => (i.cost || 0) <= 0).map(i => i.name);

  // Solo auditamos ingredientes sin código de proveedor para ahorrar tokens
  const ingredientsToCode = ingredients.filter(i => !i.supplierCode).slice(0, 20); // Límite por batch

  if (ingredientsToCode.length === 0 && missingPrices.length === 0) {
    return { missingPrices, suggestedCodes: {}, optimizationTips: ["Tu catálogo parece estar en orden."] };
  }

  try {
    const prompt = `
      Actúa como Gerente de Abastecimiento para un e-commerce de alimentos.
      Analiza esta lista de ingredientes y genera códigos SKU estandarizados (formato CAT-000) y consejos de compra.
      
      Ingredientes sin código: ${ingredientsToCode.map(i => i.name).join(', ')}
      Ingredientes sin precio: ${missingPrices.join(', ')}

      Responde SOLO en formato JSON válido con esta estructura:
      {
        "codes": { "NombreIngrediente": "SKU_SUGERIDO" },
        "tips": ["Consejo 1", "Consejo 2"]
      }
    `;

    const model = (ai as any).getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const data = JSON.parse(text);

    return {
      missingPrices,
      suggestedCodes: data.codes || {},
      optimizationTips: data.tips || []
    };
  } catch (error) {
    console.error("Error en auditoría IA:", error);
    return {
      missingPrices,
      suggestedCodes: {},
      optimizationTips: ["Error al conectar con el auditor inteligente."]
    };
  }
}

export async function processBulkImport(
  csvText: string,
  currentIngredients: Ingredient[]
): Promise<{ updates: Partial<Ingredient>[], logs: string[] }> {
  if (!ai) return { updates: [], logs: ["IA no conectada."] };

  try {
    const prompt = `
      Actúa como experto en abastecimiento de alimentos.
      Tengo una lista de ingredientes interna con unidades base (ej: 'g', 'ml', 'und').
      Tengo un texto CSV de un proveedor con precios y unidades variadas (ej: 'lb', 'kg', 'atado', 'litro').

      TU TAREA:
      Para cada fila del CSV del proveedor, encuentra el ingrediente interno correspondiente y calcula el 'cost' (precio de compra) normalizado a la unidad interna.
      
      Reglas de Conversión:
      1 lb = 500g (aproximación de mercado local)
      1 kg = 1000g
      1 litro = 1000ml
      
      CSV PROVEEDOR (Formato: ID, Nombre, CostoNuevo, UnidadNueva):
      ${csvText}

      CATÁLOGO INTERNO (Formato: ID, UnidadInterna):
      ${currentIngredients.map(i => `${i.id} (${i.unit})`).join(', ')}

      Responde SOLO JSON:
      {
        "updates": [
          { "id": "id_interno", "cost": 12.5, "supplierCode": "codigo_proveedor_si_hay" }
        ],
        "logs": ["Papa Pastusa: Convertido de $2000/lb a $4/g"]
      }
    `;

    const model = (ai as any).getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const data = JSON.parse(text);

    return {
      updates: data.updates || [],
      logs: data.logs || []
    };
  } catch (error) {
    console.error("Error en importación masiva:", error);
    return { updates: [], logs: ["Error al procesar con IA."] };
  }
}
