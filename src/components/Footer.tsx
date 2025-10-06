import { Link } from "react-router-dom";
import { Shield, Lock, CreditCard } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded bg-gradient-primary" />
              <span className="text-xl font-bold">GameKeys</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A melhor loja para comprar chaves e contas de jogos com segurança e agilidade.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Shield className="h-5 w-5 text-success" />
              <Lock className="h-5 w-5 text-success" />
              <CreditCard className="h-5 w-5 text-success" />
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-4">Links Rápidos</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Início
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-muted-foreground hover:text-foreground transition-colors">
                  Produtos
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  Sobre Nós
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Suporte</h3>
            <ul className="space-y-2 text-sm">
              <li className="text-muted-foreground">FAQ</li>
              <li className="text-muted-foreground">Como Comprar</li>
              <li className="text-muted-foreground">Garantia</li>
              <li className="text-muted-foreground">Contato</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Pagamento Seguro</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Aceitamos os principais métodos de pagamento com total segurança.
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="h-8 px-3 rounded bg-muted flex items-center text-xs font-bold">VISA</div>
              <div className="h-8 px-3 rounded bg-muted flex items-center text-xs font-bold">MASTERCARD</div>
              <div className="h-8 px-3 rounded bg-muted flex items-center text-xs font-bold">PIX</div>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2025 GameKeys. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
