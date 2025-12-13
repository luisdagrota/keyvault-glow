import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BookOpen, 
  Shield, 
  FileText, 
  HelpCircle, 
  Headphones,
  ChevronDown,
  ChevronUp,
  Store,
  CreditCard,
  MessageSquare,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function HowItWorks() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  const sections: Section[] = [
    {
      id: "como-funciona",
      title: "Como funciona o site",
      icon: <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />,
      content: (
        <div className="space-y-4 text-muted-foreground">
          <div className="flex items-start gap-3">
            <Store className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground mb-1">1. Escolha seu produto</h4>
              <p>Navegue pelo nosso catálogo de jogos e contas digitais. Use os filtros para encontrar exatamente o que procura.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground mb-1">2. Realize o pagamento</h4>
              <p>Pague de forma segura via PIX, Boleto ou Cartão de Crédito através do Mercado Pago.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground mb-1">3. Receba pelo chat</h4>
              <p>Após a confirmação do pagamento, o vendedor entrará em contato pelo chat da plataforma para entregar seu produto.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground mb-1">4. Confirme e avalie</h4>
              <p>Após receber seu produto, confirme a entrega e deixe uma avaliação para ajudar outros compradores.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "regras-vendedores",
      title: "Regras para vendedores",
      icon: <Shield className="h-5 w-5 sm:h-6 sm:w-6" />,
      content: (
        <div className="space-y-4 text-muted-foreground">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
              É extremamente importante evitar fraudes na entrega de produtos
            </h4>
            <p>Sempre tire <strong>prints da entrega</strong>, do código enviado e de qualquer conversa relevante. Isso protege <strong>tanto o vendedor quanto o cliente</strong> em caso de disputa.</p>
          </div>
          
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
              Sempre responda o cliente o mais rápido possível
            </h4>
            <p>Respostas rápidas aumentam a satisfação e melhoram a avaliação do vendedor. Quanto melhor a avaliação, maior será a visibilidade e as chances de vendas.</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">3</span>
              <p>O vendedor deve entregar corretamente o produto adquirido pelo cliente.</p>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">4</span>
              <p>Caso o produto dependa de ativação, login ou conta, seguir todas as instruções indicadas para evitar problemas.</p>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">5</span>
              <p>Ser maior de 18 anos e possuir CPF válido para atuar como vendedor.</p>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">6</span>
              <p>Não publicar produtos proibidos, ilegais ou que violem direitos autorais.</p>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">7</span>
              <p>O vendedor concorda com a taxa padrão de <strong>9,99%</strong> aplicada automaticamente sobre cada venda.</p>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">8</span>
              <p>Em caso de comportamento suspeito, descumprimento de regras ou reclamações graves, o vendedor pode ser suspenso.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "politica-uso",
      title: "Política de uso",
      icon: <FileText className="h-5 w-5 sm:h-6 sm:w-6" />,
      content: (
        <div className="space-y-4 text-muted-foreground">
          <p>Ao utilizar a plataforma GameKeys, você concorda com os seguintes termos:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Todas as transações são intermediadas pela plataforma para maior segurança.</li>
            <li>É proibido compartilhar informações pessoais fora do chat oficial.</li>
            <li>Disputas entre compradores e vendedores serão analisadas pela administração.</li>
            <li>A plataforma não se responsabiliza por produtos entregues fora do sistema.</li>
            <li>Contas falsas ou comportamento fraudulento resultarão em banimento permanente.</li>
            <li>O uso da plataforma é permitido apenas para maiores de 18 anos.</li>
            <li>Todos os dados são protegidos conforme a LGPD (Lei Geral de Proteção de Dados).</li>
          </ul>
        </div>
      ),
    },
    {
      id: "perguntas-frequentes",
      title: "Perguntas frequentes",
      icon: <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />,
      content: (
        <div className="space-y-4 text-muted-foreground">
          <div>
            <h4 className="font-semibold text-foreground mb-1">Como recebo meu produto?</h4>
            <p>Após a confirmação do pagamento, o vendedor entrará em contato pelo chat interno da plataforma.</p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">Quais formas de pagamento são aceitas?</h4>
            <p>Aceitamos PIX, Boleto Bancário e Cartão de Crédito via Mercado Pago.</p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">O que fazer se não receber o produto?</h4>
            <p>Entre em contato pelo nosso Discord de suporte. Analisaremos o caso e tomaremos as medidas necessárias.</p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">Posso me tornar um vendedor?</h4>
            <p>Sim! Basta ter 18 anos ou mais, CPF válido e se cadastrar na seção "Quero Vender".</p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">Qual é a taxa cobrada dos vendedores?</h4>
            <p>A plataforma cobra uma taxa de 9,99% sobre cada venda realizada.</p>
          </div>
        </div>
      ),
    },
    {
      id: "suporte",
      title: "Suporte",
      icon: <Headphones className="h-5 w-5 sm:h-6 sm:w-6" />,
      content: (
        <div className="space-y-4 text-muted-foreground">
          <p>Precisa de ajuda? Estamos aqui para você!</p>
          <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <svg className="h-5 w-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Discord de Suporte
            </h4>
            <p className="mb-3">Entre no nosso servidor do Discord para suporte rápido e direto com a equipe.</p>
            <a 
              href="https://discord.gg/3B348wmnQ4" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#5865F2] text-white px-4 py-2 rounded-lg hover:bg-[#4752C4] transition-colors font-medium"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Entrar no Discord
            </a>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <SEOHead
        title="Como Funciona"
        description="Saiba como funciona a GameKeys, regras para vendedores, política de uso, perguntas frequentes e suporte."
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container px-4 py-6 sm:py-10">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text mb-3 sm:mb-4">
                Central de Informações
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Tudo o que você precisa saber sobre a GameKeys
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {sections.map((section) => (
                <Card 
                  key={section.id}
                  className={cn(
                    "transition-all duration-300 overflow-hidden",
                    openSection === section.id 
                      ? "border-primary/50 shadow-lg shadow-primary/5" 
                      : "hover:border-primary/30"
                  )}
                >
                  <CardHeader className="p-0">
                    <Button
                      variant="ghost"
                      className="w-full h-auto p-4 sm:p-6 justify-between hover:bg-transparent"
                      onClick={() => toggleSection(section.id)}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={cn(
                          "p-2 sm:p-3 rounded-lg transition-colors",
                          openSection === section.id 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-primary/10 text-primary"
                        )}>
                          {section.icon}
                        </div>
                        <CardTitle className="text-base sm:text-lg font-semibold text-left">
                          {section.title}
                        </CardTitle>
                      </div>
                      {openSection === section.id ? (
                        <ChevronUp className="h-5 w-5 text-primary flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </Button>
                  </CardHeader>
                  <div
                    className={cn(
                      "grid transition-all duration-300",
                      openSection === section.id 
                        ? "grid-rows-[1fr] opacity-100" 
                        : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
                        <div className="pt-2 border-t border-border">
                          <div className="pt-4">
                            {section.content}
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
