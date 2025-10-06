import { Star } from "lucide-react";
import { Card } from "./ui/card";

const testimonials = [
  {
    name: "Lucas Silva",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas",
    rating: 5,
    comment: "Comprei minha conta de GTA V e recebi em menos de 5 minutos! Perfeito!",
    date: "Há 2 dias"
  },
  {
    name: "Marina Costa",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marina",
    rating: 5,
    comment: "Melhor preço que encontrei. Atendimento excelente e produto original.",
    date: "Há 1 semana"
  },
  {
    name: "Rafael Santos",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rafael",
    rating: 5,
    comment: "Sempre compro aqui, nunca tive problemas. Super recomendo!",
    date: "Há 3 dias"
  }
];

export function Testimonials() {
  return (
    <section className="py-16">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            O Que Nossos <span className="gradient-text">Clientes Dizem</span>
          </h2>
          <p className="text-muted-foreground">
            Milhares de gamers já confiaram em nós. Veja alguns depoimentos:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-4 mb-4">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="h-12 w-12 rounded-full"
                />
                <div className="flex-1">
                  <div className="font-bold">{testimonial.name}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                "{testimonial.comment}"
              </p>
              <p className="text-xs text-muted-foreground">{testimonial.date}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
