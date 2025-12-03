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
    <section className="py-8 sm:py-16">
      <div className="container px-4">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
            O Que Nossos <span className="gradient-text">Clientes Dizem</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Milhares de gamers já confiaram em nós. Veja alguns depoimentos:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="p-4 sm:p-6 bg-card border-border hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm sm:text-base truncate">{testimonial.name}</div>
                  <div className="flex items-center gap-0.5 sm:gap-1 mt-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 sm:h-4 sm:w-4 fill-warning text-warning" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                "{testimonial.comment}"
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{testimonial.date}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
