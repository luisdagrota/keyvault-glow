import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trophy, Target, Star, Zap, Gift, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  reward_type: string;
  reward_value: string | null;
  reward_fee_reduction: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface ChallengeProgress {
  id: string;
  seller_id: string;
  challenge_id: string;
  current_value: number;
  is_completed: boolean;
  completed_at: string | null;
  reward_claimed: boolean;
  reward_claimed_at: string | null;
}

interface SellerChallengesProps {
  sellerId: string;
}

export const SellerChallenges = ({ sellerId }: SellerChallengesProps) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progress, setProgress] = useState<Record<string, ChallengeProgress>>({});
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    fetchChallenges();
  }, [sellerId]);

  const fetchChallenges = async () => {
    try {
      // Fetch active challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from("seller_challenges")
        .select("*")
        .eq("is_active", true)
        .order("target_value", { ascending: true });

      if (challengesError) throw challengesError;
      setChallenges(challengesData || []);

      // Fetch seller's progress
      const { data: progressData, error: progressError } = await supabase
        .from("seller_challenge_progress")
        .select("*")
        .eq("seller_id", sellerId);

      if (progressError) throw progressError;

      const progressMap: Record<string, ChallengeProgress> = {};
      (progressData || []).forEach(p => {
        progressMap[p.challenge_id] = p;
      });
      setProgress(progressMap);
    } catch (error) {
      console.error("Error fetching challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (challenge: Challenge) => {
    const progressRecord = progress[challenge.id];
    if (!progressRecord || !progressRecord.is_completed || progressRecord.reward_claimed) return;

    setClaimingId(challenge.id);
    try {
      // Update progress to mark reward as claimed
      const { error: progressError } = await supabase
        .from("seller_challenge_progress")
        .update({
          reward_claimed: true,
          reward_claimed_at: new Date().toISOString()
        })
        .eq("id", progressRecord.id);

      if (progressError) throw progressError;

      // Create the reward record
      const rewardData: any = {
        seller_id: sellerId,
        challenge_id: challenge.id,
        reward_type: challenge.reward_type,
        reward_value: challenge.reward_value
      };

      if (challenge.reward_type === "fee_reduction" && challenge.reward_fee_reduction > 0) {
        rewardData.fee_reduction_percentage = challenge.reward_fee_reduction;
        rewardData.fee_reduction_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
      }

      if (challenge.reward_type === "homepage_highlight") {
        rewardData.homepage_highlight_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
      }

      const { error: rewardError } = await supabase
        .from("seller_rewards")
        .insert(rewardData);

      if (rewardError) throw rewardError;

      toast.success("Recompensa resgatada com sucesso!");
      fetchChallenges();
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("Erro ao resgatar recompensa");
    } finally {
      setClaimingId(null);
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "badge": return <Star className="h-4 w-4" />;
      case "fee_reduction": return <Zap className="h-4 w-4" />;
      case "homepage_highlight": return <Trophy className="h-4 w-4" />;
      default: return <Gift className="h-4 w-4" />;
    }
  };

  const getRewardLabel = (challenge: Challenge) => {
    switch (challenge.reward_type) {
      case "badge": return "Badge exclusivo";
      case "fee_reduction": return `${challenge.reward_fee_reduction}% de redução na taxa`;
      case "homepage_highlight": return "Destaque na home";
      default: return challenge.reward_value || "Recompensa";
    }
  };

  const getChallengeTypeIcon = (type: string) => {
    switch (type) {
      case "sales": return <Target className="h-5 w-5" />;
      case "rating": return <Star className="h-5 w-5" />;
      default: return <Trophy className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const daysRemaining = challenges.length > 0 
    ? differenceInDays(new Date(challenges[0].end_date), new Date())
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Desafios Mensais
          </h2>
          <p className="text-muted-foreground">
            Complete desafios para ganhar recompensas exclusivas
          </p>
        </div>
        {daysRemaining > 0 && (
          <Badge variant="outline" className="flex items-center gap-1 text-sm">
            <Clock className="h-4 w-4" />
            {daysRemaining} dias restantes
          </Badge>
        )}
      </div>

      {challenges.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum desafio disponível no momento.</p>
            <p className="text-sm">Novos desafios serão adicionados em breve!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {challenges.map(challenge => {
            const progressRecord = progress[challenge.id];
            const currentValue = progressRecord?.current_value || 0;
            const percentage = Math.min((currentValue / challenge.target_value) * 100, 100);
            const isCompleted = progressRecord?.is_completed || false;
            const isClaimed = progressRecord?.reward_claimed || false;

            return (
              <Card 
                key={challenge.id} 
                className={`relative overflow-hidden transition-all ${
                  isCompleted 
                    ? isClaimed 
                      ? "border-muted bg-muted/20" 
                      : "border-green-500/50 bg-green-500/5 ring-2 ring-green-500/20" 
                    : "hover:border-primary/50"
                }`}
              >
                {isCompleted && !isClaimed && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-500 text-white animate-pulse">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Concluído!
                    </Badge>
                  </div>
                )}
                {isClaimed && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary">
                      <Gift className="h-3 w-3 mr-1" />
                      Resgatado
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      isCompleted ? "bg-green-500/20 text-green-500" : "bg-primary/20 text-primary"
                    }`}>
                      {getChallengeTypeIcon(challenge.challenge_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{challenge.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {challenge.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">
                        {challenge.challenge_type === "rating" 
                          ? `${(currentValue / 10).toFixed(1)} / ${(challenge.target_value / 10).toFixed(1)}`
                          : `${currentValue} / ${challenge.target_value}`
                        }
                      </span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${isCompleted ? "[&>div]:bg-green-500" : ""}`}
                    />
                  </div>

                  <div className={`flex items-center gap-2 p-2 rounded-lg ${
                    isCompleted ? "bg-green-500/10" : "bg-muted"
                  }`}>
                    <div className={isCompleted ? "text-green-500" : "text-primary"}>
                      {getRewardIcon(challenge.reward_type)}
                    </div>
                    <span className="text-sm font-medium">
                      {getRewardLabel(challenge)}
                    </span>
                  </div>

                  {isCompleted && !isClaimed && (
                    <Button 
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                      onClick={() => claimReward(challenge)}
                      disabled={claimingId === challenge.id}
                    >
                      {claimingId === challenge.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Gift className="h-4 w-4 mr-2" />
                      )}
                      Resgatar Recompensa
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Active Rewards Section */}
      <ActiveRewards sellerId={sellerId} />
    </div>
  );
};

// Component to show active rewards
const ActiveRewards = ({ sellerId }: { sellerId: string }) => {
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRewards();
  }, [sellerId]);

  const fetchRewards = async () => {
    try {
      const { data, error } = await supabase
        .from("seller_rewards")
        .select(`
          *,
          challenge:seller_challenges(title, reward_type, reward_value)
        `)
        .eq("seller_id", sellerId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error("Error fetching rewards:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || rewards.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Suas Recompensas Ativas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rewards.map(reward => (
            <div 
              key={reward.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/20 text-primary">
                  {reward.reward_type === "badge" && <Star className="h-4 w-4" />}
                  {reward.reward_type === "fee_reduction" && <Zap className="h-4 w-4" />}
                  {reward.reward_type === "homepage_highlight" && <Trophy className="h-4 w-4" />}
                </div>
                <div>
                  <p className="font-medium text-sm">{reward.challenge?.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {reward.reward_type === "fee_reduction" && reward.fee_reduction_expires_at && (
                      <>Expira em {format(new Date(reward.fee_reduction_expires_at), "dd/MM/yyyy", { locale: ptBR })}</>
                    )}
                    {reward.reward_type === "homepage_highlight" && reward.homepage_highlight_expires_at && (
                      <>Expira em {format(new Date(reward.homepage_highlight_expires_at), "dd/MM/yyyy", { locale: ptBR })}</>
                    )}
                    {reward.reward_type === "badge" && "Badge permanente"}
                  </p>
                </div>
              </div>
              {reward.reward_type === "fee_reduction" && (
                <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                  -{reward.fee_reduction_percentage}% taxa
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
