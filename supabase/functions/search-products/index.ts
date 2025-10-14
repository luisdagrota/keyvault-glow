import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl: string;
  platform?: string;
  genre?: string;
}

const SHEET_ID = "1er-QqJee4-gheiE6jrQziFlbUrDkrb0uc2lO_8jnHSg";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

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

async function fetchProductsFromSheet(): Promise<Product[]> {
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
          id: values[0] || `product-${i}`,
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
    console.error('Error fetching products:', error);
    throw error;
  }
}

function filterProducts(products: Product[], searchTerm: string, category?: string): Product[] {
  let filtered = products;

  // Filtro por categoria
  if (category && category !== 'all') {
    filtered = filtered.filter(p => 
      p.category.toLowerCase() === category.toLowerCase()
    );
  }

  // Filtro por termo de busca (case-insensitive, busca parcial)
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  }

  return filtered;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const searchTerm = url.searchParams.get('search') || '';
    const category = url.searchParams.get('category') || '';

    console.log('Search request:', { searchTerm, category });

    // Buscar todos os produtos
    const allProducts = await fetchProductsFromSheet();
    
    // Filtrar produtos
    const filteredProducts = filterProducts(allProducts, searchTerm, category);

    console.log(`Found ${filteredProducts.length} products`);

    return new Response(
      JSON.stringify({ products: filteredProducts }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in search-products function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to search products', products: [] }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
