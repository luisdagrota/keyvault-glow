import { Product } from "@/types/product";
import { supabase } from "@/integrations/supabase/client";

export async function fetchProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: Number(product.price),
      category: product.category || "",
      stock: product.stock,
      imageUrl: product.image_url || "",
    }));
  } catch (error) {
    console.error("Error fetching products from database:", error);
    return [];
  }
}
