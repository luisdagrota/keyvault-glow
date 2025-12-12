import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import About from "./pages/About";
import PedidoConcluido from "./pages/PedidoConcluido";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import MyOrders from "./pages/MyOrders";
import BecomeSeller from "./pages/BecomeSeller";
import SellerDashboard from "./pages/SellerDashboard";
import SellerProfile from "./pages/SellerProfile";
import HowItWorks from "./pages/HowItWorks";
import SellerProductDetail from "./pages/SellerProductDetail";
import Checkout from "./pages/Checkout";
import Statistics from "./pages/Statistics";
import Cart from "./pages/Cart";
import { DiscordButton } from "./components/DiscordButton";
import { CartProvider } from "./contexts/CartContext";
import { ThemeProvider } from "./contexts/ThemeContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/admin/*" element={<Admin />} />
              <Route path="/become-seller" element={<BecomeSeller />} />
              <Route path="/seller" element={<SellerDashboard />} />
              <Route path="/seller/:id" element={<SellerProfile />} />
              <Route path="/seller-product/:id" element={<SellerProductDetail />} />
              <Route path="/produto/:slug" element={<SellerProductDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/estatisticas" element={<Statistics />} />
              <Route path="/pedido-concluido" element={<PedidoConcluido />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <DiscordButton />
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
