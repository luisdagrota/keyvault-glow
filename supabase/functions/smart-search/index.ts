import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ products: [], sellers: [], categories: [], suggestions: [], correctedQuery: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all data in parallel
    const [productsResult, sellersResult, categoriesResult] = await Promise.all([
      supabase
        .from("seller_products")
        .select("id, name, description, price, category, stock, image_url, slug, likes_count, seller_id")
        .eq("is_active", true)
        .limit(100),
      supabase
        .from("seller_profiles")
        .select("id, full_name, average_rating, total_sales, bio, user_id")
        .eq("is_approved", true)
        .eq("is_suspended", false)
        .limit(50),
      supabase
        .from("seller_products")
        .select("category")
        .eq("is_active", true)
        .not("category", "is", null)
    ]);

    const allProducts = productsResult.data || [];
    const allSellers = sellersResult.data || [];
    const allCategories = [...new Set((categoriesResult.data || []).map(c => c.category).filter(Boolean))];

    // Use AI for intelligent matching if available
    let correctedQuery = query;
    let aiSuggestions: string[] = [];

    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `Você é um assistente de busca para uma loja de jogos digitais. 
Sua tarefa é:
1. Corrigir erros ortográficos no termo de busca
2. Sugerir termos relacionados para a busca

Categorias disponíveis: ${allCategories.join(", ")}
Alguns produtos: ${allProducts.slice(0, 20).map(p => p.name).join(", ")}

Responda APENAS em JSON válido no formato:
{"corrected": "termo corrigido", "suggestions": ["sugestão1", "sugestão2", "sugestão3"]}`
              },
              {
                role: "user",
                content: `Termo de busca: "${query}"`
              }
            ],
            max_tokens: 150,
            temperature: 0.3
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              correctedQuery = parsed.corrected || query;
              aiSuggestions = parsed.suggestions || [];
            }
          } catch (e) {
            console.log("AI parse error, using original query");
          }
        }
      } catch (e) {
        console.log("AI request failed, using fallback search");
      }
    }

    // Search with corrected query
    const searchTerm = correctedQuery.toLowerCase();
    const searchTerms: string[] = searchTerm.split(/\s+/).filter((t: string) => t.length > 1);

    // Score-based product matching
    const scoredProducts = allProducts.map(product => {
      let score = 0;
      const name = (product.name || "").toLowerCase();
      const desc = (product.description || "").toLowerCase();
      const cat = (product.category || "").toLowerCase();

      // Exact match in name (highest priority)
      if (name.includes(searchTerm)) score += 100;
      
      // Word matches
      searchTerms.forEach((term: string) => {
        if (name.includes(term)) score += 50;
        if (desc.includes(term)) score += 20;
        if (cat.includes(term)) score += 30;
      });

      // Popularity bonus
      score += (product.likes_count || 0) * 0.5;

      return { ...product, score };
    })
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

    // Search sellers
    const scoredSellers = allSellers.map(seller => {
      let score = 0;
      const name = (seller.full_name || "").toLowerCase();
      const bio = (seller.bio || "").toLowerCase();

      if (name.includes(searchTerm)) score += 100;
      searchTerms.forEach((term: string) => {
        if (name.includes(term)) score += 50;
        if (bio.includes(term)) score += 20;
      });

      // Rating and sales bonus
      score += (seller.average_rating || 0) * 5;
      score += (seller.total_sales || 0) * 0.1;

      return { ...seller, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

    // Match categories
    const matchedCategories = allCategories.filter(cat => {
      const catLower = cat.toLowerCase();
      return searchTerms.some((term: string) => catLower.includes(term)) || catLower.includes(searchTerm);
    }).slice(0, 5);

    // Get recommendations (most liked products not in search results)
    const productIds = new Set(scoredProducts.map(p => p.id));
    const recommendations = allProducts
      .filter(p => !productIds.has(p.id))
      .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
      .slice(0, 4);

    return new Response(
      JSON.stringify({
        products: scoredProducts.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          stock: p.stock,
          image_url: p.image_url,
          slug: p.slug,
          likes_count: p.likes_count,
          seller_id: p.seller_id
        })),
        sellers: scoredSellers.map(s => ({
          id: s.id,
          full_name: s.full_name,
          average_rating: s.average_rating,
          total_sales: s.total_sales
        })),
        categories: matchedCategories,
        suggestions: aiSuggestions,
        recommendations: recommendations.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image_url: p.image_url,
          slug: p.slug
        })),
        correctedQuery: correctedQuery !== query ? correctedQuery : null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Smart search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
