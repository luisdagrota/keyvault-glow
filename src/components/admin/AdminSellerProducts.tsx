import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Search, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface SellerProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  stock: number;
  is_active: boolean;
  created_at: string;
  seller_id: string;
  seller_profiles: {
    full_name: string;
    user_id: string;
  };
}

export const AdminSellerProducts = () => {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");
  const [selectedProduct, setSelectedProduct] = useState<SellerProduct | null>(null);
  const [rejectingProduct, setRejectingProduct] = useState<SellerProduct | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel('admin-seller-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("seller_products")
      .select(`
        *,
        seller_profiles!inner(full_name, user_id)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching seller products:", error);
      toast({ title: "Erro ao carregar produtos", variant: "destructive" });
      return;
    }

    setProducts(data || []);
    setLoading(false);
  };

  const approveProduct = async (product: SellerProduct) => {
    const { error: updateError } = await supabase
      .from("seller_products")
      .update({ is_active: true })
      .eq("id", product.id);

    if (updateError) {
      toast({ title: "Erro ao aprovar", description: updateError.message, variant: "destructive" });
      return;
    }

    // Create notification for seller
    const { error: notifError } = await supabase
      .from("seller_notifications")
      .insert({
        seller_id: product.seller_id,
        type: "product_approved",
        title: "Produto Aprovado! ✅",
        message: `Seu produto "${product.name}" foi aprovado e já está disponível para venda.`,
        product_id: product.id,
      });

    if (notifError) {
      console.error("Error creating notification:", notifError);
    }

    toast({ title: "Produto aprovado com sucesso!" });
    fetchProducts();
  };

  const openRejectDialog = (product: SellerProduct) => {
    setRejectingProduct(product);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectingProduct) return;
    
    if (!rejectReason.trim()) {
      toast({ title: "Informe o motivo da rejeição", variant: "destructive" });
      return;
    }

    setIsRejecting(true);

    const { error: updateError } = await supabase
      .from("seller_products")
      .delete()
      .eq("id", rejectingProduct.id);

    if (updateError) {
      toast({ title: "Erro ao rejeitar", description: updateError.message, variant: "destructive" });
      setIsRejecting(false);
      return;
    }

    // Create notification for seller with the reason
    const { error: notifError } = await supabase
      .from("seller_notifications")
      .insert({
        seller_id: rejectingProduct.seller_id,
        type: "product_rejected",
        title: "Produto Rejeitado ❌",
        message: `Seu produto "${rejectingProduct.name}" foi rejeitado.\n\nMotivo: ${rejectReason.trim()}`,
        product_id: null,
      });

    if (notifError) {
      console.error("Error creating notification:", notifError);
    }

    toast({ title: "Produto rejeitado" });
    setRejectingProduct(null);
    setRejectReason("");
    setIsRejecting(false);
    fetchProducts();
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.seller_profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === "pending") return matchesSearch && !product.is_active;
    if (filter === "approved") return matchesSearch && product.is_active;
    return matchesSearch;
  });

  const pendingCount = products.filter(p => !p.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Produtos de Vendedores</h2>
        <p className="text-muted-foreground">
          Aprove ou rejeite produtos publicados por vendedores
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por produto ou vendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
            className="relative"
          >
            Pendentes
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={filter === "approved" ? "default" : "outline"}
            onClick={() => setFilter("approved")}
          >
            Aprovados
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            Todos
          </Button>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {filter === "pending"
                ? "Nenhum produto pendente de aprovação"
                : "Nenhum produto encontrado"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-12 w-12 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.category || "Sem categoria"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.seller_profiles.full_name}</TableCell>
                    <TableCell>R$ {product.price.toFixed(2)}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? "default" : "outline"}>
                        {product.is_active ? "Aprovado" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!product.is_active && (
                          <>
                            <Button
                              variant="default"
                              size="icon"
                              onClick={() => approveProduct(product)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => openRejectDialog(product)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Produto</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              {selectedProduct.image_url && (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedProduct.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendedor</p>
                  <p className="font-medium">{selectedProduct.seller_profiles.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Preço</p>
                  <p className="font-medium">R$ {selectedProduct.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estoque</p>
                  <p className="font-medium">{selectedProduct.stock}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p className="font-medium">{selectedProduct.category || "Sem categoria"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedProduct.is_active ? "default" : "outline"}>
                    {selectedProduct.is_active ? "Aprovado" : "Pendente"}
                  </Badge>
                </div>
              </div>
              {selectedProduct.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Descrição</p>
                  <p>{selectedProduct.description}</p>
                </div>
              )}
              {!selectedProduct.is_active && (
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      approveProduct(selectedProduct);
                      setSelectedProduct(null);
                    }}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Aprovar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      openRejectDialog(selectedProduct);
                      setSelectedProduct(null);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Rejeitar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Reason Modal */}
      <Dialog open={!!rejectingProduct} onOpenChange={() => setRejectingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Informe o motivo da rejeição do produto <strong>"{rejectingProduct?.name}"</strong>. 
              O vendedor receberá esta mensagem para saber o que precisa corrigir.
            </p>
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Motivo da Rejeição</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: A imagem do produto está em baixa qualidade. Por favor, envie uma imagem mais nítida."
                className="min-h-[100px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {rejectReason.length}/500
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingProduct(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmReject}
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};