import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CouponData {
  hasCoupons: boolean;
  couponCount: number;
}

export function useProductCoupons(productId: string, sellerId?: string): CouponData {
  const [data, setData] = useState<CouponData>({ hasCoupons: false, couponCount: 0 });

  useEffect(() => {
    if (!sellerId) return;

    const checkCoupons = async () => {
      try {
        // Check for coupons that apply to this specific product
        const { data: productCoupons } = await supabase
          .from("seller_coupon_products")
          .select("coupon_id")
          .eq("product_id", productId);

        if (productCoupons && productCoupons.length > 0) {
          // Check if any of these coupons are active
          const couponIds = productCoupons.map((cp) => cp.coupon_id);
          const { count } = await supabase
            .from("seller_coupons")
            .select("*", { count: "exact", head: true })
            .in("id", couponIds)
            .eq("is_active", true)
            .or("expires_at.is.null,expires_at.gt.now()")
            .or("max_uses.is.null,times_used.lt.max_uses");

          if (count && count > 0) {
            setData({ hasCoupons: true, couponCount: count });
            return;
          }
        }

        // Check for seller's general coupons (no specific products = applies to all)
        const { data: generalCoupons } = await supabase
          .from("seller_coupons")
          .select("id")
          .eq("seller_id", sellerId)
          .eq("is_active", true);

        if (generalCoupons) {
          // Filter coupons that don't have specific products assigned
          for (const coupon of generalCoupons) {
            const { count: productCount } = await supabase
              .from("seller_coupon_products")
              .select("*", { count: "exact", head: true })
              .eq("coupon_id", coupon.id);

            if (productCount === 0) {
              // This coupon applies to all products
              setData({ hasCoupons: true, couponCount: 1 });
              return;
            }
          }
        }

        setData({ hasCoupons: false, couponCount: 0 });
      } catch (error) {
        console.error("Error checking coupons:", error);
        setData({ hasCoupons: false, couponCount: 0 });
      }
    };

    checkCoupons();
  }, [productId, sellerId]);

  return data;
}