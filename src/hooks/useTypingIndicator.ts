import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TypingUser {
  user_id: string;
  user_type: "customer" | "admin" | "seller";
  is_typing: boolean;
}

type UserType = "customer" | "admin" | "seller";

export function useTypingIndicator(orderId: string, userType: UserType) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<boolean>(false);

  // Subscribe to typing status changes
  useEffect(() => {
    const channel = supabase
      .channel(`typing-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_typing_status',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setTypingUsers(prev => 
              prev.filter(u => u.user_id !== (payload.old as any).user_id)
            );
          } else {
            const newData = payload.new as any;
            setTypingUsers(prev => {
              const existing = prev.find(u => u.user_id === newData.user_id);
              if (existing) {
                return prev.map(u => 
                  u.user_id === newData.user_id 
                    ? { ...u, is_typing: newData.is_typing }
                    : u
                );
              }
              return [...prev, {
                user_id: newData.user_id,
                user_type: newData.user_type,
                is_typing: newData.is_typing
              }];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Update typing status
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (lastTypingRef.current === isTyping) return;
    lastTypingRef.current = isTyping;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase
        .from('chat_typing_status')
        .upsert({
          order_id: orderId,
          user_id: user.id,
          user_type: userType,
          is_typing: isTyping,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'order_id,user_id'
        });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [orderId, userType]);

  // Handle typing with debounce
  const handleTyping = useCallback(() => {
    setTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  }, [setTyping]);

  // Stop typing on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTyping(false);
    };
  }, [setTyping]);

  // Check if any other party is typing
  const isOtherTyping = typingUsers.some(u => {
    return u.user_type !== userType && u.is_typing;
  });

  return {
    isOtherTyping,
    handleTyping,
    stopTyping: () => setTyping(false)
  };
}
