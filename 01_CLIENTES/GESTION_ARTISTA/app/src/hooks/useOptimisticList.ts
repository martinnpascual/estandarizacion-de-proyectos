"use client";

import { useState, useCallback } from "react";

/**
 * useOptimisticList — UI optimista para listas
 *
 * Permite remover/agregar ítems al instante en la UI,
 * con rollback automático si el server action falla.
 *
 * @example
 * const { items, removeOptimistic, addOptimistic } = useOptimisticList(songs);
 *
 * async function handleDelete(id: string) {
 *   const reverted = removeOptimistic(id);
 *   const { error } = await deleteSong(id);
 *   if (error) reverted(); // rollback
 * }
 */
export function useOptimisticList<T extends { id: string }>(initialItems: T[]) {
  const [items, setItems] = useState<T[]>(initialItems);

  // Sincronizar cuando el padre actualiza la prop
  const sync = useCallback((newItems: T[]) => {
    setItems(newItems);
  }, []);

  /**
   * Remueve un ítem optimistamente.
   * Devuelve una función `revert()` para deshacer el cambio.
   */
  const removeOptimistic = useCallback((id: string): (() => void) => {
    const prev = items;
    setItems((curr) => curr.filter((item) => item.id !== id));
    return () => setItems(prev);
  }, [items]);

  /**
   * Agrega un ítem optimistamente al inicio.
   * Devuelve `revert()` para deshacerlo.
   */
  const addOptimistic = useCallback((item: T): (() => void) => {
    setItems((curr) => [item, ...curr]);
    return () => setItems((curr) => curr.filter((i) => i.id !== item.id));
  }, []);

  /**
   * Actualiza un ítem existente optimistamente.
   * Devuelve `revert()` para deshacerlo.
   */
  const updateOptimistic = useCallback((id: string, patch: Partial<T>): (() => void) => {
    const prev = items;
    setItems((curr) =>
      curr.map((item) => item.id === id ? { ...item, ...patch } : item)
    );
    return () => setItems(prev);
  }, [items]);

  return { items, setItems, removeOptimistic, addOptimistic, updateOptimistic, sync };
}
