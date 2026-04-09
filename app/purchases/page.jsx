"use client";
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Barcode, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export default function WBGrid() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

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
              <img
                src={item.image_url}
                alt={item.brand}
                className="object-cover w-full h-full hover:scale-105 transition-transform duration-500"
              />
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
            </CardContent>

            <CardFooter className="p-3 pt-0">
              {editingId === index ? (
                <div className="flex w-full gap-1 animate-in slide-in-from-bottom-2 duration-300">
                  <Input 
                    placeholder="Код..." 
                    className="h-9 text-xs focus-visible:ring-purple-500"
                    autoFocus
                  />
                  <Button size="icon" className="h-9 w-9 bg-purple-600 shrink-0" onClick={() => setEditingId(null)}>
                    <Check size={16} />
                  </Button>
                  <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setEditingId(null)}>
                    <X size={16} />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="secondary" 
                  className="w-full justify-center gap-2 text-xs font-semibold h-9 bg-purple-50 text-purple-700 hover:bg-purple-100 border-none"
                  onClick={() => setEditingId(index)}
                >
                  <Barcode size={16} />
                  Штрихкод
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
