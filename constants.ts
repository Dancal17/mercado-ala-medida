
import { Category, Ingredient, Recipe } from './types';

// Precios Corabastos 2025 (Simulados basados en tendencias)
// Precios por GRAMO o UNIDAD
export const INGREDIENTS: Ingredient[] = [
  { id: 'papa-pastusa', name: 'Papa Pastusa', unit: 'g', pricePerUnit: 2.5, isCarb: true },
  { id: 'papa-sabanera', name: 'Papa Sabanera', unit: 'g', pricePerUnit: 3.2, isCarb: true },
  { id: 'pollo-pechuga', name: 'Pechuga de Pollo', unit: 'g', pricePerUnit: 18.0, isProtein: true },
  { id: 'carne-res-costilla', name: 'Costilla de Res', unit: 'g', pricePerUnit: 22.0, isProtein: true },
  { id: 'carne-res-molida', name: 'Carne Molida', unit: 'g', pricePerUnit: 20.0, isProtein: true },
  { id: 'cilantro', name: 'Cilantro Fresh', unit: 'g', pricePerUnit: 1.5 },
  { id: 'cebolla-larga', name: 'Cebolla Larga', unit: 'g', pricePerUnit: 1.8 },
  { id: 'aguacate-hass', name: 'Aguacate Hass', unit: 'und', pricePerUnit: 3500 },
  { id: 'arroz-blanco', name: 'Arroz Blanco', unit: 'g', pricePerUnit: 4.5, isCarb: true },
  { id: 'frijol-bola-roja', name: 'Fríjol Bola Roja', unit: 'g', pricePerUnit: 12.0, isProtein: true, isLegume: true },
  { id: 'guineo-verde', name: 'Guineo Verde', unit: 'g', pricePerUnit: 2.8, isCarb: true },
  { id: 'leche-entera', name: 'Leche Entera', unit: 'ml', pricePerUnit: 4.2 },
  { id: 'chocolate-santafereno', name: 'Pastilla de Chocolate', unit: 'und', pricePerUnit: 800 },
  { id: 'queso-campesino', name: 'Queso Campesino', unit: 'g', pricePerUnit: 25.0, isProtein: true },
  { id: 'panela', name: 'Panela', unit: 'g', pricePerUnit: 3.5 },
  { id: 'huevo-aa', name: 'Huevo AA', unit: 'und', pricePerUnit: 650, isProtein: true },
  { id: 'almojabana', name: 'Almojábana', unit: 'und', pricePerUnit: 2500 },
  { id: 'platano-maduro', name: 'Plátano Maduro', unit: 'g', pricePerUnit: 3.8, isCarb: true },
  // Nuevos ingredientes
  { id: 'ajo', name: 'Ajo', unit: 'und', pricePerUnit: 200 },
  { id: 'tomate-maduro', name: 'Tomate Maduro', unit: 'g', pricePerUnit: 3.5 },
  { id: 'calado', name: 'Calado', unit: 'und', pricePerUnit: 300, isCarb: true },
  { id: 'aceite', name: 'Aceite Vegetal', unit: 'ml', pricePerUnit: 12.0 },
  { id: 'lenteja-seca', name: 'Lenteja', unit: 'g', pricePerUnit: 9.0, isProtein: true, isLegume: true },
  { id: 'cebolla-cabezona', name: 'Cebolla Cabezona', unit: 'g', pricePerUnit: 3.0 },
  { id: 'avena-hojuelas', name: 'Avena en Hojuelas', unit: 'g', pricePerUnit: 7.0, isCarb: true },
  { id: 'fresa-mora', name: 'Frutos Rojos', unit: 'g', pricePerUnit: 12.0 },
  { id: 'miel', name: 'Miel de Abejas', unit: 'ml', pricePerUnit: 25.0 },
  { id: 'canela', name: 'Canela', unit: 'und', pricePerUnit: 500 },
  { id: 'pan-tajado', name: 'Pan Tajado', unit: 'und', pricePerUnit: 400, isCarb: true },
  { id: 'queso-doble-crema', name: 'Queso Doble Crema', unit: 'und', pricePerUnit: 900, isProtein: true },
  { id: 'mantequilla', name: 'Mantequilla', unit: 'g', pricePerUnit: 22.0 },
  { id: 'lechuga', name: 'Lechuga', unit: 'g', pricePerUnit: 6.0 },
  { id: 'zanahoria', name: 'Zanahoria', unit: 'g', pricePerUnit: 2.5 },
  { id: 'espinaca', name: 'Espinaca', unit: 'g', pricePerUnit: 5.0 },
  { id: 'atun-lata', name: 'Atún en Lata', unit: 'und', pricePerUnit: 6500, isProtein: true },
  { id: 'mayonesa', name: 'Mayonesa', unit: 'g', pricePerUnit: 18.0 },
  { id: 'limon', name: 'Limón', unit: 'und', pricePerUnit: 400 },
];

