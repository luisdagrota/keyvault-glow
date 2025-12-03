import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, Star, TrendingUp } from "lucide-react";
import type { SellerProfile } from "@/pages/SellerDashboard";

interface SellerOverviewProps {
  seller: SellerProfile;
}

export const SellerOverview = ({ seller }: SellerOverviewProps) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold">Olá, {seller.full_name}!</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Bem-vindo ao seu painel de vendedor</p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Saldo a Liberar</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Saldo Liberado</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total de Vendas</CardTitle>
            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{seller.total_sales}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Produtos vendidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Avaliação Média</CardTitle>
            <Star className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
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

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            Dicas para Vender Mais
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
            <li>• Adicione descrições detalhadas aos seus produtos</li>
            <li>• Use imagens de alta qualidade</li>
            <li>• Mantenha preços competitivos</li>
            <li>• Responda rapidamente aos clientes</li>
            <li>• Entregue os produtos rapidamente para receber boas avaliações</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
