import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Shield, Zap, Heart, Users } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Sobre a <span className="gradient-text">GameKeys</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                A loja de jogos digitais mais confiável do Brasil
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              <div className="p-6 rounded-lg bg-card border border-border">
                <Shield className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Segurança Total</h3>
                <p className="text-muted-foreground">
                  Todos os nossos produtos são verificados e garantidos. Seu pagamento está 100% protegido.
                </p>
              </div>

              <div className="p-6 rounded-lg bg-card border border-border">
                <Zap className="h-12 w-12 text-secondary mb-4" />
                <h3 className="text-xl font-bold mb-2">Entrega Instantânea</h3>
                <p className="text-muted-foreground">
                  Receba seu jogo em segundos após a confirmação do pagamento. Nada de espera!
                </p>
              </div>

              <div className="p-6 rounded-lg bg-card border border-border">
                <Heart className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-xl font-bold mb-2">Atendimento Humanizado</h3>
                <p className="text-muted-foreground">
                  Nossa equipe está sempre pronta para ajudar você. Suporte 24/7 por diversos canais.
                </p>
              </div>

              <div className="p-6 rounded-lg bg-card border border-border">
                <Users className="h-12 w-12 text-accent mb-4" />
                <h3 className="text-xl font-bold mb-2">Comunidade Ativa</h3>
                <p className="text-muted-foreground">
                  Milhares de gamers já confiaram em nós. Junte-se à nossa comunidade!
                </p>
              </div>
            </div>

            <div className="prose prose-invert max-w-none">
              <h2 className="text-2xl font-bold mb-4">Nossa História</h2>
              <p className="text-muted-foreground mb-4">
                A GameKeys nasceu da paixão por jogos e da vontade de oferecer aos gamers brasileiros 
                uma forma segura, rápida e acessível de adquirir seus jogos favoritos.
              </p>
              <p className="text-muted-foreground mb-4">
                Somos uma equipe de entusiastas de games que conhece as dificuldades de encontrar 
                produtos digitais com preços justos e entrega confiável. Por isso, criamos uma 
                plataforma que prioriza a experiência do usuário e a transparência em todas as etapas.
              </p>
              <p className="text-muted-foreground">
                Hoje, somos referência no mercado de jogos digitais, com milhares de clientes 
                satisfeitos e uma reputação consolidada. Nosso compromisso é continuar oferecendo 
                o melhor serviço e os melhores preços do mercado.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
