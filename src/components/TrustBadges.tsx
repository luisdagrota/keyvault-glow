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
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {badges.map((badge) => (
            <div
              key={badge.title}
              className="flex flex-col items-center text-center p-6 rounded-lg bg-card border border-border/50 hover:border-primary/50 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <badge.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">{badge.title}</h3>
              <p className="text-sm text-muted-foreground">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
