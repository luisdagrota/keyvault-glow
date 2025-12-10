import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Trash2, Pause, Play, Tag, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CouponWithSeller {
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
  seller_id: string;
  seller_profiles: {
    full_name: string;
  };
}

export function AdminSellerCoupons() {
  const [coupons, setCoupons] = useState<CouponWithSeller[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<CouponWithSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadCoupons();
  }, []);

  useEffect(() => {
    filterCoupons();
  }, [searchTerm, statusFilter, coupons]);

  const loadCoupons = async () => {
    try {
      // First get all coupons
      const { data: couponsData, error: couponsError } = await supabase
        .from("seller_coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (couponsError) throw couponsError;

      // Get unique seller IDs
      const sellerIds = [...new Set(couponsData?.map((c) => c.seller_id) || [])];

      // Fetch seller profiles
      const { data: sellersData } = await supabase
        .from("seller_profiles")
        .select("id, full_name")
        .in("id", sellerIds);

      // Map coupons with seller names
      const couponsWithSellers = (couponsData || []).map((coupon) => ({
        ...coupon,
        seller_profiles: {
          full_name: sellersData?.find((s) => s.id === coupon.seller_id)?.full_name || "Desconhecido",
        },
      })) as CouponWithSeller[];

      setCoupons(couponsWithSellers);
    } catch (error) {
      console.error("Error loading coupons:", error);
      toast.error("Erro ao carregar cupons");
    } finally {
      setLoading(false);
    }
  };

  const filterCoupons = () => {
    let filtered = coupons;

    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.seller_profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => {
        if (statusFilter === "active") return c.is_active && !isExpired(c.expires_at);
        if (statusFilter === "paused") return !c.is_active;
        if (statusFilter === "expired") return isExpired(c.expires_at);
        return true;
      });
    }

    setFilteredCoupons(filtered);
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

  const toggleActive = async (coupon: CouponWithSeller) => {
    try {
      const { error } = await supabase
        .from("seller_coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);

      if (error) throw error;
      toast.success(coupon.is_active ? "Cupom pausado" : "Cupom ativado");
      loadCoupons();
    } catch (error) {
      console.error("Error toggling coupon:", error);
      toast.error("Erro ao alterar status do cupom");
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isMaxUsesReached = (coupon: CouponWithSeller) => {
    if (!coupon.max_uses) return false;
    return coupon.times_used >= coupon.max_uses;
  };

  if (loading) {
    return <div className="p-6">Carregando cupons...</div>;
  }

  // Calculate statistics
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => c.is_active && !isExpired(c.expires_at)).length;
  const totalDiscounts = coupons.reduce((acc, c) => acc + c.total_discount_given, 0);
  const totalUses = coupons.reduce((acc, c) => acc + c.times_used, 0);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Tag className="w-6 h-6" />
          Cupons de Vendedores
        </h2>
        <p className="text-muted-foreground">
          Monitore e gerencie todos os cupons criados pelos vendedores
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Total de Cupons</p>
          <p className="text-2xl font-bold">{totalCoupons}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Cupons Ativos</p>
          <p className="text-2xl font-bold text-green-600">{activeCoupons}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Total em Descontos</p>
          <p className="text-2xl font-bold text-red-600">
            R$ {totalDiscounts.toFixed(2)}
          </p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Total de Usos</p>
          <p className="text-2xl font-bold">{totalUses}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por código ou vendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="paused">Pausados</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Coupons Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
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
            {filteredCoupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchTerm || statusFilter !== "all"
                    ? "Nenhum cupom encontrado"
                    : "Nenhum cupom criado ainda"}
                </TableCell>
              </TableRow>
            ) : (
              filteredCoupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium">
                    {coupon.seller_profiles.full_name}
                  </TableCell>
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