import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
}

export interface CategoryWithSubcategories extends Category {
  subcategories: Subcategory[];
}

export const useCategories = () => {
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      
      const { data: categoriesData, error: catError } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (catError) {
        console.error("Error fetching categories:", catError);
        setLoading(false);
        return;
      }

      const { data: subcategoriesData, error: subError } = await supabase
        .from("subcategories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (subError) {
        console.error("Error fetching subcategories:", subError);
        setLoading(false);
        return;
      }

      const categoriesWithSubs: CategoryWithSubcategories[] = (categoriesData || []).map(cat => ({
        ...cat,
        subcategories: (subcategoriesData || []).filter(sub => sub.category_id === cat.id)
      }));

      setCategories(categoriesWithSubs);
      setLoading(false);
    };

    fetchCategories();
  }, []);

  return { categories, loading };
};

export const useCategoryBySlug = (slug: string | undefined) => {
  const [category, setCategory] = useState<CategoryWithSubcategories | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const fetchCategory = async () => {
      setLoading(true);
      
      const { data: categoryData, error: catError } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (catError || !categoryData) {
        console.error("Error fetching category:", catError);
        setCategory(null);
        setLoading(false);
        return;
      }

      const { data: subcategoriesData } = await supabase
        .from("subcategories")
        .select("*")
        .eq("category_id", categoryData.id)
        .eq("is_active", true)
        .order("display_order");

      setCategory({
        ...categoryData,
        subcategories: subcategoriesData || []
      });
      setLoading(false);
    };

    fetchCategory();
  }, [slug]);

  return { category, loading };
};