export const RECIPES: Recipe[] = [
  {
    id: 'caldo-costilla',
    name: 'Caldo de Costilla',
    description: 'El "levantamuertos" bogotano por excelencia.',
    category: Category.DESAYUNO,
    image: '/caldo-costilla.png',
    ingredients: [
      { ingredientId: 'carne-res-costilla', amount: 250 },
      { ingredientId: 'papa-pastusa', amount: 300 },
      { ingredientId: 'cilantro', amount: 10 },
      { ingredientId: 'cebolla-larga', amount: 20 },
    ]
  },
  {
    id: 'changua',
    name: 'Changua Santafereña',
    description: 'Tradicional sopa de leche, huevo y cilantro.',
    category: Category.DESAYUNO,
    image: '/changua.png',
    ingredients: [
      { ingredientId: 'leche-entera', amount: 500 },
      { ingredientId: 'huevo-aa', amount: 2 },
      { ingredientId: 'cilantro', amount: 15 },
      { ingredientId: 'cebolla-larga', amount: 15 },
      { ingredientId: 'calado', amount: 1 },
    ]
  },
  {
    id: 'ajiaco',
    name: 'Ajiaco Santafereño',
    description: 'Sopa de tres papas con pollo y guascas.',
    category: Category.ALMUERZO,
    image: 'https://picsum.photos/seed/ajiaco/400/300',
    ingredients: [
      { ingredientId: 'papa-pastusa', amount: 200 },
      { ingredientId: 'papa-sabanera', amount: 150 },
      { ingredientId: 'pollo-pechuga', amount: 300 },
      { ingredientId: 'aguacate-hass', amount: 0.5 },
      { ingredientId: 'arroz-blanco', amount: 100 },
    ]
  },
  {
    id: 'frijolada-rolita',
    name: 'Fríjol con Garra Bogotá',
    description: 'Versión adaptada al clima de la capital.',
    category: Category.ALMUERZO,
    image: 'https://picsum.photos/seed/frijol/400/300',
    ingredients: [
      { ingredientId: 'frijol-bola-roja', amount: 150 },
      { ingredientId: 'arroz-blanco', amount: 120 },
      { ingredientId: 'platano-maduro', amount: 100 },
      { ingredientId: 'carne-res-molida', amount: 150 },
    ]
  },
  {
    id: 'aguapanela-con-queso',
    name: 'Aguapanela con Queso',
    description: 'El calor de hogar en una taza.',
    category: Category.ONCES,
    image: 'https://picsum.photos/seed/aguapanela/400/300',
    ingredients: [
      { ingredientId: 'panela', amount: 50 },
      { ingredientId: 'queso-campesino', amount: 80 },
      { ingredientId: 'almojabana', amount: 1 },
    ]
  },
  {
    id: 'chocolate-completo',
    name: 'Chocolate Santafereño',
    description: 'Onces clásicas de la Candelaria.',
    category: Category.ONCES,
    image: 'https://picsum.photos/seed/chocolate/400/300',
    ingredients: [
      { ingredientId: 'chocolate-santafereno', amount: 1 },
      { ingredientId: 'leche-entera', amount: 300 },
      { ingredientId: 'queso-campesino', amount: 60 },
      { ingredientId: 'almojabana', amount: 1 },
    ]
  },
  {
    id: 'sopa-guineo',
    name: 'Sopa de Guineo',
    description: 'Sopa reconfortante para la noche.',
    category: Category.CENA,
    image: 'https://picsum.photos/seed/guineo/400/300',
    ingredients: [
      { ingredientId: 'guineo-verde', amount: 200 },
      { ingredientId: 'papa-pastusa', amount: 150 },
      { ingredientId: 'cilantro', amount: 10 },
      { ingredientId: 'cebolla-larga', amount: 10 },
    ]
  },
  {
    id: 'crema-auyama',
    name: 'Crema de Auyama',
    description: 'Ligera y nutritiva para terminar el día.',
    category: Category.CENA,
    image: 'https://picsum.photos/seed/auyama/400/300',
    ingredients: [
      { ingredientId: 'queso-campesino', amount: 40 },
      { ingredientId: 'leche-entera', amount: 100 },
    ]
  },
  {
    id: 'picada-mini',
    name: 'Mini Picada Bogotana',
    description: 'Snack de media mañana con papa y rellena.',
    category: Category.MEDIAS_NUEVES,
    image: 'https://picsum.photos/seed/picada/400/300',
    ingredients: [
      { ingredientId: 'papa-pastusa', amount: 100 },
    ]
  },
  {
    id: 'salpicon',
    name: 'Salpicón de Frutas',
    description: 'Fruta fresca de la sabana.',
    category: Category.MEDIAS_NUEVES,
    image: 'https://picsum.photos/seed/fruit/400/300',
    ingredients: [
      { ingredientId: 'panela', amount: 20 },
    ]
  },
  // Nuevas Recetas
  {
    id: 'huevos-pericos',
    name: 'Huevos Pericos',
    description: 'Desayuno clásico con tomate y cebolla.',
    category: Category.DESAYUNO,
    image: '/huevos-pericos.png',
    ingredients: [
      { ingredientId: 'huevo-aa', amount: 2 },
      { ingredientId: 'tomate-maduro', amount: 50 },
      { ingredientId: 'cebolla-larga', amount: 20 },
      { ingredientId: 'aceite', amount: 10 },
    ]
  },
  {
    id: 'calentao-lentejas',
    name: 'Calentao de Lentejas',
    description: 'Energía pura con sabor hogareño.',
    category: Category.DESAYUNO,
    image: '/calentao-lentejas.png',
    ingredients: [
      { ingredientId: 'lenteja-seca', amount: 80 },
      { ingredientId: 'arroz-blanco', amount: 50 },
      { ingredientId: 'tomate-maduro', amount: 30 },
      { ingredientId: 'cebolla-larga', amount: 20 },
      { ingredientId: 'huevo-aa', amount: 1 },
    ]
  },
  {
    id: 'caldo-papa',
    name: 'Caldo de Papa',
    description: 'Sencillo pero reconfortante.',
    category: Category.CENA,
    image: 'https://picsum.photos/seed/caldopapa/400/300',
    ingredients: [
      { ingredientId: 'papa-pastusa', amount: 250 },
      { ingredientId: 'cebolla-larga', amount: 15 },
      { ingredientId: 'ajo', amount: 1 },
      { ingredientId: 'cilantro', amount: 10 },
    ]
  },
  {
    id: 'avena-frutos',
    name: 'Avena con Frutos Rojos',
    description: 'Opción ligera y saludable.',
    category: Category.DESAYUNO,
    image: '/avena-frutos.jpg',
    ingredients: [
      { ingredientId: 'avena-hojuelas', amount: 50 },
      { ingredientId: 'leche-entera', amount: 250 },
      { ingredientId: 'fresa-mora', amount: 50 },
      { ingredientId: 'miel', amount: 15 },
      { ingredientId: 'canela', amount: 1 },
    ]
  },
  {
    id: 'sandwich-huevo',
    name: 'Sándwich de Huevo',
    description: 'Rápido y nutritivo.',
    category: Category.CENA,
    image: 'https://picsum.photos/seed/sandwichhuevo/400/300',
    ingredients: [
      { ingredientId: 'pan-tajado', amount: 2 },
      { ingredientId: 'huevo-aa', amount: 1 },
      { ingredientId: 'queso-doble-crema', amount: 1 },
      { ingredientId: 'mantequilla', amount: 10 },
      { ingredientId: 'lechuga', amount: 20 },
    ]
  },
  {
    id: 'tortilla-vegetal',
    name: 'Tortilla Vegetal',
    description: 'Cena ligera cargada de vegetales.',
    category: Category.CENA,
    image: 'https://picsum.photos/seed/tortilla/400/300',
    ingredients: [
      { ingredientId: 'huevo-aa', amount: 2 },
      { ingredientId: 'zanahoria', amount: 40 },
      { ingredientId: 'espinaca', amount: 30 },
      { ingredientId: 'cebolla-cabezona', amount: 20 },
    ]
  },
  {
    id: 'sandwich-atun',
    name: 'Sándwich de Atún',
    description: 'Clásico salvavidas.',
    category: Category.CENA,
    image: 'https://picsum.photos/seed/atun/400/300',
    ingredients: [
      { ingredientId: 'atun-lata', amount: 0.5 },
      { ingredientId: 'pan-tajado', amount: 2 },
      { ingredientId: 'mayonesa', amount: 15 },
      { ingredientId: 'cebolla-cabezona', amount: 15 },
      { ingredientId: 'limon', amount: 0.5 },
    ]
  }
];
