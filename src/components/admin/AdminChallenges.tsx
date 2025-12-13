import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trophy, Edit, Trash2, Target, Star, Zap, Gift } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
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
  created_at: string;
}

export const AdminChallenges = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    challenge_type: "sales",
    target_value: 10,
    reward_type: "badge",
    reward_value: "",
    reward_fee_reduction: 0,
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    is_active: true
  });

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from("seller_challenges")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      toast.error("Erro ao carregar desafios");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      challenge_type: "sales",
      target_value: 10,
      reward_type: "badge",
      reward_value: "",
      reward_fee_reduction: 0,
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      is_active: true
    });
    setEditingChallenge(null);
  };

  const openEditDialog = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      title: challenge.title,
      description: challenge.description,
      challenge_type: challenge.challenge_type,
      target_value: challenge.target_value,
      reward_type: challenge.reward_type,
      reward_value: challenge.reward_value || "",
      reward_fee_reduction: challenge.reward_fee_reduction,
      start_date: challenge.start_date.split("T")[0],
      end_date: challenge.end_date.split("T")[0],
      is_active: challenge.is_active
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const challengeData = {
        title: formData.title,
        description: formData.description,
        challenge_type: formData.challenge_type,
        target_value: formData.target_value,
        reward_type: formData.reward_type,
        reward_value: formData.reward_value || null,
        reward_fee_reduction: formData.reward_fee_reduction,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date + "T23:59:59").toISOString(),
        is_active: formData.is_active
      };

      if (editingChallenge) {
        const { error } = await supabase
          .from("seller_challenges")
          .update(challengeData)
          .eq("id", editingChallenge.id);

        if (error) throw error;
        toast.success("Desafio atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("seller_challenges")
          .insert(challengeData);

        if (error) throw error;
        toast.success("Desafio criado com sucesso!");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchChallenges();
    } catch (error) {
      console.error("Error saving challenge:", error);
      toast.error("Erro ao salvar desafio");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteChallenge = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este desafio?")) return;

    try {
      const { error } = await supabase
        .from("seller_challenges")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Desafio excluído");
      fetchChallenges();
    } catch (error) {
      console.error("Error deleting challenge:", error);
      toast.error("Erro ao excluir desafio");
    }
  };

  const toggleActive = async (challenge: Challenge) => {
    try {
      const { error } = await supabase
        .from("seller_challenges")
        .update({ is_active: !challenge.is_active })
        .eq("id", challenge.id);

      if (error) throw error;
      toast.success(challenge.is_active ? "Desafio desativado" : "Desafio ativado");
      fetchChallenges();
    } catch (error) {
      console.error("Error toggling challenge:", error);
      toast.error("Erro ao atualizar desafio");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "sales": return <Target className="h-4 w-4" />;
      case "rating": return <Star className="h-4 w-4" />;
      default: return <Trophy className="h-4 w-4" />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Gerenciar Desafios
          </h2>
          <p className="text-muted-foreground">
            Crie e gerencie desafios mensais para vendedores
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Desafio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingChallenge ? "Editar Desafio" : "Criar Novo Desafio"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Vendedor Estrela"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Realize 50 vendas este mês"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Desafio</Label>
                  <Select
                    value={formData.challenge_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, challenge_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Vendas</SelectItem>
                      <SelectItem value="rating">Avaliação</SelectItem>
                      <SelectItem value="reviews">Reviews</SelectItem>
                      <SelectItem value="engagement">Engajamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_value">
                    Meta {formData.challenge_type === "rating" ? "(x10)" : ""}
                  </Label>
                  <Input
                    id="target_value"
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_value: parseInt(e.target.value) }))}
                    min={1}
                    required
                  />
                  {formData.challenge_type === "rating" && (
                    <p className="text-xs text-muted-foreground">
                      45 = 4.5 estrelas
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Recompensa</Label>
                  <Select
                    value={formData.reward_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, reward_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="badge">Badge Exclusivo</SelectItem>
                      <SelectItem value="fee_reduction">Redução de Taxa</SelectItem>
                      <SelectItem value="homepage_highlight">Destaque na Home</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.reward_type === "fee_reduction" && (
                  <div className="space-y-2">
                    <Label htmlFor="fee_reduction">Redução (%)</Label>
                    <Input
                      id="fee_reduction"
                      type="number"
                      value={formData.reward_fee_reduction}
                      onChange={(e) => setFormData(prev => ({ ...prev, reward_fee_reduction: parseFloat(e.target.value) }))}
                      min={0}
                      max={9.99}
                      step={0.5}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reward_value">Descrição da Recompensa</Label>
                <Input
                  id="reward_value"
                  value={formData.reward_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, reward_value: e.target.value }))}
                  placeholder="Ex: Badge de Vendedor Estrela"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data Início</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">Data Fim</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Desafio ativo</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingChallenge ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Desafio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Meta</TableHead>
                <TableHead>Recompensa</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum desafio cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                challenges.map(challenge => (
                  <TableRow key={challenge.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{challenge.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {challenge.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {getTypeIcon(challenge.challenge_type)}
                        {challenge.challenge_type === "sales" && "Vendas"}
                        {challenge.challenge_type === "rating" && "Avaliação"}
                        {challenge.challenge_type === "reviews" && "Reviews"}
                        {challenge.challenge_type === "engagement" && "Engajamento"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {challenge.challenge_type === "rating" 
                        ? `${(challenge.target_value / 10).toFixed(1)} ⭐`
                        : challenge.target_value
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getRewardIcon(challenge.reward_type)}
                        <span className="text-sm">
                          {challenge.reward_type === "fee_reduction" && `${challenge.reward_fee_reduction}% off`}
                          {challenge.reward_type === "badge" && "Badge"}
                          {challenge.reward_type === "homepage_highlight" && "Destaque"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p>{format(new Date(challenge.start_date), "dd/MM", { locale: ptBR })}</p>
                        <p className="text-muted-foreground">
                          até {format(new Date(challenge.end_date), "dd/MM", { locale: ptBR })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={challenge.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleActive(challenge)}
                      >
                        {challenge.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => openEditDialog(challenge)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteChallenge(challenge.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
