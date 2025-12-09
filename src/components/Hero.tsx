import { Button } from "./ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
      
      <div className="container relative py-12 sm:py-24 md:py-32 px-4">
        <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-primary-foreground">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Entrega Imediata • Preços Imbatíveis</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl leading-tight">
            As Melhores{" "}
            <span className="gradient-text">Chaves e Contas</span>{" "}
            para Seus Jogos Favoritos
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl px-4">
            Compre com segurança e receba instantaneamente. Milhares de jogadores confiam em nós.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4 w-full sm:w-auto px-4 sm:px-0">
            <Link to="/products" className="w-full sm:w-auto">
              <Button size="lg" variant="hero" className="group w-full sm:w-auto h-12 sm:h-14 text-base">
                Ver Ofertas
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/how-it-works" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 sm:h-14 text-base">
                Como Funciona
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-6 sm:gap-8 pt-6 sm:pt-8 text-sm">
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-primary">15k+</span>
              <span className="text-xs sm:text-sm text-muted-foreground">Clientes Satisfeitos</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-secondary">99%</span>
              <span className="text-xs sm:text-sm text-muted-foreground">Avaliações Positivas</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-accent">24/7</span>
              <span className="text-xs sm:text-sm text-muted-foreground">Suporte Online</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
