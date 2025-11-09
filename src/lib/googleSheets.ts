import { Product } from "@/types/product";
import { supabase } from "@/integrations/supabase/client";

const SHEET_ID = "1er-QqJee4-gheiE6jrQziFlbUrDkrb0uc2lO_8jnHSg";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

// Busca produtos do Google Sheets
async function fetchProductsFromSheets(): Promise<Product[]> {
  try {
    const response = await fetch(CSV_URL);
    const csvText = await response.text();
    
    const lines = csvText.split('\n');
    const products: Product[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = parseCSVLine(lines[i]);
      
      if (values.length >= 7) {
        const priceStr = values[3]?.replace(',', '.') || '0';
        
        products.push({
          id: values[0] || `sheet-product-${i}`,
          name: values[1] || '',
          description: values[2] || '',
          price: parseFloat(priceStr) || 0,
          category: values[4] || '',
          stock: parseInt(values[5]) || 0,
          imageUrl: values[6] || '',
        });
      }
    }
    
    return products;
  } catch (error) {
    console.error('Error fetching products from Google Sheets:', error);
    return [];
  }
}

// Busca produtos do Supabase
async function fetchProductsFromDatabase(): Promise<Product[]> {
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

// Função principal que combina produtos de ambas as fontes
export async function fetchProducts(): Promise<Product[]> {
  try {
    const [sheetProducts, dbProducts] = await Promise.all([
      fetchProductsFromSheets(),
      fetchProductsFromDatabase()
    ]);

    // Combina produtos do Google Sheets e do Supabase
    // Produtos do Supabase vêm primeiro (mais recentes)
    const allProducts = [...dbProducts, ...sheetProducts];
    
    // Remove duplicatas baseado no ID
    const uniqueProducts = allProducts.filter((product, index, self) =>
      index === self.findIndex((p) => p.id === product.id)
    );

    console.log(`Total de produtos: ${uniqueProducts.length} (${dbProducts.length} do painel + ${sheetProducts.length} da planilha)`);
    
    return uniqueProducts;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

// Helper function to parse CSV lines
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim().replace(/^"|"$/g, ''));
  return values;
}
