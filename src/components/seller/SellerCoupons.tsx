import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Pause, Play, Tag } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
  max_uses: number | null;
  times_used: number;
  total_discount_given: number;
  is_active: boolean;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
}

interface SellerCouponsProps {
  sellerId: string;
}

export function SellerCoupons({ sellerId }: SellerCouponsProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  
  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    expires_at: "",
    max_uses: "",
  });

  useEffect(() => {
    loadCoupons();
    loadProducts();
  }, [sellerId]);

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from("seller_coupons")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error("Error loading coupons:", error);
      toast.error("Erro ao carregar cupons");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("seller_products")
        .select("id, name")
        .eq("seller_id", sellerId)
        .eq("is_active", true);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const couponData = {
        seller_id: sellerId,
        code: formData.code.toUpperCase().trim(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        expires_at: formData.expires_at || null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      };

      let couponId: string;

      if (editingCoupon) {
        const { error } = await supabase
          .from("seller_coupons")
          .update(couponData)
          .eq("id", editingCoupon.id);

        if (error) throw error;
        couponId = editingCoupon.id;
        toast.success("Cupom atualizado com sucesso!");
      } else {
        const { data, error } = await supabase
          .from("seller_coupons")
          .insert(couponData)
          .select()
          .single();

        if (error) throw error;
        couponId = data.id;
        toast.success("Cupom criado com sucesso!");
      }

      // Update product associations
      if (selectedProducts.length > 0) {
        // Delete existing associations
        await supabase
          .from("seller_coupon_products")
          .delete()
          .eq("coupon_id", couponId);

        // Insert new associations
        const associations = selectedProducts.map((productId) => ({
          coupon_id: couponId,
          product_id: productId,
        }));

        await supabase.from("seller_coupon_products").insert(associations);
      }

      loadCoupons();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving coupon:", error);
      toast.error(error.message || "Erro ao salvar cupom");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type as "percentage" | "fixed",
      discount_value: coupon.discount_value.toString(),
      expires_at: coupon.expires_at
        ? new Date(coupon.expires_at).toISOString().split("T")[0]
        : "",
      max_uses: coupon.max_uses?.toString() || "",
    });

    // Load associated products
    const { data } = await supabase
      .from("seller_coupon_products")
      .select("product_id")
      .eq("coupon_id", coupon.id);

    setSelectedProducts(data?.map((p) => p.product_id) || []);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este cupom?")) return;

    try {
      const { error } = await supabase
        .from("seller_coupons")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Cupom excluído com sucesso!");
      loadCoupons();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Erro ao excluir cupom");
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from("seller_coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);

      if (error) throw error;
      toast.success(
        coupon.is_active ? "Cupom pausado" : "Cupom ativado"
      );
      loadCoupons();
    } catch (error) {
      console.error("Error toggling coupon:", error);
      toast.error("Erro ao alterar status do cupom");
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      discount_type: "percentage",
      discount_value: "",
      expires_at: "",
      max_uses: "",
    });
    setSelectedProducts([]);
    setEditingCoupon(null);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isMaxUsesReached = (coupon: Coupon) => {
    if (!coupon.max_uses) return false;
    return coupon.times_used >= coupon.max_uses;
  };

  if (loading) {
    return <div className="p-6">Carregando cupons...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="w-6 h-6" />
            Gerenciar Cupons
          </h2>
          <p className="text-muted-foreground">
            Crie e gerencie cupons de desconto para seus produtos
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Cupom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCoupon ? "Editar Cupom" : "Criar Novo Cupom"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código do Cupom *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="Ex: DESCONTO10"
                    required
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_type">Tipo de Desconto *</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value: "percentage" | "fixed") =>
                      setFormData({ ...formData, discount_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_value">
                    Valor do Desconto * {formData.discount_type === "percentage" ? "(%)" : "(R$)"}
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    step="0.01"
                    min="0"
                    max={formData.discount_type === "percentage" ? "100" : undefined}
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData({ ...formData, discount_value: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_uses">Limite de Usos</Label>
                  <Input
                    id="max_uses"
                    type="number"
                    min="1"
                    value={formData.max_uses}
                    onChange={(e) =>
                      setFormData({ ...formData, max_uses: e.target.value })
                    }
                    placeholder="Ilimitado"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="expires_at">Data de Expiração</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) =>
                      setFormData({ ...formData, expires_at: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Produtos Aplicáveis</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {products.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum produto ativo encontrado
                      </p>
                    ) : (
                      products.map((product) => (
                        <div key={product.id} className="flex items-center gap-2">
                          <Switch
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProducts([...selectedProducts, product.id]);
                              } else {
                                setSelectedProducts(
                                  selectedProducts.filter((id) => id !== product.id)
                                );
                              }
                            }}
                          />
                          <span className="text-sm">{product.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para aplicar a todos os produtos
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : editingCoupon ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Total de Cupons</p>
          <p className="text-2xl font-bold">{coupons.length}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Cupons Ativos</p>
          <p className="text-2xl font-bold text-green-600">
            {coupons.filter((c) => c.is_active && !isExpired(c.expires_at)).length}
          </p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Total em Descontos</p>
          <p className="text-2xl font-bold text-red-600">
            R$ {coupons.reduce((acc, c) => acc + c.total_discount_given, 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Total Descontado</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum cupom criado ainda
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                  <TableCell>
                    {coupon.discount_type === "percentage"
                      ? `${coupon.discount_value}%`
                      : `R$ ${coupon.discount_value.toFixed(2)}`}
                  </TableCell>
                  <TableCell>
                    {coupon.times_used}
                    {coupon.max_uses && ` / ${coupon.max_uses}`}
                  </TableCell>
                  <TableCell className="text-red-600">
                    R$ {coupon.total_discount_given.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {coupon.expires_at ? (
                      <span
                        className={isExpired(coupon.expires_at) ? "text-red-600" : ""}
                      >
                        {new Date(coupon.expires_at).toLocaleDateString()}
                      </span>
                    ) : (
                      "Sem expiração"
                    )}
                  </TableCell>
                  <TableCell>
                    {!coupon.is_active ? (
                      <Badge variant="secondary">Pausado</Badge>
                    ) : isExpired(coupon.expires_at) ? (
                      <Badge variant="destructive">Expirado</Badge>
                    ) : isMaxUsesReached(coupon) ? (
                      <Badge variant="secondary">Esgotado</Badge>
                    ) : (
                      <Badge className="bg-green-600">Ativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleActive(coupon)}
                      >
                        {coupon.is_active ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(coupon)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(coupon.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}