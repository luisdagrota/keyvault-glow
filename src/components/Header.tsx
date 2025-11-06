import { Link, useNavigate } from "react-router-dom";
import { Search, Menu, User } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState, FormEvent, useRef, useEffect } from "react";
import logo from "@/assets/logo.png";
import { SearchPreview } from "./SearchPreview";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";

export function Header() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);

  const ADMIN_EMAIL = "luisdagrota20@gmail.com";

  useEffect(() => {
    let mounted = true;

    const checkUserAndRole = async (session?: any) => {
      try {
        setLoadingAdmin(true);
        const sessionToUse = session ?? (await supabase.auth.getSession()).data.session;
        const currentUser = sessionToUse?.user ?? null;

        if (!mounted) return;

        setUser(currentUser);
        
        if (!currentUser) {
          console.log('❌ Nenhum usuário logado');
          setIsAdmin(false);
          return;
        }

        console.log('✅ Usuário logado:', {
          email: currentUser.email,
          id: currentUser.id,
          emailVerified: currentUser.email_confirmed_at
        });

        // 1) Verificação direta pelo e-mail (prioritária)
        if (currentUser.email === ADMIN_EMAIL) {
          console.log('✅ Email coincide com admin:', ADMIN_EMAIL);
          setIsAdmin(true);
          return;
        }

        // 2) Verificar roles no DB (fallback)
        console.log('🔍 Verificando role na tabela user_roles...');
        const { data: roleRow, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .eq('role', 'admin')
          .maybeSingle();

        console.log('📊 Resultado da query user_roles:', { roleRow, error });

        if (error) {
          console.error('❌ Erro ao buscar role:', error);
          setIsAdmin(false);
        } else {
          const hasAdminRole = !!roleRow;
          console.log(hasAdminRole ? '✅ Usuário tem role admin' : '❌ Usuário não tem role admin');
          setIsAdmin(hasAdminRole);
        }
      } catch (err) {
        console.error('❌ Erro em checkUserAndRole:', err);
        setIsAdmin(false);
      } finally {
        if (mounted) setLoadingAdmin(false);
      }
    };

    // Verificação inicial
    checkUserAndRole();

    // Inscrever-se às mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event);
      checkUserAndRole(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setIsPreviewOpen(false);
    if (searchTerm.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/products');
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setIsPreviewOpen(value.trim().length > 0);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsPreviewOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src={logo} 
              alt="GameKeys Logo" 
              className="h-10 w-10 object-contain mix-blend-multiply dark:mix-blend-screen" 
            />
            <span className="text-xl font-bold gradient-text">GameKeys</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/" className="text-foreground/80 hover:text-foreground transition-colors">
              Início
            </Link>
            <Link to="/products" className="text-foreground/80 hover:text-foreground transition-colors">
              Produtos
            </Link>
            <Link to="/about" className="text-foreground/80 hover:text-foreground transition-colors">
              Sobre
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div ref={searchRef} className="hidden md:block relative">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <Input
                type="search"
                placeholder="Buscar jogos..."
                className="w-64"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchTerm.trim() && setIsPreviewOpen(true)}
              />
              <Button type="submit" size="icon" variant="ghost">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            <SearchPreview
              searchTerm={searchTerm}
              isOpen={isPreviewOpen}
              onClose={() => setIsPreviewOpen(false)}
            />
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                  Painel ADM
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                <User className="h-4 w-4 mr-2" />
                Perfil
              </Button>
            </div>
          ) : (
            <Button variant="default" size="sm" onClick={() => navigate("/auth")}>
              Entrar
            </Button>
          )}

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
