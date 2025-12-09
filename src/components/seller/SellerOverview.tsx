import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Package, Star, TrendingUp, Edit2, Image, Save, X, Eye, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SellerBadges, calculateSellerBadges } from "./SellerBadges";
import { SellerLevelBadge, calculateSellerLevel, getNextLevel, SELLER_LEVELS } from "./SellerLevel";
import type { SellerProfile } from "@/pages/SellerDashboard";
import { useNavigate } from "react-router-dom";

interface SellerOverviewProps {
  seller: SellerProfile;
  onProfileUpdate?: () => void;
}

export const SellerOverview = ({ seller, onProfileUpdate }: SellerOverviewProps) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [bannerUrl, setBannerUrl] = useState(seller.banner_url || "");
  const [bio, setBio] = useState(seller.bio || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("seller_profiles")
        .update({
          banner_url: bannerUrl.trim() || null,
          bio: bio.trim() || null,
        })
        .eq("id", seller.id);

      if (error) throw error;

      toast.success("Perfil atualizado!");
      setIsEditing(false);
      onProfileUpdate?.();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const badges = calculateSellerBadges(seller);
  const sellerLevel = calculateSellerLevel(seller.total_sales, seller.average_rating, false);
  const nextLevel = getNextLevel(sellerLevel);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Section with Profile Edit */}
      <Card className="overflow-hidden">
        {/* Banner Preview */}
        <div className="relative h-32 sm:h-40 overflow-hidden">
          {bannerUrl || seller.banner_url ? (
            <img
              src={bannerUrl || seller.banner_url || ""}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>

        <CardContent className="relative -mt-8 sm:-mt-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-3xl font-bold">Olá, {seller.full_name}!</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {seller.bio || "Bem-vindo ao seu painel de vendedor"}
              </p>
              
              {badges.length > 0 && (
                <div className="mt-3">
                  <SellerBadges badges={badges} size="sm" />
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/seller/${seller.id}`)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Ver Perfil Público
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Editar
              </Button>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="mt-6 p-4 rounded-lg border bg-muted/30 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  URL do Banner
                </label>
                <Input
                  placeholder="https://exemplo.com/meu-banner.jpg"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recomendado: 1200x300 pixels
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Bio / Descrição</label>
                <Textarea
                  placeholder="Conte um pouco sobre você e seus produtos..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={300}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {bio.length}/300 caracteres
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setBannerUrl(seller.banner_url || "");
                    setBio(seller.bio || "");
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seller Level Card */}
      <Card className="overflow-hidden border-2" style={{ borderColor: sellerLevel.colors.glow }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Gem className="h-5 w-5 text-primary" />
            Seu Nível de Vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <SellerLevelBadge
              level={sellerLevel}
              size="xl"
              showLabel
              showProgress
              currentSales={seller.total_sales}
              currentRating={seller.average_rating}
              animated
            />
            
            <div className="flex-1 space-y-2">
              <p className="text-sm text-muted-foreground">
                {sellerLevel.id === "diamond" 
                  ? "🎉 Parabéns! Você alcançou o nível máximo!"
                  : nextLevel 
                    ? `Continue vendendo para alcançar o nível ${nextLevel.name}!`
                    : "Continue vendendo para subir de nível!"
                }
              </p>
              
              {/* All levels preview */}
              <div className="flex flex-wrap gap-2 pt-2">
                {SELLER_LEVELS.map((lvl) => {
                  const isActive = lvl.id === sellerLevel.id;
                  const Icon = lvl.icon;
                  return (
                    <div
                      key={lvl.id}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${
                        isActive 
                          ? `bg-gradient-to-r ${lvl.colors.secondary} text-background font-semibold` 
                          : "bg-muted text-muted-foreground"
                      }`}
                      style={isActive ? { boxShadow: `0 0 12px ${lvl.colors.glow}` } : undefined}
                    >
                      <Icon className="h-3 w-3" />
                      {lvl.name}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Saldo a Liberar</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-yellow-500">
              R$ {seller.pending_balance.toFixed(2)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Liberado após 1 dia
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Saldo Liberado</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-green-500">
              R$ {seller.available_balance.toFixed(2)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Disponível para saque
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total de Vendas</CardTitle>
            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{seller.total_sales}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Produtos vendidos
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Avaliação Média</CardTitle>
            <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold flex items-center gap-1">
              {seller.average_rating.toFixed(1)}
              <Star className="h-4 w-4 sm:h-5 sm:w-5 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Baseado nas avaliações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tips Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Dicas para Vender Mais
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Adicione um banner e bio atraentes ao seu perfil
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Use imagens de alta qualidade nos produtos
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Mantenha preços competitivos
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Responda rapidamente aos clientes
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Entregue os produtos rapidamente para receber boas avaliações
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
