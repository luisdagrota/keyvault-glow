import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Store, DollarSign, Shield, TrendingUp } from "lucide-react";

const BecomeSeller = () => {
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [existingSeller, setExistingSeller] = useState(false);
  
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUserId(session.user.id);
      
      // Check if already a seller
      const { data: sellerProfile } = await supabase
        .from("seller_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      
      if (sellerProfile) {
        setExistingSeller(true);
        if (sellerProfile.is_approved) {
          navigate("/seller");
        }
      }
      
      // Pre-fill name from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();
      
      if (profile?.full_name) {
        setFullName(profile.full_name);
      }
      
      setCheckingAuth(false);
    };
    
    checkAuth();
  }, [navigate]);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})/, "$1-$2");
    }
    return cpf;
  };

  const validateCPF = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, "");
    if (numbers.length !== 11) return false;
    if (/^(\d)\1+$/.test(numbers)) return false;
    return true;
  };

  const validateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 18;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast({ title: "Erro", description: "Você precisa estar logado", variant: "destructive" });
      return;
    }
    
    if (!validateCPF(cpf)) {
      toast({ title: "CPF inválido", description: "Por favor, insira um CPF válido", variant: "destructive" });
      return;
    }
    
    if (!validateAge(birthDate)) {
      toast({ title: "Idade mínima", description: "Você precisa ter pelo menos 18 anos", variant: "destructive" });
      return;
    }
    
    if (!agreedToTerms) {
      toast({ title: "Termos obrigatórios", description: "Você precisa aceitar a taxa de 9,99%", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    
    const { error } = await supabase
      .from("seller_profiles")
      .insert({
        user_id: userId,
        full_name: fullName,
        birth_date: birthDate,
        cpf: cpf.replace(/\D/g, ""),
        pix_key: pixKey,
        is_approved: false
      });
    
    if (error) {
      console.error("Error creating seller profile:", error);
      toast({
        title: "Erro ao cadastrar",
        description: error.message.includes("duplicate") ? "CPF já cadastrado" : error.message,
        variant: "destructive"
      });
      setLoading(false);
      return;
    }
    
    toast({
      title: "Cadastro enviado!",
      description: "Sua solicitação será analisada pelo administrador",
    });
    
    setExistingSeller(true);
    setLoading(false);
  };

  if (checkingAuth) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <Footer />
      </>
    );
  }

  if (existingSeller) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background py-12 px-4">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <Store className="h-12 w-12 mx-auto text-primary mb-4" />
                <CardTitle>Solicitação Enviada</CardTitle>
                <CardDescription>
                  Sua solicitação para se tornar vendedor está sendo analisada pelo administrador. 
                  Você receberá uma notificação quando for aprovado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/")} className="w-full">
                  Voltar para a Loja
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Torne-se um Vendedor</h1>
            <p className="text-muted-foreground">
              Venda seus produtos digitais e ganhe dinheiro
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <DollarSign className="h-10 w-10 mx-auto text-primary mb-3" />
                <h3 className="font-semibold mb-2">Ganhe Dinheiro</h3>
                <p className="text-sm text-muted-foreground">
                  Receba 93,01% do valor de cada venda
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Shield className="h-10 w-10 mx-auto text-primary mb-3" />
                <h3 className="font-semibold mb-2">Segurança</h3>
                <p className="text-sm text-muted-foreground">
                  Pagamentos protegidos via Pix
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <TrendingUp className="h-10 w-10 mx-auto text-primary mb-3" />
                <h3 className="font-semibold mb-2">Crescimento</h3>
                <p className="text-sm text-muted-foreground">
                  Alcance milhares de clientes
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Dados do Vendedor</CardTitle>
              <CardDescription>
                Preencha seus dados para se cadastrar como vendedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pixKey">Chave Pix</Label>
                    <Input
                      id="pixKey"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Email, telefone ou chave aleatória"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="terms" className="cursor-pointer">
                      Aceito a taxa de 9,99% sobre cada venda
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Esta taxa cobre os custos de processamento de pagamento e manutenção da plataforma.
                    </p>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Cadastro
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default BecomeSeller;
