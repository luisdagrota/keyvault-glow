import { Product } from "@/types/product";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1er-QqJee4-gheiE6jrQziFlbUrDkrb0uc2lO_8jnHSg/edit?usp=sharing";

// Extract the spreadsheet ID from the URL
const SHEET_ID = "1er-QqJee4-gheiE6jrQziFlbUrDkrb0uc2lO_8jnHSg";

// Convert Google Sheets to CSV export URL
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

export async function fetchProducts(): Promise<Product[]> {
  try {
    const response = await fetch(CSV_URL);
    const csvText = await response.text();
    
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const products: Product[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = parseCSVLine(lines[i]);
      
      if (values.length >= 7) {
        // Convert comma to dot for price (Brazilian format: 35,99 -> 35.99)
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
    console.error('Error fetching products from Google Sheets:', error);
    return getMockProducts();
  }
}

// Helper function to parse CSV lines properly (handles commas within quotes)
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

// Fallback mock products in case the sheet is unavailable
function getMockProducts(): Product[] {
  return [
    {
      id: '1',
      name: 'GTA V Premium Edition',
      description: 'Conta completa com todos os DLCs e conteúdo premium',
      price: 89.90,
      category: 'Ação',
      imageUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800',
      stock: 15,
      platform: 'PC',
      genre: 'Ação'
    },
    {
      id: '2',
      name: 'Red Dead Redemption 2',
      description: 'Chave original com garantia de ativação',
      price: 129.90,
      category: 'Aventura',
      imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800',
      stock: 8,
      platform: 'PC',
      genre: 'Aventura'
    },
    {
      id: '3',
      name: 'Cyberpunk 2077',
      description: 'Edição completa com todas as atualizações',
      price: 149.90,
      category: 'RPG',
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
      stock: 0,
      platform: 'PC',
      genre: 'RPG'
    }
  ];
}
