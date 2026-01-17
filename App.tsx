import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShoppingCart, ChefHat, Clock, Users, ArrowRight, ArrowLeft, Trash2, Plus, Minus, X, Check, Search, Filter, AlertCircle, Calendar, Star, TrendingUp, Info, Utensils, Home, MapPin, Truck, Award, ShieldCheck, Heart, Leaf, DollarSign, ExternalLink, ChevronDown, ChevronUp, AlertTriangle, Navigation, Edit3, Tag, Baby, User, Scale, List, CheckCircle2, ShoppingBag, PlayCircle, Zap, Sparkles } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { RECIPES, INGREDIENTS } from './constants';
import { Category, Recipe, CartItem, PickingItem, PersonConfig, AgeRange, AppetiteIntensity, Ingredient } from './types';
import { optimizePickingList } from './geminiService';
import AdminPanel from './AdminPanel';

const STEPS = [
  { id: 'config', label: 'Configuración', icon: <Calendar className="w-4 h-4" /> },
  { id: Category.DESAYUNO, label: 'Desayunos', icon: <span className="text-xs">☕</span> },
  { id: Category.ALMUERZO, label: 'Almuerzos', icon: <span className="text-xs">🍲</span> },
  { id: Category.CENA, label: 'Cenas', icon: <span className="text-xs">🌙</span> }
];

const ALLOWED_CITY = "Madrid, Cundinamarca";

const AGE_RANGES: { value: AgeRange; label: string; desc: string }[] = [
  { value: '1-3', label: '1–3 años', desc: '25–30% del plato' },
  { value: '4-6', label: '4–6 años', desc: '40–50% del plato' },
  { value: '7-9', label: '7–9 años', desc: '60–70% del plato' },
  { value: '10-12', label: '10–12 años', desc: '70–85% del plato' },
  { value: '13-15', label: '13–15 años', desc: '85–100% del plato' },
];

const INTENSITIES: { value: AppetiteIntensity; label: string }[] = [
  { value: 0, label: 'Normal' },
  { value: 0.1, label: 'Solo Comelón' },
  { value: 0.2, label: 'Comelón Medio' },
  { value: 0.3, label: 'Muy Comelón' },
];

const DAY_DISCOUNTS: Record<number, number> = {
  1: 0,
  3: 0.03,
  5: 0.05,
  7: 0.07
};

