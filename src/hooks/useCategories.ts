import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Category {
  id: string;
  name: string;
  color: string;
  context: "subject" | "course" | "session";
  parentId: string | null;
}

export interface CategoryItem {
  categoryId: string;
  itemId: string;
  itemType: "subject" | "course" | "session";
}

export function useCategories(context: "subject" | "course" | "session") {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryItems, setCategoryItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [{ data: cats }, { data: items }] = await Promise.all([
      supabase.from("categories").select("*").eq("user_id", user.id).eq("context", context).order("name"),
      supabase.from("category_items").select("*").eq("item_type", context),
    ]);
    setCategories((cats || []).map((c: any) => ({ id: c.id, name: c.name, color: c.color, context: c.context, parentId: c.parent_id ?? null })));
    setCategoryItems((items || []).map((i: any) => ({ categoryId: i.category_id, itemId: i.item_id, itemType: i.item_type })));
    setLoading(false);
  }, [user, context]);

  useEffect(() => { refresh(); }, [refresh]);

  const addCategory = async (name: string, color: string, parentId: string | null = null) => {
    if (!user) return;
    const id = crypto.randomUUID();
    await supabase.from("categories").insert({ id, user_id: user.id, name, color, context, parent_id: parentId });
    await refresh();
    return id;
  };

  const updateCategory = async (id: string, name: string, color: string, parentId: string | null | undefined = undefined) => {
    const patch: any = { name, color };
    if (parentId !== undefined) patch.parent_id = parentId;
    await supabase.from("categories").update(patch).eq("id", id);
    await refresh();
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    await refresh();
  };

  const linkItem = async (categoryId: string, itemId: string, itemType: "subject" | "course" | "session") => {
    await supabase.from("category_items").insert({ category_id: categoryId, item_id: itemId, item_type: itemType });
    await refresh();
  };

  const unlinkItem = async (categoryId: string, itemId: string, itemType: "subject" | "course" | "session") => {
    await supabase.from("category_items").delete().eq("category_id", categoryId).eq("item_id", itemId).eq("item_type", itemType);
    await refresh();
  };

  const setItemCategories = async (itemId: string, itemType: "subject" | "course" | "session", categoryIds: string[]) => {
    await supabase.from("category_items").delete().eq("item_id", itemId).eq("item_type", itemType);
    if (categoryIds.length > 0) {
      await supabase.from("category_items").insert(
        categoryIds.map((cid) => ({ category_id: cid, item_id: itemId, item_type: itemType }))
      );
    }
    await refresh();
  };

  const getCategoriesForItem = (itemId: string, itemType: string) => {
    const ids = categoryItems.filter((i) => i.itemId === itemId && i.itemType === itemType).map((i) => i.categoryId);
    return categories.filter((c) => ids.includes(c.id));
  };

  const getItemsInCategory = (categoryId: string, itemType: string) => {
    return categoryItems.filter((i) => i.categoryId === categoryId && i.itemType === itemType).map((i) => i.itemId);
  };

  const getDescendantIds = (categoryId: string): string[] => {
    const result: string[] = [];
    const stack = [categoryId];
    while (stack.length) {
      const id = stack.pop()!;
      result.push(id);
      categories.filter((c) => c.parentId === id).forEach((child) => stack.push(child.id));
    }
    return result;
  };

  const getChildren = (parentId: string | null) =>
    categories.filter((c) => (c.parentId ?? null) === parentId);

  return {
    categories,
    categoryItems,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    linkItem,
    unlinkItem,
    setItemCategories,
    getCategoriesForItem,
    getItemsInCategory,
    getDescendantIds,
    getChildren,
    refresh,
  };
}
