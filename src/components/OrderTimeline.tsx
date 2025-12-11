import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, CreditCard, Package, Truck, Star } from "lucide-react";

interface TimelineStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: "completed" | "current" | "pending";
  timestamp?: string;
}

interface OrderTimelineProps {
  paymentStatus: string;
  createdAt: string;
  updatedAt?: string;
  className?: string;
}

export function OrderTimeline({ paymentStatus, createdAt, updatedAt, className }: OrderTimelineProps) {
  const getSteps = (): TimelineStep[] => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    };

    const baseSteps: TimelineStep[] = [
      {
        id: "created",
        label: "Pedido Realizado",
        description: "Seu pedido foi registrado",
        icon: <Package className="h-5 w-5" />,
        status: "completed",
        timestamp: formatDate(createdAt)
      },
      {
        id: "payment",
        label: "Pagamento",
        description: "Aguardando confirmação",
        icon: <CreditCard className="h-5 w-5" />,
        status: "pending"
      },
      {
        id: "processing",
        label: "Preparando Entrega",
        description: "Vendedor preparando seu produto",
        icon: <Clock className="h-5 w-5" />,
        status: "pending"
      },
      {
        id: "delivered",
        label: "Produto Entregue",
        description: "Produto enviado para você",
        icon: <Truck className="h-5 w-5" />,
        status: "pending"
      },
      {
        id: "completed",
        label: "Concluído",
        description: "Pedido finalizado",
        icon: <Star className="h-5 w-5" />,
        status: "pending"
      }
    ];

    // Update statuses based on payment status
    switch (paymentStatus) {
      case "pending":
        baseSteps[1].status = "current";
        baseSteps[1].description = "Aguardando pagamento";
        break;
      case "approved":
        baseSteps[1].status = "completed";
        baseSteps[1].description = "Pagamento aprovado";
        baseSteps[1].timestamp = formatDate(updatedAt || createdAt);
        baseSteps[2].status = "current";
        baseSteps[2].description = "Vendedor preparando entrega";
        break;
      case "delivered":
        baseSteps[1].status = "completed";
        baseSteps[1].description = "Pagamento aprovado";
        baseSteps[2].status = "completed";
        baseSteps[2].description = "Entrega preparada";
        baseSteps[3].status = "completed";
        baseSteps[3].description = "Produto entregue";
        baseSteps[3].timestamp = formatDate(updatedAt || createdAt);
        baseSteps[4].status = "current";
        baseSteps[4].description = "Avalie sua experiência";
        break;
      case "refunded":
        baseSteps[1].status = "completed";
        baseSteps[1].description = "Reembolsado";
        baseSteps[2].status = "pending";
        baseSteps[3].status = "pending";
        baseSteps[4].status = "pending";
        break;
      case "cancelled":
        baseSteps[1].status = "pending";
        baseSteps[1].description = "Pagamento cancelado";
        break;
      default:
        break;
    }

    return baseSteps;
  };

  const steps = getSteps();

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile: Vertical Timeline */}
      <div className="block sm:hidden">
        <div className="relative">
          {steps.map((step, index) => (
            <div key={step.id} className="flex gap-4 pb-6 last:pb-0">
              {/* Vertical line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[19px] w-0.5 h-full -z-10",
                    step.status === "completed" ? "bg-primary" : "bg-muted"
                  )}
                  style={{ top: `${index * 60}px`, height: "60px" }}
                />
              )}
              
              {/* Icon */}
              <div
                className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  step.status === "completed" && "bg-primary text-primary-foreground",
                  step.status === "current" && "bg-primary/20 text-primary ring-2 ring-primary animate-pulse",
                  step.status === "pending" && "bg-muted text-muted-foreground"
                )}
              >
                {step.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  step.icon
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium text-sm",
                  step.status === "pending" && "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
                {step.timestamp && (
                  <p className="text-xs text-primary mt-1">{step.timestamp}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Horizontal Timeline */}
      <div className="hidden sm:block">
        <div className="flex items-start justify-between relative">
          {/* Progress bar background */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-muted" />
          
          {/* Progress bar fill */}
          <div
            className="absolute top-5 left-0 h-1 bg-primary transition-all duration-500"
            style={{
              width: `${(steps.filter(s => s.status === "completed").length / (steps.length - 1)) * 100}%`
            }}
          />

          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex flex-col items-center relative z-10"
              style={{ width: `${100 / steps.length}%` }}
            >
              {/* Icon */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all mb-3",
                  step.status === "completed" && "bg-primary text-primary-foreground",
                  step.status === "current" && "bg-primary/20 text-primary ring-2 ring-primary animate-pulse",
                  step.status === "pending" && "bg-muted text-muted-foreground"
                )}
              >
                {step.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  step.icon
                )}
              </div>
              
              {/* Content */}
              <div className="text-center px-1">
                <p className={cn(
                  "font-medium text-xs",
                  step.status === "pending" && "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                  {step.description}
                </p>
                {step.timestamp && (
                  <p className="text-[10px] text-primary mt-1">{step.timestamp}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}