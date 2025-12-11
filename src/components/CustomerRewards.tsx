import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Gift, Star, Trophy, Coins, History, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerPoints {
  id: string;
  user_id: string;
  total_points: number;
  lifetime_points: number;
  level: string;
}

interface PointTransaction {
  id: string;
  points: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

const LEVEL_CONFIG: Record<string, { label: string; color: string; minPoints: number; nextLevel: string | null; nextPoints: number }> = {
  bronze: { label: "Bronze", color: "from-amber-600 to-amber-800", minPoints: 0, nextLevel: "prata", nextPoints: 500 },
  prata: { label: "Prata", color: "from-gray-300 to-gray-500", minPoints: 500, nextLevel: "ouro", nextPoints: 2000 },
  ouro: { label: "Ouro", color: "from-yellow-400 to-yellow-600", minPoints: 2000, nextLevel: "platina", nextPoints: 5000 },
  platina: { label: "Platina", color: "from-cyan-300 to-cyan-500", minPoints: 5000, nextLevel: "diamante", nextPoints: 10000 },
  diamante: { label: "Diamante", color: "from-purple-400 to-pink-500", minPoints: 10000, nextLevel: null, nextPoints: 10000 },
};

export function CustomerRewards({ userId }: { userId: string }) {
  const [points, setPoints] = useState<CustomerPoints | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [pointsRes, transactionsRes] = await Promise.all([
        supabase
          .from("customer_points")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("point_transactions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10)
      ]);

      if (pointsRes.data) {
        setPoints(pointsRes.data as CustomerPoints);
      }
      if (transactionsRes.data) {
        setTransactions(transactionsRes.data as PointTransaction[]);
      }
      setLoading(false);
    };

    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("customer-points-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_points", filter: `user_id=eq.${userId}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "point_transactions", filter: `user_id=eq.${userId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const currentLevel = points?.level || "bronze";
  const levelConfig = LEVEL_CONFIG[currentLevel];
  const lifetimePoints = points?.lifetime_points || 0;
  const totalPoints = points?.total_points || 0;

  const progressToNext = levelConfig.nextLevel
    ? Math.min(100, ((lifetimePoints - levelConfig.minPoints) / (levelConfig.nextPoints - levelConfig.minPoints)) * 100)
    : 100;

  const pointsToNextLevel = levelConfig.nextLevel
    ? Math.max(0, levelConfig.nextPoints - lifetimePoints)
    : 0;

  return (
    <div className="space-y-6">
      {/* Points Overview Card */}
      <Card className="overflow-hidden">
        <div className={cn("h-2 bg-gradient-to-r", levelConfig.color)} />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-full bg-gradient-to-br animate-pulse",
                levelConfig.color
              )}>
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Nível {levelConfig.label}
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                </CardTitle>
                <CardDescription>Seu programa de recompensas</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-2xl font-bold">
                <Coins className="h-6 w-6 text-yellow-500" />
                {totalPoints.toLocaleString("pt-BR")}
              </div>
              <p className="text-sm text-muted-foreground">pontos disponíveis</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {levelConfig.nextLevel && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso para {LEVEL_CONFIG[levelConfig.nextLevel].label}</span>
                <span className="font-medium">{pointsToNextLevel.toLocaleString("pt-BR")} pontos restantes</span>
              </div>
              <Progress value={progressToNext} className="h-3" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">{lifetimePoints.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground">Pontos totais ganhos</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <Gift className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">R$ {(totalPoints / 100).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Valor em descontos</p>
            </div>
          </div>

          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <p className="text-sm font-medium mb-2">💡 Como ganhar pontos:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Ganhe 1 ponto para cada R$ 1 gasto</li>
              <li>• 100 pontos = R$ 1,00 de desconto</li>
              <li>• Suba de nível para benefícios exclusivos</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Level Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Níveis de Recompensa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(LEVEL_CONFIG).map(([key, config]) => {
              const isCurrentLevel = key === currentLevel;
              const isPastLevel = Object.keys(LEVEL_CONFIG).indexOf(key) < Object.keys(LEVEL_CONFIG).indexOf(currentLevel);
              
              return (
                <div
                  key={key}
                  className={cn(
                    "relative p-3 rounded-lg text-center transition-all",
                    isCurrentLevel && "ring-2 ring-primary bg-primary/10",
                    isPastLevel && "bg-muted/50",
                    !isCurrentLevel && !isPastLevel && "opacity-50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 mx-auto rounded-full bg-gradient-to-br flex items-center justify-center mb-2",
                    config.color
                  )}>
                    <Star className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-xs font-medium truncate">{config.label}</p>
                  <p className="text-[10px] text-muted-foreground">{config.minPoints}+ pts</p>
                  {isCurrentLevel && (
                    <Badge variant="default" className="absolute -top-2 -right-2 text-[10px] px-1.5">
                      Atual
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Pontos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Você ainda não tem pontos. Faça sua primeira compra!
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full",
                      tx.transaction_type === "earned" ? "bg-green-500/10 text-green-500" :
                      tx.transaction_type === "redeemed" ? "bg-blue-500/10 text-blue-500" :
                      "bg-red-500/10 text-red-500"
                    )}>
                      {tx.transaction_type === "earned" ? (
                        <Coins className="h-4 w-4" />
                      ) : (
                        <Gift className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium line-clamp-1">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={tx.transaction_type === "earned" ? "default" : "secondary"}>
                    {tx.transaction_type === "earned" ? "+" : "-"}{tx.points} pts
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}