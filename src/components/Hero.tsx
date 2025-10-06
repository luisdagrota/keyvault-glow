import { Button } from "./ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
      
      <div className="container relative py-24 md:py-32">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-4 py-2 text-sm text-primary-foreground">
            <Zap className="h-4 w-4" />
            <span>Entrega Imediata • Preços Imbatíveis</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl">
            As Melhores{" "}
            <span className="gradient-text">Chaves e Contas</span>{" "}
            para Seus Jogos Favoritos
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl">
            Compre com segurança e receba instantaneamente. Milhares de jogadores confiam em nós.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link to="/products">
              <Button size="xl" variant="hero" className="group">
                Ver Ofertas
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button size="xl" variant="outline">
              Como Funciona
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-primary">15k+</span>
              <span className="text-muted-foreground">Clientes Satisfeitos</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-secondary">99%</span>
              <span className="text-muted-foreground">Avaliações Positivas</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-accent">24/7</span>
              <span className="text-muted-foreground">Suporte Online</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
