"use client";
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Barcode, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import Image from 'next/image'
export default function WBGrid() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newBarcode, setNewBarcode] = useState("");

  // Запрос к бэкенду
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const response = await fetch('http://localhost:8080/wb-purchases');
        if (!response.ok) throw new Error('Ошибка при загрузке');
        const data = await response.json();
        setPurchases(data);
      } catch (error) {
        console.error("Ошибка:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, []);

  const saveBarcode = async (id) => {
    try {
      const response = await fetch(`http://localhost:8080/wb-purchases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: newBarcode })
      });

      if (response.ok) {
        setEditingId(null);
        // Опционально: обнови данные в локальном стейте, чтобы юзер сразу увидел изменения
        // window.location.reload(); // самый простой способ обновить список
      }
      setPurchases(prev => prev.map(p => p.id === id ? { ...p, barcode: newBarcode } : p)); //TODO рефакторинг чтобы было по SOLID
    } catch (err) {
      console.error("Ошибка запроса:", err);
    }
  };


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-purple-600" size={40} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-slate-50 min-h-screen">
      <div className="flex items-center gap-2 mb-8">
        <div className="bg-purple-600 p-2 rounded-lg text-white">
          <ShoppingBag size={20} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Покупки Wildberries</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {purchases.map((item, index) => (
          <Card key={index} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-white">
            <AspectRatio ratio={3 / 4} className="bg-slate-100">
              {item.image_url ? (
                <AspectRatio ratio={3 / 4} className="bg-slate-100">
                  <Image
                    src={item.image_url}
                    alt={item.brand || "Product"}
                    fill
                    priority={index < 10}
                    className="object-cover"
                    unoptimized
                  />
                </AspectRatio>
              ) : (
                <div className="flex items-center justify-center bg-slate-50 text-slate-400 text-xs h-[150px]">
                  Нет фото
                </div>
              )}
              {/* Если в JSON нет артикула, можно выводить дату получения */}
              <div className="absolute top-2 left-2 bg-white/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-medium text-slate-600 border border-slate-200">
                {item.receive_date || 'В пути'}
              </div>
            </AspectRatio>

            <CardContent className="p-3">
              <p className="text-lg font-bold text-slate-900 mb-1">{item.price.toLocaleString()} ₽</p>
              <h3 className="text-xs font-medium text-slate-600 line-clamp-2 h-8 leading-relaxed">
                {item.brand}
              </h3>

              {/* НОВЫЙ БЛОК: Отображение штрихкода */}
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Штрихкод:</span>
                <span className="text-xs font-mono text-slate-700">
                  {item.barcode || <span className="text-slate-300 italic">не указан</span>}
                </span>
              </div>
            </CardContent>

            <CardFooter className="p-3 pt-0">
              {editingId === index ? (
                <div className="flex items-center gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
                  <input
                    className="h-9 flex-1 min-w-0 rounded-md border border-purple-300 px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    placeholder="Штрихкод..."
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && saveBarcode(item.id)}
                  />
                  <button
                    className="h-9 px-4 bg-purple-600 text-white rounded-md text-xs font-bold hover:bg-purple-700 active:scale-95 transition-all shadow-sm"
                    onClick={() => saveBarcode(item.id)}
                  >
                    ОК
                  </button>
                  <button
                    className="h-9 px-2 text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setEditingId(null)}
                    title="Отмена"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full justify-center gap-2 text-xs font-semibold h-9 bg-purple-50 text-purple-700 hover:bg-purple-100 border-none transition-colors"
                  onClick={() => {
                    setEditingId(index);
                    setNewBarcode(item.barcode || "");
                  }}
                >
                  <Barcode size={16} />
                  {item.barcode ? item.barcode : "Штрихкод"}
                </Button>
              )}
            </CardFooter>

          </Card>
        ))}
      </div>
    </div>
  );
}
