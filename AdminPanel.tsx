import React, { useState } from 'react';
import {
    ShieldCheck, AlertTriangle, Database, Zap,
    Upload, Save, ChevronDown, ChevronUp, Search, Download, CheckCircle2, Sparkles, Trash2, Plus, Loader2, Image as ImageIcon
} from 'lucide-react';
import { Ingredient, Recipe } from './types';
import { auditCatalog, processBulkImport } from './geminiService';
import { uploadImageToCloudinary } from './imageService';

interface AdminPanelProps {
    ingredients: Ingredient[];
    recipes: Recipe[];
    onUpdateIngredient: (id: string, updates: Partial<Ingredient>) => void;
    onUpdateRecipe: (id: string, updates: Partial<Recipe>) => void;
    onAddRecipe: (recipe: Recipe) => void;
    onDeleteRecipe: (id: string) => void;
    onExit: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ ingredients, recipes, onUpdateIngredient, onAddRecipe, onUpdateRecipe, onDeleteRecipe, onExit }) => {
    const [activeModule, setActiveModule] = useState<'prices' | 'dishes'>('prices');
    const [filter, setFilter] = useState('');

    // States for Prices Module
    const [isAuditing, setIsAuditing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [importLogs, setImportLogs] = useState<string[]>([]);
    const [auditResults, setAuditResults] = useState<{
        missingPrices: string[];
        suggestedCodes: Record<string, string>;
        tips: string[];
    } | null>(null);

    // States for Dish Module
    const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);
    const [newIngredientId, setNewIngredientId] = useState('');
    const [newIngredientAmount, setNewIngredientAmount] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const filteredIngredients = ingredients.filter(i =>
        i.name.toLowerCase().includes(filter.toLowerCase()) ||
        i.id.toLowerCase().includes(filter.toLowerCase())
    );

    // ... (Keep existing handlers: handleAudit, applySuggestedCodes, downloadTemplate, handleBulkImport)
    const handleAudit = async () => {
        setIsAuditing(true);
        const results = await auditCatalog(ingredients);
        setAuditResults({
            missingPrices: results.missingPrices,
            suggestedCodes: results.suggestedCodes,
            tips: results.optimizationTips
        });
        setIsAuditing(false);
    };

    const applySuggestedCodes = () => {
        if (!auditResults) return;
        Object.entries(auditResults.suggestedCodes).forEach(([name, code]) => {
            const ingredient = ingredients.find(i => i.name === name);
            if (ingredient) {
                onUpdateIngredient(ingredient.id, { supplierCode: code });
            }
        });
        alert("¡Códigos aplicados exitosamente!");
    };

    const downloadTemplate = () => {
        // Ordenar: primero los que faltan precio, de menor a mayor (los de 0 primero)
        const sorted = [...ingredients].sort((a, b) => ((a.cost || 0) - (b.cost || 0)));

        const headers = ["ID (No editar)", "Nombre", "Unidad Interna", "Precio Compra Actual", "STATUS", "Nuevo Precio Proveedor", "Nueva Unidad Proveedor (kg, lb, etc)"];
        const rows = sorted.map(i => [
            i.id,
            i.name,
            i.unit,
            i.cost || 0,
            (i.cost || 0) <= 0 ? '!!! FALTA PRECIO !!!' : 'OK',
            '', // Espacio para nuevo precio
            ''  // Espacio para nueva unidad
        ].join(","));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_inteligente_precios.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkImport = async () => {
        if (!bulkText.trim()) return;
        setIsImporting(true);
        setImportLogs([]);

        const result = await processBulkImport(bulkText, ingredients);

        result.updates.forEach(update => {
            if (update.id) {
                onUpdateIngredient(update.id, update);
            }
        });

        setImportLogs(result.logs);
        setIsImporting(false);
        setBulkText('');
        alert(`Proceso completado. ${result.updates.length} productos actualizados.`);
    };

    const handleSaveRecipe = () => {
        if (!editingRecipe || !editingRecipe.name || !editingRecipe.category) {
            alert("Por favor completa el nombre y categoría.");
            return;
        }

        // Validar que tenga ingredientes
        if (!editingRecipe.ingredients || editingRecipe.ingredients.length === 0) {
            alert("El plato debe tener al menos un ingrediente.");
            return;
        }

        if (editingRecipe.id) {
            // Update
            onUpdateRecipe(editingRecipe.id, editingRecipe);
        } else {
            // Create
            onAddRecipe({
                ...editingRecipe,
                id: Math.random().toString(36).substr(2, 9),
                ingredients: editingRecipe.ingredients || [],
                image: editingRecipe.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80',
                description: editingRecipe.description || 'Sin descripción'
                // description is mandatory based on types, filling defaults
            } as Recipe);
        }
        setEditingRecipe(null);
    };

    const addIngredientToRecipe = () => {
        if (!newIngredientId || newIngredientAmount <= 0) return;
        setEditingRecipe(prev => {
            if (!prev) return null;
            const current = prev.ingredients || [];
            return {
                ...prev,
                ingredients: [...current, { ingredientId: newIngredientId, amount: newIngredientAmount }]
            };
        });
        setNewIngredientId('');
        setNewIngredientAmount(0);
    };

    const removeIngredientFromRecipe = (idx: number) => {
        setEditingRecipe(prev => {
            if (!prev) return null;
            const current = [...(prev.ingredients || [])];
            current.splice(idx, 1);
            return { ...prev, ingredients: current };
        });
    };

    const handleDownloadSystemCode = () => {
        // 1. Serialize Ingredients
        const ingredientsCode = JSON.stringify(ingredients, null, 2);

        // 2. Serialize Recipes with Category Enum replacement
        let recipesCode = JSON.stringify(recipes, null, 2);

        // Clean up keys to match TypeScript format (optional, but cleaner)
        // json stringify puts quotes around keys. We can leave them or remove them.
        // But crucially, we must replace "category": "Value" with category: Category.VALUE

        const categoryMap: Record<string, string> = {
            'Desayuno': 'Category.DESAYUNO',
            'Almuerzo': 'Category.ALMUERZO',
            'Cena': 'Category.CENA',
            'Medias Nueves': 'Category.MEDIAS_NUEVES',
            'Onces': 'Category.ONCES'
        };

        Object.entries(categoryMap).forEach(([val, enumRef]) => {
            // Regex to match "category": "Value"
            const regex = new RegExp(`"category": "${val}"`, 'g');
            recipesCode = recipesCode.replace(regex, `"category": ${enumRef}`);
        });

        const fileContent = `
import { Category, Ingredient, Recipe } from './types';

// Precios Corabastos 2025 (Simulados basados en tendencias)
// Precios por GRAMO o UNIDAD
export const INGREDIENTS: Ingredient[] = ${ingredientsCode};

export const RECIPES: Recipe[] = ${recipesCode};
`;

        fetch('/api/save-constants', {
            method: 'POST',
            body: fileContent,
            headers: { 'Content-Type': 'text/plain' }
        })
            .then(res => {
                if (res.ok) {
                    alert('✅ ¡Sistema actualizado con éxito! Los cambios son permanentes.');
                } else {
                    alert('❌ Error al guardar. Verifica la consola.');
                }
            })
            .catch(err => {
                console.error(err);
                alert('❌ Error de conexión con el guardado local.');
            });
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8 font-sans">
            <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-emerald-600" />
                            Panel Administrativo
                        </h1>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveModule('prices')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeModule === 'prices' ? 'bg-white shadow text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Gestión de Precios
                        </button>
                        <button
                            onClick={() => setActiveModule('dishes')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeModule === 'dishes' ? 'bg-white shadow text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Platos y Categorías
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownloadSystemCode}
                        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                        title="Descargar archivo constants.ts para actualizar el sistema permanentemente"
                    >
                        <Download className="w-4 h-4" /> Guardar en Sistema
                    </button>

                    <button onClick={onExit} className="text-gray-400 hover:text-red-500 font-bold text-xs uppercase tracking-widest transition-colors pl-4 border-l border-gray-200">
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            {/* RECIPE MODAL */}
            {editingRecipe && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-black text-gray-800">
                                {editingRecipe.id ? 'Editar Plato' : 'Crear Nuevo Plato'}
                            </h3>
                            <button
                                onClick={() => setEditingRecipe(null)}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                            >
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Nombre del Plato</label>
                                    <input
                                        type="text"
                                        value={editingRecipe.name || ''}
                                        onChange={e => setEditingRecipe({ ...editingRecipe, name: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="Ej: Calentao de Lentejas"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Categoría</label>
                                        <select
                                            value={editingRecipe.category || ''}
                                            onChange={e => setEditingRecipe({ ...editingRecipe, category: e.target.value as any })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 outline-none"
                                        >
                                            <option value="">Selecciona...</option>
                                            <option value="Desayuno">Desayuno</option>
                                            <option value="Almuerzo">Almuerzo</option>
                                            <option value="Cena">Cena</option>
                                            <option value="Medias Nueves">Medias Nueves</option>
                                            <option value="Onces">Onces</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Imagen del Plato</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={editingRecipe.image || ''}
                                                onChange={e => setEditingRecipe({ ...editingRecipe, image: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs text-gray-600 outline-none"
                                                placeholder="https://... o subir archivo ->"
                                            />
                                            <label className={`flex items - center justify - center px - 4 py - 2 rounded - xl cursor - pointer transition - all ${isUploading ? 'bg-gray-200 cursor-not-allowed' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'} `}>
                                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    disabled={isUploading}
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        setIsUploading(true);
                                                        try {
                                                            const url = await uploadImageToCloudinary(file);
                                                            setEditingRecipe(prev => prev ? ({ ...prev, image: url }) : null);
                                                        } catch (error) {
                                                            alert("Error al subir imagen. Verifica tus credenciales en .env.local");
                                                        } finally {
                                                            setIsUploading(false);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Frase / Descripción</label>
                                    <textarea
                                        value={editingRecipe.description || ''}
                                        onChange={e => setEditingRecipe({ ...editingRecipe, description: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 outline-none h-16 resize-none"
                                        placeholder="Ej: Energía pura con sabor hogareño."
                                    />
                                </div>
                            </div>

                            {/* Ingredients Manager */}
                            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                                <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Database className="w-3 h-3" /> Ingredientes
                                </h4>

                                {/* List of added ingredients */}
                                <div className="space-y-2 mb-4">
                                    {(editingRecipe.ingredients || []).map((ri, idx) => {
                                        const ing = ingredients.find(i => i.id === ri.ingredientId);
                                        return (
                                            <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-emerald-100/50 shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-700">{ing?.name || ri.ingredientId}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono text-emerald-600 font-bold">{ri.amount} {ing?.unit}</span>
                                                    <button onClick={() => removeIngredientFromRecipe(idx)} className="text-red-400 hover:text-red-600">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Add new ingredient */}
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1 pl-1">Ingrediente</label>
                                        <select
                                            value={newIngredientId}
                                            onChange={e => setNewIngredientId(e.target.value)}
                                            className="w-full h-9 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                                        >
                                            <option value="">Buscar...</option>
                                            {[...ingredients].sort((a, b) => a.name.localeCompare(b.name)).map(ing => (
                                                <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-20">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1 pl-1">Cantidad</label>
                                        <input
                                            type="number"
                                            value={newIngredientAmount}
                                            onChange={e => setNewIngredientAmount(parseFloat(e.target.value))}
                                            className="w-full h-9 bg-white border border-gray-200 rounded-lg px-2 text-xs font-mono outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <button
                                        onClick={addIngredientToRecipe}
                                        className="h-9 w-9 bg-emerald-600 text-white rounded-lg flex items-center justify-center hover:bg-emerald-700 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    onClick={() => setEditingRecipe(null)}
                                    className="px-6 py-3 rounded-xl font-bold text-xs uppercase text-gray-400 hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveRecipe}
                                    className="px-8 py-3 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-colors shadow-lg flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> Guardar Plato
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {activeModule === 'prices' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in zoom-in-95 duration-300">

                    {/* COLUMNA IZQUIERDA: AUDITORÍA */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-lg border border-emerald-100">
                            <h2 className="text-xl font-black text-emerald-900 mb-4 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-emerald-500" /> Auditoría Inteligente
                            </h2>
                            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                                La IA revisará tu catálogo buscando precios faltantes y asignará códigos SKU automáticamente.
                            </p>

                            <button
                                onClick={handleAudit}
                                disabled={isAuditing}
                                className={`w - full py - 4 rounded - xl font - black text - xs uppercase tracking - widest shadow - lg transition - all ${isAuditing ? 'bg-gray-100 text-gray-400' : 'bg-emerald-900 text-emerald-400 hover:scale-105'} `}
                            >
                                {isAuditing ? 'Analizando Catálogo...' : 'Ejecutar Auditoría IA'}
                            </button>

                            {auditResults && (
                                <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                    {auditResults.missingPrices.length > 0 && (
                                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                            <h3 className="text-red-800 font-black text-xs uppercase mb-2 flex items-center gap-2">
                                                <AlertTriangle className="w-3 h-3" /> Precios Faltantes
                                            </h3>
                                            <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                                                {auditResults.missingPrices.map(item => <li key={item}>• {item}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    {Object.keys(auditResults.suggestedCodes).length > 0 && (
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                            <h3 className="text-blue-800 font-black text-xs uppercase mb-2 flex items-center gap-2">
                                                <Database className="w-3 h-3" /> Códigos Sugeridos
                                            </h3>
                                            <div className="text-xs text-blue-600 mb-3">
                                                Se detectaron {Object.keys(auditResults.suggestedCodes).length} productos sin código.
                                            </div>
                                            <button
                                                onClick={applySuggestedCodes}
                                                className="w-full py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-700"
                                            >
                                                Aplicar Códigos
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* CARGA MASIVA */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-black text-gray-600 flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-emerald-600" /> Carga Masiva IA
                                </h2>
                                <button
                                    onClick={downloadTemplate}
                                    className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-800 uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100"
                                    title="Descargar Plantilla Excel/CSV"
                                >
                                    <Download className="w-3 h-3" /> Plantilla
                                </button>
                            </div>

                            <p className="text-[10px] text-gray-400 mb-3">
                                Pega tu tabla (Excel/CSV). La IA detectará IDs, precios y <b>convertirá unidades automáticamente</b> (ej: lb → g).
                            </p>

                            <textarea
                                value={bulkText}
                                onChange={(e) => setBulkText(e.target.value)}
                                placeholder="Ej: papa-pastusa, Papa, 2000, lb..."
                                className="w-full h-32 bg-gray-50 rounded-xl border-2 border-gray-100 p-4 text-xs font-mono mb-4 focus:border-emerald-500 focus:outline-none"
                            />
                            <button
                                onClick={handleBulkImport}
                                disabled={isImporting || !bulkText}
                                className={`w - full py - 3 rounded - xl font - black text - xs uppercase transition - colors shadow - lg flex items - center justify - center gap - 2 ${isImporting ? 'bg-gray-200 text-gray-400' : 'bg-gray-900 text-white hover:bg-black'} `}
                            >
                                {isImporting ? 'Procesando con IA...' : 'Procesar e Importar'} <Sparkles className="w-3 h-3 text-yellow-400" />
                            </button>

                            {importLogs.length > 0 && (
                                <div className="mt-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100 max-h-40 overflow-y-auto">
                                    <h3 className="text-emerald-800 font-black text-[10px] uppercase mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3" /> Cambios Realizados
                                    </h3>
                                    <ul className="space-y-1">
                                        {importLogs.map((log, i) => (
                                            <li key={i} className="text-[9px] text-emerald-700 font-mono">• {log}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: TABLA DE PRODUCTOS (PRECIOS) */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar ingrediente..."
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                    {ingredients.length} Items
                                </div>
                            </div>

                            <div className="overflow-x-auto max-h-[600px]">
                                <table className="w-full">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Producto</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Código</th>
                                            <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Costo (Compra)</th>
                                            <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio (Venta)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredIngredients.map(ingredient => (
                                            <tr key={ingredient.id} className="hover:bg-emerald-50/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 text-sm">{ingredient.name}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">{ingredient.unit}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="text"
                                                        value={ingredient.supplierCode || ''}
                                                        onChange={(e) => onUpdateIngredient(ingredient.id, { supplierCode: e.target.value })}
                                                        placeholder="---"
                                                        className="bg-transparent border-b border-transparent group-hover:border-gray-300 focus:border-emerald-500 outline-none w-20 text-xs font-mono text-gray-600"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="text-gray-400 text-xs">$</span>
                                                        <input
                                                            type="number"
                                                            value={ingredient.cost || 0}
                                                            onChange={(e) => onUpdateIngredient(ingredient.id, { cost: parseFloat(e.target.value) })}
                                                            className={`w - 20 text - right font - mono text - sm bg - transparent border - b border - transparent group - hover: border - gray - 300 focus: border - emerald - 500 outline - none ${(ingredient.cost || 0) <= 0 ? 'text-red-500 font-bold' : 'text-gray-600'} `}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="text-gray-400 text-xs">$</span>
                                                        <input
                                                            type="number"
                                                            value={ingredient.pricePerUnit}
                                                            onChange={(e) => onUpdateIngredient(ingredient.id, { pricePerUnit: parseFloat(e.target.value) })}
                                                            className="w-20 text-right font-mono text-sm font-bold text-emerald-700 bg-transparent border-b border-transparent group-hover:border-gray-300 focus:border-emerald-500 outline-none"
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                    {/* MODULO 2: GESTION DE PLATOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div
                            onClick={() => setEditingRecipe({ ingredients: [] })}
                            className="border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center p-8 text-gray-400 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer group h-[300px]"
                        >
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-white group-hover:shadow-md transition-all">
                                <Sparkles className="w-8 h-8" />
                            </div>
                            <span className="font-black uppercase tracking-widest text-xs">Crear Nuevo Plato</span>
                        </div>
                        {recipes.map(recipe => (
                            <div key={recipe.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-xl transition-all">
                                <div className="h-40 overflow-hidden relative">
                                    <img src={recipe.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={recipe.name} />
                                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                        {recipe.category}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-xl font-black text-gray-900 mb-2">{recipe.name}</h3>
                                    <p className="text-xs text-gray-500 mb-4 line-clamp-2">{recipe.description}</p>
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                                        <Database className="w-3 h-3" /> {recipe.ingredients.length} Ingredientes
                                    </div>
                                    <button
                                        onClick={() => setEditingRecipe(recipe)}
                                        className="mt-6 w-full py-3 bg-gray-50 text-gray-900 font-bold text-xs uppercase rounded-xl hover:bg-emerald-600 hover:text-white transition-colors"
                                    >
                                        Editar Plato
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm('¿Estás seguro de eliminar este plato?')) {
                                                onDeleteRecipe(recipe.id);
                                            }
                                        }}
                                        className="mt-2 w-full py-3 border border-red-100 text-red-400 font-bold text-xs uppercase rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-3 h-3" /> Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
