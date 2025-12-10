import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PresenceState {
  [key: string]: {
    seller_id: string;
    online_at: string;
  }[];
}

export function useSellerPresence(sellerId?: string) {
  const [isOnline, setIsOnline] = useState(false);
  const [onlineSellers, setOnlineSellers] = useState<string[]>([]);

  useEffect(() => {
    const channel = supabase.channel("sellers-presence", {
      config: {
        presence: {
          key: "sellers",
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as PresenceState;
        const sellers = state.sellers || [];
        const onlineIds = sellers.map((s) => s.seller_id);
        setOnlineSellers(onlineIds);
        
        if (sellerId) {
          setIsOnline(onlineIds.includes(sellerId));
        }
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        const newIds = newPresences.map((p: any) => p.seller_id);
        setOnlineSellers((prev) => [...new Set([...prev, ...newIds])]);
        
        if (sellerId && newIds.includes(sellerId)) {
          setIsOnline(true);
        }
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        const leftIds = leftPresences.map((p: any) => p.seller_id);
        setOnlineSellers((prev) => prev.filter((id) => !leftIds.includes(id)));
        
        if (sellerId && leftIds.includes(sellerId)) {
          setIsOnline(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sellerId]);

  return { isOnline, onlineSellers };
}

export function useTrackSellerPresence(sellerId: string | null) {
  useEffect(() => {
    if (!sellerId) return;

    const channel = supabase.channel("sellers-presence", {
      config: {
        presence: {
          key: "sellers",
        },
      },
    });

    const trackPresence = async () => {
      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            seller_id: sellerId,
            online_at: new Date().toISOString(),
          });
        }
      });
    };

    trackPresence();

    // Handle page visibility changes
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        await channel.track({
          seller_id: sellerId,
          online_at: new Date().toISOString(),
        });
      } else {
        await channel.untrack();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [sellerId]);
}
