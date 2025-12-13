import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { SellerOverview } from "@/components/seller/SellerOverview";
import { SellerProducts } from "@/components/seller/SellerProducts";
import { SellerSales } from "@/components/seller/SellerSales";
import { SellerBalance } from "@/components/seller/SellerBalance";
import { SellerNotifications } from "@/components/seller/SellerNotifications";
import { SellerWarnings } from "@/components/seller/SellerWarnings";
import { SellerRefunds } from "@/components/seller/SellerRefunds";
import { SellerCoupons } from "@/components/seller/SellerCoupons";
import { SellerChats } from "@/components/seller/SellerChats";
import { SellerChallenges } from "@/components/seller/SellerChallenges";
import { useTrackSellerPresence } from "@/hooks/useSellerPresence";

export interface SellerProfile {
  id: string;
  user_id: string;
  full_name: string;
  birth_date: string;
  cpf: string;
  pix_key: string;
  is_approved: boolean;
  is_suspended: boolean;
  pending_balance: number;
  available_balance: number;
  total_sales: number;
  average_rating: number;
  created_at: string;
  banner_url: string | null;
  bio: string | null;
  warning_count: number;
}

const SellerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  useEffect(() => {
    const checkSeller = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: seller, error } = await supabase
        .from("seller_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error || !seller) {
        navigate("/become-seller");
        return;
      }

      if (!seller.is_approved) {
        navigate("/become-seller");
        return;
      }

      if (seller.is_suspended) {
        navigate("/");
        return;
      }

      setSellerProfile(seller);
      setLoading(false);
    };

    checkSeller();
  }, [navigate]);

  // Track seller presence
  useTrackSellerPresence(sellerProfile?.id || null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!sellerProfile) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <SellerSidebar activeTab={activeTab} setActiveTab={setActiveTab} sellerId={sellerProfile.id} />
      
      <main className="flex-1 p-4 sm:p-6 overflow-auto pt-16 lg:pt-6">
        {activeTab === "overview" && <SellerOverview seller={sellerProfile} onProfileUpdate={() => {
          supabase.from("seller_profiles").select("*").eq("id", sellerProfile.id).single().then(({ data }) => {
            if (data) setSellerProfile(data);
          });
        }} />}
        {activeTab === "challenges" && <SellerChallenges sellerId={sellerProfile.id} />}
        {activeTab === "products" && <SellerProducts sellerId={sellerProfile.id} />}
        {activeTab === "coupons" && <SellerCoupons sellerId={sellerProfile.id} />}
        {activeTab === "chats" && <SellerChats sellerId={sellerProfile.id} />}
        {activeTab === "sales" && <SellerSales sellerId={sellerProfile.id} />}
        {activeTab === "balance" && <SellerBalance seller={sellerProfile} />}
        {activeTab === "warnings" && <SellerWarnings seller={sellerProfile} />}
        {activeTab === "notifications" && <SellerNotifications sellerId={sellerProfile.id} />}
        {activeTab === "refunds" && <SellerRefunds sellerId={sellerProfile.id} />}
      </main>
    </div>
  );
};

export default SellerDashboard;
