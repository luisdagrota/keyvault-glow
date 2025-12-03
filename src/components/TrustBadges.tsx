import { Shield, Zap, Lock, Headphones } from "lucide-react";

const badges = [
  {
    icon: Zap,
    title: "Entrega Imediata",
    description: "Receba seu produto instantaneamente"
  },
  {
    icon: Shield,
    title: "100% Seguro",
    description: "Pagamento protegido e criptografado"
  },
  {
    icon: Lock,
    title: "Garantia Total",
    description: "Reembolso caso haja algum problema"
  },
  {
    icon: Headphones,
    title: "Suporte 24/7",
    description: "Atendimento sempre disponível"
  }
];

export function TrustBadges() {
  return (
    <section className="py-8 sm:py-16 bg-muted/30">
      <div className="container px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          {badges.map((badge) => (
            <div
              key={badge.title}
              className="flex flex-col items-center text-center p-3 sm:p-6 rounded-lg bg-card border border-border/50 hover:border-primary/50 transition-colors"
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 sm:mb-4">
                <badge.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="font-bold text-xs sm:text-base mb-1 sm:mb-2">{badge.title}</h3>
              <p className="text-[10px] sm:text-sm text-muted-foreground">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