const ANTOJOS_PRODUCTS = [
  { id: 'antojo-ponque', name: 'Ponquecito Casero', unit: 'und', price: 2500, image: 'https://images.unsplash.com/photo-1587668178277-295251f900ce?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'antojo-galletas', name: 'Galletas de Avena', unit: 'paquete', price: 3800, image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'antojo-pan-bono', name: 'Pan de Bono x4', unit: 'bolsa', price: 6000, image: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'antojo-jugo', name: 'Jugo de Naranja 500ml', unit: 'fresco', price: 4500, image: 'https://images.unsplash.com/photo-1600271886342-adbc2dcb049f?auto=format&fit=crop&q=80&w=200&h=200' },
];

const App: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    const saved = localStorage.getItem('ingredients');
    return saved ? JSON.parse(saved) : INGREDIENTS;
  });
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem('recipes');
    return saved ? JSON.parse(saved) : RECIPES;
  });

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('ingredients', JSON.stringify(ingredients));
  }, [ingredients]);

  useEffect(() => {
    localStorage.setItem('recipes', JSON.stringify(recipes));
  }, [recipes]);

  const [isAdmin, setIsAdmin] = useState(false);


  const [showLanding, setShowLanding] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  // ... rest of state

  // ... handlers

  const handleUpdateRecipe = (id: string, updates: Partial<Recipe>) => {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleAddRecipe = (newRecipe: Recipe) => {
    setRecipes(prev => [...prev, newRecipe]);
  };

  const handleDeleteRecipe = (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateIngredient = (id: string, updates: Partial<Ingredient>) => {
    setIngredients(prev => prev.map(ing =>
      ing.id === id ? { ...ing, ...updates } : ing
    ));
  };

  // ... admin check


  const [cart, setCart] = useState<CartItem[]>([]);
  const [dayPlan, setDayPlan] = useState<number>(3);
  const [numPeople, setNumPeople] = useState<number>(2);
  const [persons, setPersons] = useState<PersonConfig[]>([
    { id: '1', type: 'adult', intensity: 0 },
    { id: '2', type: 'adult', intensity: 0 }
  ]);
  const [showApetitoConfig, setShowApetitoConfig] = useState(false);

  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [missingCategories, setMissingCategories] = useState<string[]>([]);
  const [pickingList, setPickingList] = useState<PickingItem[]>([]);
  const [pickingOverrides, setPickingOverrides] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Datos de envío
  const [address, setAddress] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>(''); // Celular obligatorio
  const [details, setDetails] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [locationGranted, setLocationGranted] = useState(false);
  // Sugerencias de IA (controladas manualmente)
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPickingDetail, setShowPickingDetail] = useState(false);
  const [showCheckoutPickingDetail, setShowCheckoutPickingDetail] = useState(false); // NUEVO ESTADO PARA CHECKOUT
  const [showAntojosModal, setShowAntojosModal] = useState(false);
  const [antojosCart, setAntojosCart] = useState<Record<string, number>>({});

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    [Category.DESAYUNO]: true,
    [Category.ALMUERZO]: false,
    [Category.CENA]: false
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const currentStep = STEPS[currentStepIndex];

  useEffect(() => {
    setPersons(prev => {
      if (prev.length === numPeople) return prev;
      if (prev.length < numPeople) {
        const added: PersonConfig[] = Array.from({ length: numPeople - prev.length }).map((_, i) => ({
          id: Math.random().toString(36).substr(2, 9),
          type: 'adult',
          intensity: 0
        }));
        return [...prev, ...added];
      }
      return prev.slice(0, numPeople);
    });
  }, [numPeople]);

  const updatePerson = (id: string, updates: Partial<PersonConfig>) => {
    setPersons(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const recipesForStep = useMemo(() => {
    if (currentStep.id === 'config') return [];
    return RECIPES.filter(r => {
      if (r.category !== currentStep.id) return false;

      // Validar si todos los ingredientes tienen precio de venta > 0
      return r.ingredients.every(ri => {
        const ingredient = ingredients.find(i => i.id === ri.ingredientId);
        return (ingredient?.pricePerUnit || 0) > 0;
      });
    });
  }, [currentStep]);

  const finalPickingList = useMemo(() => {
    const recipePicking = pickingList.map(item => {
      const override = pickingOverrides[item.name];
      if (override !== undefined) {
        return {
          ...item,
          totalAmount: override,
          totalPrice: Math.round(override * item.unitPriceWithMargin)
        };
      }
      return item;
    });

    // Add Antojos to the list
    const antojosItems: PickingItem[] = Object.entries(antojosCart)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([id, qty]) => {
        const product = ANTOJOS_PRODUCTS.find(p => p.id === id);
        const quantity = qty as number;
        return {
          name: product?.name || id,
          totalAmount: quantity,
          unit: product?.unit || 'und',
          unitPriceWithMargin: product?.price || 0,
          totalPrice: quantity * (product?.price || 0)
        };
      });

    return [...recipePicking, ...antojosItems];
  }, [pickingList, pickingOverrides, antojosCart]);

  const getCategoryCount = (cat: Category) => {
    return cart.filter(i => i.category === cat).reduce((acc, curr) => acc + curr.quantity, 0);
  };

  // Mercado Pago Integration
  const [preferenceId, setPreferenceId] = useState<string | null>(null);

  useEffect(() => {
    initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale: 'es-CO' });
  }, []);

  const createPreference = async () => {
    try {
      setIsProcessing(true);
      // Simplify to single item to ensure Total Price (with discount) is exact and avoid integer/decimal issues
      const items = [{
        title: "Mercado a la Medida (Resumen de Compra)",
        quantity: 1,
        unit_price: Math.round(totalPrice), // Ensure integer for COP
        currency_id: 'COP'
      }];

      // Sanitize phone number to keep only digits
      const cleanPhone = phoneNumber.replace(/\D/g, '');

      // URL del Backend Serverless en AWS Lambda
      const response = await fetch('https://7bex66b7xivkbcimalulthsjxq0wcdii.lambda-url.us-east-2.on.aws/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items,
          payer: {
            name: "Cliente Mercado a la Medida",
            phone: { number: cleanPhone }
          },
          totalAmount: totalPrice
        }),
      });

      // Validar que la respuesta sea JSON (si no, es error crítico de Lambda o Gateway)
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Error de comunicación con Backend: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`Error Mercado Pago: ${data.error}`);
      }

      if (data.init_point) {
        // Direct redirect to Mercado Pago
        window.location.href = data.init_point;
      }
    } catch (error) {
      console.error(error);
      alert(`❌ Error al iniciar el pago: ${String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const maxCategoryCount = useMemo(() => {
    const counts = [
      getCategoryCount(Category.DESAYUNO),
      getCategoryCount(Category.ALMUERZO),
      getCategoryCount(Category.CENA)
    ];
    return Math.max(...counts);
  }, [cart]);

  // Lógica de Descuento Validado:
  // Se toma el menor entre el descuento permitido por el plan y el alcanzado por volumen en una categoría
  const currentDiscountRate = useMemo(() => {
    let volumeRate = 0;
    if (maxCategoryCount >= 7) volumeRate = 0.07;
    else if (maxCategoryCount >= 5) volumeRate = 0.05;
    else if (maxCategoryCount >= 3) volumeRate = 0.03;

    const planRate = DAY_DISCOUNTS[dayPlan] || 0;
    return Math.min(planRate, volumeRate);
  }, [maxCategoryCount, dayPlan]);

  const subtotalPrice = useMemo(() =>
    finalPickingList.reduce((acc, curr) => acc + curr.totalPrice, 0),
    [finalPickingList]);

  const discountAmount = Math.round(subtotalPrice * currentDiscountRate);
  const totalPrice = subtotalPrice - discountAmount;

  const isCheckoutValid = useMemo(() => {
    return address.trim().length > 5 && details.trim().length > 2 && phoneNumber.trim().length >= 10;
  }, [address, details, phoneNumber]);

  const addToCart = (recipe: Recipe) => {
    setCart(prev => {
      const existing = prev.find(i => i.recipeId === recipe.id);
      if (existing) {
        return prev.map(i => i.recipeId === recipe.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: Math.random().toString(), recipeId: recipe.id, recipeName: recipe.name, category: recipe.category, quantity: 1 }];
    });
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(i => i.quantity > 0));
  };

  // Función para modificar cantidad de insumos manual
  const updateIngredientAmount = (name: string, delta: number) => {
    setPickingOverrides(prev => {
      const currentItem = finalPickingList.find(i => i.name === name);
      if (!currentItem) return prev;

      const currentAmount = prev[name] !== undefined ? prev[name] : currentItem.totalAmount;
      const newAmount = Math.max(0, currentAmount + delta); // Evitar negativos

      return { ...prev, [name]: newAmount };
    });
  };

  // Función para eliminar insumo completamente
  const removeIngredient = (name: string) => {
    setPickingOverrides(prev => ({ ...prev, [name]: 0 }));
  };

  // Función para establecer cantidad exacta
  const setIngredientAmount = (name: string, value: string) => {
    const amount = parseFloat(value);
    if (isNaN(amount)) return; // O manejar como 0 si se prefiere
    setPickingOverrides(prev => ({ ...prev, [name]: Math.max(0, amount) }));
  };

  const handleFinalize = () => {
    const missing: string[] = [];
    if (getCategoryCount(Category.DESAYUNO) < dayPlan) missing.push('Desayunos');
    if (getCategoryCount(Category.ALMUERZO) < dayPlan) missing.push('Almuerzos');
    if (getCategoryCount(Category.CENA) < dayPlan) missing.push('Cenas');

    if (missing.length > 0) {
      setMissingCategories(missing);
      setShowIncompleteModal(true);
    } else {
      setShowAntojosModal(true);
    }
  };
  const updateAntojoQty = (id: string, delta: number) => {
    setAntojosCart(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setLocationGranted(true);
          try {
            const { latitude, longitude } = position.coords;
            // Reverse geocoding simple con OpenStreetMap Nominatim
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            if (data && data.address) {
              const road = data.address.road || '';
              const house = data.address.house_number || '';
              const city = data.address.city || data.address.town || data.address.village || '';

              const formattedAddress = road ? `${road} ${house ? '# ' + house : ''}` : data.display_name;
              setAddress(formattedAddress);
            }
          } catch (error) {
            console.error("Error al obtener dirección:", error);
          }
        },
        (error) => {
          console.error("Error al obtener ubicación:", error);
          alert("No pudimos obtener tu ubicación automáticamente. Por favor ingresa tu dirección manualmente.");
        }
      );
    }
  };

  useEffect(() => {
    const updateList = async () => {
      if (cart.length === 0) {
        setPickingList([]);
        return;
      }
      setIsProcessing(true);
      const result = await optimizePickingList(cart, RECIPES, ingredients, persons);
      setPickingList(result.picking);
      // Reset overrides when cart or persons change significantly
      setPickingOverrides({});
      setIsProcessing(false);
    };
    updateList();
  }, [cart, persons]);

  const processOrder = () => {
    // 1. Construir el mensaje de WhatsApp
    let message = `*NUEVO PEDIDO - MERCADOS A LA MEDIDA*\n\n`;

    message += `👤 *DATOS DE CONTACTO:*\n`;
    message += `• *Celular:* ${phoneNumber}\n`;
    message += `• *Dirección:* ${address}\n`;
    message += `• *Detalles:* ${details}\n`;
    if (observations) message += `• *Obs:* ${observations}\n`;

    message += `\n🍳 *RECETAS:* \n`;
    cart.forEach(item => {
      message += `• ${item.quantity}x ${item.recipeName}\n`;
    });

    message += `\n📦 *LISTA DE INSUMOS (PICKING):*\n`;
    finalPickingList.filter(i => i.totalAmount > 0).forEach(item => {
      message += `• ${item.name}: ${item.totalAmount} ${item.unit}\n`;
    });

    message += `\n💰 *TOTAL A PAGAR: $${totalPrice.toLocaleString()}*`;

    // 2. Codificar para URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/573208064213?text=${encodedMessage}`;

    // 3. Abrir WhatsApp y reiniciar
    window.open(whatsappUrl, '_blank');

    setShowCheckout(false);
    setShowLanding(true);

    // Limpiar carrito al finalizar (opcional, pero recomendado)
    setCart([]);
    setPickingOverrides({});
  };

  // Secret admin trigger using useRef to avoid re-renders
  const secretClickRef = useRef(0);

  const handleSecretTrigger = () => {
    secretClickRef.current += 1;
    if (secretClickRef.current >= 5) {
      // Use setTimeout to allow the UI to register the click event before blocking with prompt
      setTimeout(() => {
        const password = prompt("Ingrese clave administrativa:");
        const validPassword = (import.meta as any).env.VITE_ADMIN_PASSWORD || "admin123";

        if (password === validPassword) {
          setIsAdmin(true);
        }
        secretClickRef.current = 0;
      }, 50);
    }
  };


  if (isAdmin) {
    return (
      <AdminPanel
        ingredients={ingredients}
        recipes={recipes}
        onUpdateIngredient={handleUpdateIngredient}
        onUpdateRecipe={handleUpdateRecipe}
        onAddRecipe={handleAddRecipe}
        onDeleteRecipe={handleDeleteRecipe}
        onExit={() => setIsAdmin(false)}
      />
    );
  }

  if (showLanding) {
    return (
      <div className="min-h-screen bg-white">
        <section className="relative h-[90vh] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/desayuno-colombiano-hero.png"
              className="w-full h-full object-cover"
              alt="Desayuno colombiano tradicional"
            />
            {/* AREA SECRETA DERECHA */}
            <div
              onClick={handleSecretTrigger}
              className="absolute top-0 right-0 w-1/4 h-full z-50 cursor-default"
              title=""
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full">
            <div className="max-w-2xl space-y-8 animate-in slide-in-from-left duration-1000">
              <div className="flex items-center gap-3 bg-emerald-600/20 backdrop-blur-md border border-emerald-500/30 w-fit px-4 py-2 rounded-full">
                <Leaf className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em]">Mercado a la Medida • Madrid</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tighter">
                Tú eliges la Receta, <br />
                <span className="text-emerald-400">Nosotros el Mercado.</span>
              </h1>

              <p className="text-xl text-gray-200 font-medium leading-relaxed max-w-xl">
                No compres bultos, compra platos. Recibe ingredientes crudos y exactos directo en tu cocina.
              </p>

              <button
                onClick={() => setShowLanding(false)}
                className="px-12 py-5 bg-emerald-600 text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/40 hover:bg-emerald-500 hover:scale-105 transition-all flex items-center justify-center gap-3 w-fit"
              >
                Arma tu mercado <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 md:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowLanding(true)}>
            <div className="bg-emerald-600 p-2 rounded-lg">
              <ShoppingBag className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 leading-tight">Mercados</h1>
              <p className="text-[9px] text-emerald-600 font-black uppercase tracking-[0.2em]">a la medida</p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {STEPS.map((step, idx) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => idx <= currentStepIndex + 1 && setCurrentStepIndex(idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${idx === currentStepIndex ? 'bg-emerald-600 text-white shadow-md' :
                    idx < currentStepIndex ? 'bg-emerald-50 text-emerald-700' : 'text-gray-300'
                    }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-tighter">{step.label}</span>
                  {idx < currentStepIndex && <CheckCircle2 className="w-3 h-3" />}
                </button>
                {idx < STEPS.length - 1 && <div className="h-px w-2 bg-gray-200 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 w-full">
        <div className="lg:col-span-8">
          {currentStep.id === 'config' ? (
            <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-xl max-w-2xl mx-auto mt-6">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-black mb-2 leading-tight">Configura tu Despensa</h2>
                <p className="text-gray-400 text-sm">Personaliza tu ciclo de mercado según tu hogar.</p>
              </div>

              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-4"><Calendar className="w-4 h-4 text-emerald-600" /> Días del Ciclo</label>
                    <div className="grid grid-cols-4 gap-3">
                      {[1, 3, 5, 7].map(d => (
                        <div key={d} className="relative group">
                          <button
                            onClick={() => setDayPlan(d)}
                            className={`w-full py-6 rounded-3xl border-2 transition-all relative z-10 ${dayPlan === d ? 'border-emerald-600 bg-emerald-50' : 'border-gray-50 bg-white group-hover:border-emerald-200'}`}
                          >
                            <span className="block text-2xl font-black">{d}</span>
                            <span className="text-[10px] font-bold uppercase text-gray-400">Día{d > 1 ? 's' : ''}</span>
                          </button>

                          {/* TOOLTIP DE DESCUENTO EN HOVER */}
                          {d > 1 && (
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-emerald-900 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-xl z-20 flex items-center gap-2 border border-emerald-500/30">
                              <Tag className="w-3 h-3 text-emerald-400" />
                              {d} días {d}% de descuento
                            </div>
                          )}

                          {/* BADGE DE DESCUENTO SIEMPRE VISIBLE */}
                          {d > 1 && (
                            <div className="absolute -top-2 -right-2 bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black z-20 border-2 border-white shadow-sm">
                              -{d}%
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-4"><Users className="w-4 h-4 text-emerald-600" /> Cantidad de Personas</label>
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-3xl border border-gray-100">
                      <button onClick={() => setNumPeople(p => Math.max(1, p - 1))} className="w-12 h-12 bg-white rounded-2xl border border-gray-200 flex items-center justify-center"><Minus className="w-5 h-5 text-gray-600" /></button>
                      <div className="text-center">
                        <span className="text-4xl font-black text-emerald-700">{numPeople}</span>
                      </div>
                      <button onClick={() => setNumPeople(p => Math.min(10, p + 1))} className="w-12 h-12 bg-white rounded-2xl border border-gray-200 flex items-center justify-center"><Plus className="w-5 h-5 text-gray-600" /></button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center group relative">
                  <button
                    onClick={() => setShowApetitoConfig(!showApetitoConfig)}
                    className={`flex items-center gap-3 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg ${showApetitoConfig ? 'bg-emerald-900 text-white' : 'bg-white text-emerald-700 border-2 border-emerald-100 hover:border-emerald-500'}`}
                  >
                    <Scale className={`w-4 h-4 ${showApetitoConfig ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    Configuración de Apetito Individual
                    {showApetitoConfig ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                  </button>

                  {/* Tooltip Persuasivo */}
                  <div className="absolute top-16 bg-gray-900 text-white p-4 rounded-2xl w-64 text-center shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-30 translate-y-2 group-hover:translate-y-0 border border-gray-700">
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45 border-t border-l border-gray-700"></div>
                    <p className="text-[10px] uppercase font-bold text-emerald-400 mb-1 tracking-widest">Personalización Total</p>
                    <p className="text-xs font-medium text-gray-300 leading-relaxed">
                      ¿Tienes niños en casa o alguien con apetito voraz? Ajusta las porciones exactas para que nadie se quede con hambre.
                    </p>
                  </div>
                </div>

                {showApetitoConfig && (
                  <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {persons.map((person, index) => (
                        <div key={person.id} className="bg-white border-2 border-gray-100 rounded-[32px] p-6 shadow-sm hover:border-emerald-100 transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Persona {index + 1}</span>
                            <div className="flex bg-gray-100 rounded-xl p-1">
                              <button
                                onClick={() => updatePerson(person.id, { type: 'adult', ageRange: undefined })}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${person.type === 'adult' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}
                              >
                                <User className="w-3 h-3" /> Adulto
                              </button>
                              <button
                                onClick={() => updatePerson(person.id, { type: 'child', ageRange: '7-9' })}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${person.type === 'child' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}
                              >
                                <Baby className="w-3 h-3" /> Niño
                              </button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {person.type === 'child' && (
                              <div className="space-y-2">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Rango de Edad (ICBF)</label>
                                <select
                                  value={person.ageRange}
                                  onChange={(e) => updatePerson(person.id, { ageRange: e.target.value as AgeRange })}
                                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                                >
                                  {AGE_RANGES.map(range => (
                                    <option key={range.value} value={range.value}>{range.label} — {range.desc}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="space-y-2">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Nivel de Apetito</label>
                              <div className="grid grid-cols-2 gap-2">
                                {INTENSITIES.map(intensity => (
                                  <button
                                    key={intensity.value}
                                    onClick={() => updatePerson(person.id, { intensity: intensity.value })}
                                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${person.intensity === intensity.value ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200'}`}
                                  >
                                    {intensity.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-emerald-50 p-8 rounded-[32px] border border-emerald-100 flex items-start gap-5">
                  <div className="bg-white p-3 rounded-2xl shadow-sm">
                    <MapPin className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-900 uppercase tracking-tighter mb-1">Logística de Cercanía</h3>
                    <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                      Por el momento, operamos con logística de última milla exclusivamente para el municipio de <b>Madrid, Cundinamarca</b>. Esto nos permite garantizar que tus ingredientes lleguen frescos desde Corabastos en tiempo récord y con el porcionado exacto.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentStepIndex(1)}
                  className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  Comenzar Selección de Platos
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 leading-none mb-2">{currentStep.label}</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                    Plan para {numPeople} personas / {dayPlan} días {currentDiscountRate > 0 && <span className="text-emerald-600">(-{Math.round(currentDiscountRate * 100)}% aplicado)</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))} className="p-3 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                  {currentStepIndex < STEPS.length - 1 && (
                    <button onClick={() => setCurrentStepIndex(prev => prev + 1)} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all">Siguiente <ArrowRight className="w-5 h-5" /></button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {recipesForStep.map(recipe => (
                  <div
                    key={recipe.id}
                    className="group relative h-[60px] hover:h-auto min-h-[60px] bg-white rounded-[20px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 ease-out"
                  >
                    {/* Background Image - Always visible but changes opacity/position */}
                    <div className="absolute inset-0 z-0">
                      <img
                        src={recipe.image}
                        alt={recipe.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent group-hover:via-black/70 transition-colors" />
                    </div>

                    {/* Content Container */}
                    <div className="relative z-10 p-4 h-full flex flex-col justify-center group-hover:justify-start">

                      {/* Header (Title & Category) - Always visible */}
                      <div className="flex items-center justify-between w-full group-hover:mb-4 transition-all">
                        <div>
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 block opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                            {recipe.category}
                          </span>
                          <h3 className="text-white font-black text-lg leading-none tracking-tight">{recipe.name}</h3>
                        </div>

                        {/* Add Icon initially visible, fades out on hover to make space for full button */}
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md group-hover:opacity-0 transition-opacity">
                          <Plus className="w-5 h-5 text-white" />
                        </div>
                      </div>

                      {/* Hidden Content - Reveals on Hover */}
                      <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500">
                        <div className="overflow-hidden">
                          <div className="pt-2 pb-2 space-y-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                            <p className="text-sm text-gray-200 font-medium leading-relaxed max-w-xl">
                              {recipe.description}
                            </p>

                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => addToCart(recipe)}
                                className="px-8 py-3 bg-white text-emerald-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-400 hover:text-emerald-950 transition-colors shadow-lg flex items-center gap-2"
                              >
                                Agregar al Mercado <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-4">
          <div className="bg-white rounded-[40px] p-8 border border-gray-200 shadow-2xl sticky top-24 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black flex items-center gap-2 uppercase tracking-tighter"><ShoppingCart className="w-5 h-5 text-emerald-600" /> Despensa</h2>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-emerald-600 uppercase">{numPeople} Personas</span>
                <span className="text-[9px] font-bold text-gray-400">{dayPlan} Días</span>
              </div>
            </div>



            {cart.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-[32px]">
                <Utensils className="w-10 h-10 text-gray-100 mx-auto mb-4" />
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Llena tu despensa</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  {STEPS.filter(s => s.id !== 'config').map(step => {
                    const count = getCategoryCount(step.id as Category);
                    const items = cart.filter(i => i.category === step.id);
                    const isExpanded = expandedCategories[step.id];

                    // Traffic light logic
                    let statusColor = "bg-red-500";
                    let textColor = "text-red-600";
                    let bgColor = "bg-red-50";
                    let borderColor = "border-red-100";
                    let tooltipMsg = "Aún no has elegido ningún plato en esta categoría.";

                    if (count >= dayPlan) {
                      statusColor = "bg-emerald-500";
                      textColor = "text-emerald-600";
                      bgColor = "bg-emerald-50";
                      borderColor = "border-emerald-100";
                      tooltipMsg = "Puedes revisar y validar tus platos seleccionados.";
                    } else if (count > 0) {
                      statusColor = "bg-amber-500";
                      textColor = "text-amber-600";
                      bgColor = "bg-amber-50";
                      borderColor = "border-amber-100";
                      tooltipMsg = "Aún te falta completar esta categoría.";
                    }

                    return (
                      <div key={step.id} className={`rounded-[24px] border-2 transition-all overflow-hidden ${isExpanded ? 'border-gray-100 shadow-md' : 'border-transparent'}`}>
                        <button
                          onClick={() => toggleCategory(step.id)}
                          className={`w-full group relative flex items-center justify-between px-4 py-2.5 transition-all ${isExpanded ? 'bg-white' : 'bg-gray-50 hover:bg-white border border-gray-100'}`}
                        >
                          {/* Custom Styled Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-emerald-900 text-white text-[9px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl border border-emerald-500/30">
                            {tooltipMsg}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-emerald-900" />
                          </div>

                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${statusColor} shadow-sm animate-pulse flex-shrink-0`} />
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">{step.label}</span>
                              <span className={`text-[9px] font-black ${textColor} uppercase px-2 py-0.5 rounded-full ${bgColor} border ${borderColor}`}>
                                {count}/{dayPlan}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" /> : <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className={`p-3 space-y-2 ${bgColor} border-t ${borderColor} animate-in slide-in-from-top-2 duration-300`}>
                            {items.length === 0 ? (
                              <p className="text-[9px] font-bold text-gray-400 uppercase text-center py-2">Sin platos seleccionados</p>
                            ) : (
                              items.map(item => (
                                <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center justify-between shadow-sm">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-800 leading-none mb-1 truncate max-w-[120px]">{item.recipeName}</span>
                                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">x{item.quantity}</span>
                                  </div>
                                  <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
                                    <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 text-gray-400 hover:text-red-500"><Minus className="w-3 h-3" /></button>
                                    <span className="text-[10px] font-black w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 text-gray-400 hover:text-emerald-600"><Plus className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* FEEDBACK DINÁMICO DE DESCUENTO POR CATEGORÍA */}
                <div className="bg-emerald-900 p-4 rounded-3xl border border-emerald-500/30 text-white shadow-lg overflow-hidden relative group">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" /> Descuento Progresivo
                      </span>
                      <span className="text-xs font-black text-emerald-400">{Math.round(currentDiscountRate * 100)}%</span>
                    </div>

                    {/* PROGRESS BAR CON LÓGICA DE COLOR (SOLO ROJO/VERDE SEGÚN SOLICITUD) */}
                    <div className="h-1.5 bg-emerald-950/50 rounded-full mb-3 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ease-out ${maxCategoryCount >= dayPlan ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                        style={{ width: `${Math.max(2, Math.min(100, (maxCategoryCount / (dayPlan || 1)) * 100))}%` }}
                      />
                    </div>

                    <p className="text-[9px] font-bold text-gray-300 leading-tight">
                      {currentDiscountRate < (DAY_DISCOUNTS[dayPlan] || 0) ? (
                        <>Para el {Math.round((DAY_DISCOUNTS[dayPlan] || 0) * 100)}%, agrega <span className="text-emerald-400">{dayPlan - maxCategoryCount} platos más</span> a una sola categoría.</>
                      ) : (
                        <span className="text-emerald-400">¡Máximo ahorro del plan activado!</span>
                      )}
                    </p>
                  </div>
                  <Tag className="absolute -right-2 -bottom-2 w-16 h-16 text-emerald-800/20 rotate-12" />
                </div>

                {/* BOTÓN DE FILTRO DETALLADO (REUBICADO Y MEJORADO) */}
                <div className="mt-4">
                  <button
                    onClick={() => setShowPickingDetail(!showPickingDetail)}
                    className={`w-full py-4 rounded-3xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-md active:scale-95 ${showPickingDetail ? 'bg-gray-900 text-white border-2 border-gray-900' : 'bg-emerald-600 text-white border-2 border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700'}`}
                  >
                    {showPickingDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showPickingDetail ? 'Ocultar Pedido Detallado' : 'Ver Pedido Detallado'}
                  </button>

                  {/* VISTA DE DETALLE DE INSUMOS (PICKING LIST) */}
                  {showPickingDetail && (
                    <div className="mt-6 animate-in slide-in-from-top-4 bg-gray-50 rounded-3xl p-6 border border-gray-100">
                      <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                        <div>
                          {/* Textos eliminados según solicitud */}
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                        {finalPickingList.length === 0 ? (
                          <p className="text-xs text-center text-gray-400 py-4">Calculando insumos...</p>
                        ) : (
                          finalPickingList.map((item, idx) => (
                            <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-black text-gray-800 uppercase truncate max-w-[140px] leading-tight">{item.name}</span>
                                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Unit: ${item.unitPriceWithMargin.toLocaleString()}</span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded-lg text-gray-600">{item.totalAmount} {item.unit}</span>
                                <span className="text-xs font-black text-gray-900">${item.totalPrice.toLocaleString()}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 mb-6 space-y-2">
                    <div className="flex justify-between items-center border-b border-emerald-100/50 pb-2">
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Subtotal Selección</span>
                      <span className="text-sm font-black text-emerald-900">${subtotalPrice.toLocaleString()}</span>
                    </div>
                    {currentDiscountRate > 0 && (
                      <div className="flex justify-between items-center text-emerald-600">
                        <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                          <Tag className="w-3 h-3" /> Ahorro Validado
                        </span>
                        <span className="text-sm font-black">-${discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Total a Pagar</span>
                      <span className="text-3xl font-black text-emerald-950">${totalPrice.toLocaleString()}</span>
                    </div>
                  </div>

                  <button onClick={handleFinalize} className="w-full bg-emerald-600 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-95">Finalizar y Pagar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/80 backdrop-blur-xl">
          <div className="bg-white rounded-[50px] p-10 max-w-2xl w-full shadow-2xl relative animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowCheckout(false)} className="absolute top-8 right-8 text-gray-300 hover:text-gray-600"><X className="w-6 h-6" /></button>

            <div className="flex items-center gap-4 mb-8">
              <div className="bg-emerald-100 p-4 rounded-3xl">
                <Truck className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 leading-tight uppercase tracking-tighter">Dirección de Despacho</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Servicio exclusivo en Madrid, Cund.</p>
              </div>
            </div>

            <div className="space-y-6">
              {!locationGranted && (
                <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[32px] text-center space-y-4">
                  <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest">
                    Allow this app to request access to: <b>Location</b>
                  </p>
                  <button
                    onClick={requestLocation}
                    className="flex items-center gap-2 mx-auto bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all"
                  >
                    <Navigation className="w-4 h-4 fill-white" /> Autorizar Acceso a Ubicación
                  </button>
                  <p className="text-[9px] text-amber-600 font-bold">Usaremos tu GPS para validar que te encuentras en Madrid, Cundinamarca.</p>
                </div>
              )}

              {locationGranted && (
                <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-[32px] flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-[10px] font-black text-emerald-800 uppercase">Ubicación verificada en el municipio</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 text-left">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Celular / WhatsApp <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-5 py-3 rounded-2xl border-2 border-emerald-100 bg-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition-all font-sans"
                    placeholder="Ej: 300 123 4567"
                    required
                  />
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Dirección Principal <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-11 pr-5 py-3 rounded-2xl border-2 border-emerald-100 bg-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition-all"
                      placeholder="Calle 7 # 4-50..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Conjunto / Torre / Casa</label>
                  <input
                    type="text"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="w-full px-5 py-3 rounded-2xl border-2 border-emerald-100 bg-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    placeholder="Ej: Conjunto El Rosal, T2, Apto 501"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Observaciones (Opcional)</label>
                <div className="relative">
                  <Edit3 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="text"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    className="w-full pl-11 pr-5 py-3 rounded-2xl border-2 border-emerald-100 bg-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    placeholder="Ej: Dejar en portería..."
                  />
                </div>
              </div>

              {/* VERIFICACIÓN DE INSUMOS EN CHECKOUT CON TOOLTIP PERSONALIZADO */}
              <div className="border-t border-gray-100 pt-6">
                <button
                  onClick={() => setShowCheckoutPickingDetail(!showCheckoutPickingDetail)}
                  className="w-full group relative py-4 bg-emerald-50 border-2 border-emerald-400 rounded-[28px] flex items-center justify-center gap-3 text-[11px] font-black text-emerald-800 uppercase tracking-widest hover:bg-emerald-100 hover:shadow-lg hover:scale-[1.01] transition-all mb-6"
                >
                  {/* Custom Styled Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2 bg-emerald-900 border border-emerald-400/30 text-white text-[10px] font-bold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 whitespace-normal w-64 z-50 shadow-2xl">
                    Aquí puedes realizar los cambios, ajustes de cantidad o eliminaciones para personalizar tu mercado total. ✨
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-emerald-900" />
                  </div>

                  {showCheckoutPickingDetail ? <ChevronUp className="w-5 h-5 text-emerald-600" /> : <List className="w-5 h-5 text-emerald-600 animate-bounce" />}
                  {showCheckoutPickingDetail ? 'Ocultar Lista de Insumos' : 'Verificar Lista Final de Insumos'}
                </button>

                {showCheckoutPickingDetail && (
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 mb-6 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-3 px-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Insumo</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ajustar Cantidad</span>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin">
                      {finalPickingList.map((item, idx) => (
                        <div key={idx} className={`flex justify-between items-center bg-white p-2 rounded-xl border shadow-sm transition-all ${item.totalAmount === 0 ? 'border-red-100 opacity-50 bg-red-50' : 'border-gray-100'}`}>
                          <div className="flex flex-col">
                            <span className={`text-[10px] font-black uppercase ${item.totalAmount === 0 ? 'text-red-400 line-through' : 'text-gray-700'}`}>{item.name}</span>
                            {item.totalAmount > 0 && <span className="text-[9px] font-bold text-gray-400">${item.totalPrice.toLocaleString()}</span>}
                          </div>

                          <div className="flex items-center gap-2">
                            {item.totalAmount > 0 ? (
                              <>
                                <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 w-24">
                                  <button onClick={() => updateIngredientAmount(item.name, -1)} className="p-1.5 hover:bg-gray-200 rounded-l-lg transition-colors border-r border-gray-200"><Minus className="w-3 h-3 text-gray-600" /></button>
                                  <div className="flex-1 flex items-center justify-center gap-1 font-bold text-[10px] text-gray-800 px-1">
                                    <input
                                      type="number"
                                      value={item.totalAmount}
                                      onChange={(e) => setIngredientAmount(item.name, e.target.value)}
                                      className="w-8 text-center bg-transparent focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="text-gray-400">{item.unit}</span>
                                  </div>
                                  <button onClick={() => updateIngredientAmount(item.name, 1)} className="p-1.5 hover:bg-gray-200 rounded-r-lg transition-colors border-l border-gray-200"><Plus className="w-3 h-3 text-gray-600" /></button>
                                </div>
                                <button onClick={() => removeIngredient(item.name)} className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar insumo">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-red-500 uppercase">Eliminado</span>
                                <button onClick={() => updateIngredientAmount(item.name, 1)} className="p-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors" title="Restaurar">
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 space-y-3">
                <div className="flex justify-between items-center text-xs text-emerald-800">
                  <span className="font-bold uppercase tracking-widest">Subtotal Selección</span>
                  <span className="font-black">${subtotalPrice.toLocaleString()}</span>
                </div>
                {currentDiscountRate > 0 && (
                  <div className="flex justify-between items-center text-xs text-emerald-600 font-bold">
                    <span className="uppercase tracking-widest flex items-center gap-1"><Tag className="w-3 h-3" /> Ahorro Progresivo ({Math.round(currentDiscountRate * 100)}%)</span>
                    <span>-${discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                  <div>
                    <span className="block text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Total a Pagar Final</span>
                    <span className="text-3xl font-black text-emerald-900">${totalPrice.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={createPreference}
                    disabled={!isCheckoutValid || !locationGranted || isProcessing}
                    className={`px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isCheckoutValid && locationGranted && !isProcessing ? 'bg-gray-900 text-white shadow-xl hover:bg-black hover:scale-[1.02]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  >
                    {isProcessing ? 'Procesando...' : 'PAGAR'}
                    {!isProcessing && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {(!isCheckoutValid || !locationGranted) && (
                <p className="text-[9px] text-red-500 font-bold uppercase text-center">
                  {!locationGranted ? 'Se requiere permiso de ubicación' : 'Completa tu dirección en Madrid'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showAntojosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/80 backdrop-blur-xl">
          <div className="bg-white rounded-[50px] p-10 max-w-2xl w-full shadow-2xl relative animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAntojosModal(false)} className="absolute top-8 right-8 text-gray-300 hover:text-gray-600"><X className="w-6 h-6" /></button>
            <div className="text-center mb-10">
              <div className="bg-amber-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Sparkles className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 leading-tight uppercase tracking-tighter">¿Te provoca un antojo?</h2>
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Complementa tu mercado con estos productos por unidad</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              {ANTOJOS_PRODUCTS.map(product => {
                const qty = antojosCart[product.id] || 0;
                return (
                  <div key={product.id} className={`p-4 rounded-[32px] border-2 transition-all flex items-center gap-4 ${qty > 0 ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-gray-100 bg-white hover:border-emerald-200'}`}>
                    <img src={product.image} className="w-20 h-20 rounded-2xl object-cover shadow-sm" alt={product.name} />
                    <div className="flex-1">
                      <h4 className="text-[11px] font-black text-gray-900 uppercase leading-none mb-1">{product.name}</h4>
                      <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">${product.price.toLocaleString()} / {product.unit}</p>

                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => updateAntojoQty(product.id, -1)}
                          className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all ${qty > 0 ? 'border-red-100 bg-white text-red-400 hover:bg-red-50 hover:text-red-600' : 'border-gray-50 bg-gray-50 text-gray-200 pointer-events-none'}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className={`text-lg font-black w-6 text-center transition-colors ${qty > 0 ? 'text-emerald-900' : 'text-gray-300'}`}>{qty}</span>
                        <button
                          onClick={() => updateAntojoQty(product.id, 1)}
                          className="w-10 h-10 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200 flex items-center justify-center hover:bg-emerald-500 hover:scale-110 active:scale-95 transition-all"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  setShowAntojosModal(false);
                  setShowCheckout(true); // Proceed to checkout
                }}
                className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
              >
                Continuar al Pago <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setShowAntojosModal(false);
                  setShowCheckout(true);
                }}
                className="text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-gray-800 transition-all"
              >
                Omitir por ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {showIncompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
          <div className="bg-white rounded-[50px] p-12 max-w-lg w-full shadow-2xl relative text-center">
            <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight uppercase tracking-tighter">Plan Incompleto</h2>
            <p className="text-gray-500 mb-10 text-lg">Para cubrir tus {dayPlan} días según los perfiles de la casa, te faltan platos de: {missingCategories.join(', ')}</p>
            <button onClick={() => setShowIncompleteModal(false)} className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all mb-4">Completar Selección</button>
            <button
              onClick={() => {
                setShowIncompleteModal(false);
                setShowAntojosModal(true); // Go to Antojos before checkout
              }}
              className="w-full py-4 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-800 transition-colors"
            >
              Continuar sin completar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
