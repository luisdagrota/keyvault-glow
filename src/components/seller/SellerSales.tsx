import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle } from "lucide-react";
import { BuyerReputationCompact } from "@/components/BuyerReputation";
import { BuyerReviewForm } from "@/components/BuyerReviewForm";

interface Sale {
  id: string;
  product_name: string;
  buyer_name: string;
  buyer_id: string | null;
  buyer_email: string;
  sale_amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
  balance_released_at: string | null;
}

interface BuyerProfile {
  id: string;
  buyer_rating: number;
  total_purchases: number;
}

interface BuyerReview {
  order_id: string;
}

interface SellerSalesProps {
  sellerId: string;
}

export const SellerSales = ({ sellerId }: SellerSalesProps) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [buyerProfiles, setBuyerProfiles] = useState<Record<string, BuyerProfile>>({});
  const [existingReviews, setExistingReviews] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    // Fetch sales
    const { data: salesData, error: salesError } = await supabase
      .from("seller_sales")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    if (salesError) {
      console.error("Error fetching sales:", salesError);
      return;
    }

    setSales(salesData || []);

    // Get unique buyer IDs
    const buyerIds = [...new Set((salesData || []).map(s => s.buyer_id).filter(Boolean))];
    
    if (buyerIds.length > 0) {
      // Fetch buyer profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, buyer_rating, total_purchases")
        .in("id", buyerIds);
      
      const profilesMap: Record<string, BuyerProfile> = {};
      (profilesData || []).forEach(p => {
        profilesMap[p.id] = p;
      });
      setBuyerProfiles(profilesMap);
    }

    // Fetch existing reviews from this seller
    const { data: reviewsData } = await supabase
      .from("buyer_reviews")
      .select("order_id")
      .eq("seller_id", sellerId);
    
    setExistingReviews(new Set((reviewsData || []).map(r => r.order_id)));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [sellerId]);

  const getStatusBadge = (status: string, releasedAt: string | null) => {
    if (status === "approved" && releasedAt) {
      return <Badge variant="default">Liberado</Badge>;
    }
    if (status === "approved") {
      return <Badge variant="secondary">Aguardando</Badge>;
    }
    if (status === "pending") {
      return <Badge variant="outline">Pendente</Badge>;
    }
    return <Badge variant="destructive">{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">Minhas Vendas</h2>
        <p className="text-sm text-muted-foreground">
          Acompanhe todas as suas vendas e a taxa aplicada
        </p>
      </div>

      {sales.length === 0 ? (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem vendas. Continue divulgando seus produtos!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => {
            const buyerProfile = sale.buyer_id ? buyerProfiles[sale.buyer_id] : null;
            const hasReviewed = existingReviews.has(sale.id);
            
            return (
              <Card key={sale.id}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="font-medium text-sm sm:text-base truncate">
                          {sale.product_name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            Cliente: {sale.buyer_name}
                          </span>
                          {buyerProfile && (
                            <BuyerReputationCompact 
                              rating={buyerProfile.buyer_rating ?? 5} 
                              totalPurchases={buyerProfile.total_purchases ?? 0} 
                            />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div className="flex flex-col items-start sm:items-end">
                          <span className="text-muted-foreground">Bruto</span>
                          <span className="font-medium">R$ {sale.sale_amount.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col items-start sm:items-end">
                          <span className="text-muted-foreground">Taxa</span>
                          <span className="text-destructive">- R$ {sale.fee_amount.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col items-start sm:items-end">
                          <span className="text-muted-foreground">Líquido</span>
                          <span className="text-green-500 font-medium">R$ {sale.net_amount.toFixed(2)}</span>
                        </div>
                        <div>
                          {getStatusBadge(sale.status, sale.balance_released_at)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Buyer Review Section */}
                    {sale.status === 'approved' && sale.buyer_id && (
                      <div className="flex items-center justify-end border-t pt-3 mt-1">
                        {hasReviewed ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle size={14} className="text-green-500" />
                            Cliente avaliado
                          </span>
                        ) : (
                          <BuyerReviewForm
                            orderId={sale.id}
                            buyerId={sale.buyer_id}
                            buyerName={sale.buyer_name}
                            sellerId={sellerId}
                            onReviewSubmitted={fetchData}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Como funciona a taxa?</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 text-xs sm:text-sm text-muted-foreground space-y-1.5 sm:space-y-2">
          <p>
            • Uma taxa de <strong>9,99%</strong> é descontada automaticamente de cada venda.
          </p>
          <p>
            • O valor líquido (após a taxa) entra como <strong>Saldo a Liberar</strong>.
          </p>
          <p>
            • Após <strong>1 dia</strong>, o saldo é transferido para <strong>Saldo Liberado</strong>.
          </p>
          <p>
            • Você pode solicitar o saque do saldo liberado a qualquer momento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
