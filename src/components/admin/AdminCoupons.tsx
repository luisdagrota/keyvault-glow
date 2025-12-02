import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Ticket, Copy, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  discount_percentage: number;
  valid_until: string | null;
  is_active: boolean;
  usage_limit: number | null;
  times_used: number;
  created_at: string;
}

export function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    code: "",
    discount_percentage: "",
    valid_until: "",
    is_active: true,
    usage_limit: ""
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar cupons");
      console.error(error);
    } else {
      setCoupons(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const couponData = {
      code: form.code.toUpperCase().trim(),
      discount_percentage: parseInt(form.discount_percentage),
      valid_until: form.valid_until || null,
      is_active: form.is_active,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null
    };

    if (!couponData.code || couponData.discount_percentage <= 0 || couponData.discount_percentage > 100) {
      toast.error("Dados inválidos", { description: "Verifique o código e o percentual de desconto" });
      return;
    }

    if (editingCoupon) {
      const { error } = await supabase
        .from("coupons")
        .update(couponData)
        .eq("id", editingCoupon.id);

      if (error) {
        toast.error("Erro ao atualizar cupom", { description: error.message });
        return;
      }
      toast.success("✅ Cupom atualizado com sucesso!");
    } else {
      const { error } = await supabase
        .from("coupons")
        .insert([couponData]);

      if (error) {
        if (error.code === "23505") {
          toast.error("Cupom já existe", { description: "Use um código diferente" });
        } else {
          toast.error("Erro ao criar cupom", { description: error.message });
        }
        return;
      }
      toast.success("✅ Cupom criado com sucesso!");
    }

    setIsDialogOpen(false);
    setEditingCoupon(null);
    resetForm();
    loadCoupons();
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      discount_percentage: coupon.discount_percentage.toString(),
      valid_until: coupon.valid_until ? coupon.valid_until.split("T")[0] : "",
      is_active: coupon.is_active,
      usage_limit: coupon.usage_limit?.toString() || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cupom?")) return;

    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir cupom", { description: error.message });
      return;
    }

    toast.success("✅ Cupom excluído com sucesso!");
    loadCoupons();
  };

  const toggleActive = async (coupon: Coupon) => {
    const { error } = await supabase
      .from("coupons")
      .update({ is_active: !coupon.is_active })
      .eq("id", coupon.id);

    if (error) {
      toast.error("Erro ao atualizar cupom");
      return;
    }

    toast.success(coupon.is_active ? "Cupom desativado" : "Cupom ativado");
    loadCoupons();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Código copiado!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const resetForm = () => {
    setForm({
      code: "",
      discount_percentage: "",
      valid_until: "",
      is_active: true,
      usage_limit: ""
    });
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold mb-2">Cupons de Desconto</h2>
          <p className="text-muted-foreground">Crie e gerencie cupons promocionais</p>
        </div>
        <Button onClick={() => {
          setEditingCoupon(null);
          resetForm();
          setIsDialogOpen(true);
        }} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Cupom
        </Button>
      </div>

      <Card className="card-gaming">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Cupons Cadastrados
          </CardTitle>
          <CardDescription>Total: {coupons.length} cupom(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum cupom cadastrado ainda
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Uso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                            {coupon.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCode(coupon.code)}
                          >
                            {copiedCode === coupon.code ? (
                              <CheckCircle className="h-4 w-4 text-success" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary text-primary-foreground">
                          {coupon.discount_percentage}% OFF
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {coupon.valid_until ? (
                          <span className={isExpired(coupon.valid_until) ? "text-destructive" : ""}>
                            {new Date(coupon.valid_until).toLocaleDateString("pt-BR")}
                            {isExpired(coupon.valid_until) && " (expirado)"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Sem limite</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {coupon.usage_limit ? (
                          <span className={coupon.times_used >= coupon.usage_limit ? "text-destructive" : ""}>
                            {coupon.times_used}/{coupon.usage_limit}
                          </span>
                        ) : (
                          <span>{coupon.times_used} usos</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={coupon.is_active}
                            onCheckedChange={() => toggleActive(coupon)}
                          />
                          <Badge variant={coupon.is_active ? "default" : "secondary"}>
                            {coupon.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(coupon)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(coupon.id)}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Editar Cupom" : "Criar Novo Cupom"}</DialogTitle>
            <DialogDescription>
              Configure os detalhes do cupom de desconto
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código do Cupom *</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="Ex: PROMO10"
                className="uppercase"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Percentual de Desconto (%) *</Label>
              <Input
                id="discount"
                type="number"
                min="1"
                max="100"
                value={form.discount_percentage}
                onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })}
                placeholder="10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">Data de Validade</Label>
              <Input
                id="valid_until"
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Deixe vazio para cupom sem data de expiração</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usage_limit">Limite de Uso</Label>
              <Input
                id="usage_limit"
                type="number"
                min="1"
                value={form.usage_limit}
                onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                placeholder="Ilimitado"
              />
              <p className="text-xs text-muted-foreground">Deixe vazio para uso ilimitado</p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Cupom Ativo</Label>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingCoupon ? "Atualizar" : "Criar"} Cupom
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}