import { Link, useNavigate } from "react-router-dom";
import { Search, Menu, User, MessageSquare, Store } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState, FormEvent, useRef, useEffect } from "react";
import logo from "@/assets/logo.png";
import { SearchPreview } from "./SearchPreview";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { NotificationBadge } from "./NotificationBadge";

export function Header() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
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
          setIsSeller(false);
          setUnreadMessages(0);
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
          // Load admin unread messages
          loadAdminUnreadMessages();
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
          if (hasAdminRole) {
            loadAdminUnreadMessages();
          }
        }

        // Load customer unread messages
        loadCustomerUnreadMessages(currentUser.id);

        // Check if user is a seller
        checkSellerStatus(currentUser.id);
      } catch (err) {
        console.error('❌ Erro em checkUserAndRole:', err);
        setIsAdmin(false);
      } finally {
        if (mounted) setLoadingAdmin(false);
      }
    };

    const loadAdminUnreadMessages = async () => {
      const { data, error } = await supabase
        .from('order_chat_status')
        .select('unread_admin_count')
        .eq('is_archived', false);

      if (!error && data) {
        const total = data.reduce((sum, item) => sum + (item.unread_admin_count || 0), 0);
        setUnreadMessages(total);
      }
    };

    const loadCustomerUnreadMessages = async (userId: string) => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', userId);

      if (!error && orders) {
        const orderIds = orders.map(o => o.id);
        if (orderIds.length > 0) {
          const { data: statuses } = await supabase
            .from('order_chat_status')
            .select('unread_customer_count')
            .in('order_id', orderIds)
            .eq('is_archived', false);

          if (statuses) {
            const total = statuses.reduce((sum, item) => sum + (item.unread_customer_count || 0), 0);
            setUnreadMessages(total);
          }
        }
      }
    };

    const checkSellerStatus = async (userId: string) => {
      const { data: seller } = await supabase
        .from('seller_profiles')
        .select('is_approved, is_suspended')
        .eq('user_id', userId)
        .single();

      setIsSeller(seller?.is_approved && !seller?.is_suspended);
    };

    // Verificação inicial
    checkUserAndRole();

    // Inscrever-se às mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event);
      checkUserAndRole(session);
    });

    // Subscribe to chat status updates
    const chatChannel = supabase
      .channel('header-chat-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_chat_status'
        },
        () => {
          // Reload unread counts
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              if (user.email === ADMIN_EMAIL) {
                loadAdminUnreadMessages();
              } else {
                loadCustomerUnreadMessages(user.id);
              }
            }
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      supabase.removeChannel(chatChannel);
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
                <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="relative">
                  Painel ADM
                  <NotificationBadge count={unreadMessages} />
                </Button>
              )}
              {isSeller && !isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate("/seller")}>
                  <Store className="h-4 w-4 mr-2" />
                  Painel Vendedor
                </Button>
              )}
              {!isSeller && !isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/become-seller")}>
                  <Store className="h-4 w-4 mr-2" />
                  Vender
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="relative">
                <User className="h-4 w-4 mr-2" />
                Perfil
                {!isAdmin && <NotificationBadge count={unreadMessages} />}
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
