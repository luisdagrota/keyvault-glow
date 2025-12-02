import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star, Check, X, Eye, Trash2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Review {
  id: string;
  product_id: string;
  order_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  product_name?: string;
  customer_email?: string;
}

export function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    
    // Carregar reviews com informações relacionadas
    const { data: reviewsData, error: reviewsError } = await supabase
      .from("product_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (reviewsError) {
      toast.error("Erro ao carregar avaliações");
      console.error(reviewsError);
      setLoading(false);
      return;
    }

    // Buscar nomes dos produtos e emails dos clientes
    const enrichedReviews = await Promise.all(
      (reviewsData || []).map(async (review) => {
        const { data: productData } = await supabase
          .from("products")
          .select("name")
          .eq("id", review.product_id)
          .single();

        const { data: orderData } = await supabase
          .from("orders")
          .select("customer_email")
          .eq("id", review.order_id)
          .single();

        return {
          ...review,
          product_name: productData?.name || "Produto removido",
          customer_email: orderData?.customer_email || "N/A"
        };
      })
    );

    setReviews(enrichedReviews);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from("product_reviews")
      .update({ is_approved: true })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao aprovar avaliação");
      return;
    }

    toast.success("✅ Avaliação aprovada e publicada!");
    loadReviews();
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from("product_reviews")
      .update({ is_approved: false })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao rejeitar avaliação");
      return;
    }

    toast.success("Avaliação rejeitada");
    loadReviews();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta avaliação?")) return;

    const { error } = await supabase
      .from("product_reviews")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir avaliação");
      return;
    }

    toast.success("Avaliação excluída");
    loadReviews();
  };

  const filteredReviews = reviews.filter(review => {
    if (filter === 'pending') return !review.is_approved;
    if (filter === 'approved') return review.is_approved;
    return true;
  });

  const pendingCount = reviews.filter(r => !r.is_approved).length;

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold mb-2">Avaliações de Produtos</h2>
          <p className="text-muted-foreground">Modere as avaliações dos clientes</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {pendingCount} pendente(s)
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Todas ({reviews.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          Pendentes ({pendingCount})
        </Button>
        <Button
          variant={filter === 'approved' ? 'default' : 'outline'}
          onClick={() => setFilter('approved')}
        >
          Aprovadas ({reviews.length - pendingCount})
        </Button>
      </div>

      <Card className="card-gaming">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Avaliações
          </CardTitle>
          <CardDescription>
            Avaliações aprovadas aparecem na página do produto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {filter === 'pending' 
                ? "Nenhuma avaliação pendente" 
                : "Nenhuma avaliação encontrada"}
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <p className="font-medium">{review.product_name}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">{review.customer_email}</p>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {renderStars(review.rating)}
                          {review.comment && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              "{review.comment}"
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {review.is_approved ? (
                          <Badge className="bg-success">Aprovada</Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(review.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedReview(review)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!review.is_approved && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(review.id)}
                              className="text-success border-success hover:bg-success/10"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {review.is_approved && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject(review.id)}
                              className="text-warning border-warning hover:bg-warning/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(review.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Avaliação</DialogTitle>
            <DialogDescription>
              Produto: {selectedReview?.product_name}
            </DialogDescription>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Avaliação:</span>
                {renderStars(selectedReview.rating)}
              </div>
              <div>
                <span className="font-medium">Cliente:</span>
                <p className="text-muted-foreground">{selectedReview.customer_email}</p>
              </div>
              <div>
                <span className="font-medium">Comentário:</span>
                <p className="text-muted-foreground mt-1 p-4 bg-muted rounded-lg">
                  {selectedReview.comment || "Sem comentário"}
                </p>
              </div>
              <div>
                <span className="font-medium">Data:</span>
                <p className="text-muted-foreground">
                  {new Date(selectedReview.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                {!selectedReview.is_approved ? (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleApprove(selectedReview.id);
                      setSelectedReview(null);
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      handleReject(selectedReview.id);
                      setSelectedReview(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDelete(selectedReview.id);
                    setSelectedReview(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}