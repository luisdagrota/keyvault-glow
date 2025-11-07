import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Paperclip, Package, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  sender_type: "customer" | "admin";
  message: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

interface ChatWindowProps {
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  isAdmin: boolean;
  onMarkAsDelivered?: () => void;
}

export function ChatWindow({ orderId, orderNumber, customerName, isAdmin, onMarkAsDelivered }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    markAsRead();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
          markAsRead();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      toast.error("Erro ao carregar mensagens", { description: error.message });
      return;
    }

    setMessages((data || []) as ChatMessage[]);
  };

  const markAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const field = isAdmin ? 'unread_admin_count' : 'unread_customer_count';
    
    await supabase
      .from('order_chat_status')
      .update({ [field]: 0 })
      .eq('order_id', orderId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) {
      toast.error("Digite uma mensagem ou anexe um arquivo");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    let attachmentUrl = null;
    let attachmentName = null;

    // Upload file if selected
    if (selectedFile) {
      setUploading(true);
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${orderId}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, selectedFile);

      if (uploadError) {
        toast.error("Erro ao enviar arquivo", { description: uploadError.message });
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      attachmentUrl = publicUrl;
      attachmentName = selectedFile.name;
      setUploading(false);
    }

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        order_id: orderId,
        sender_id: user.id,
        sender_type: isAdmin ? 'admin' : 'customer',
        message: newMessage.trim() || null,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName
      });

    if (error) {
      toast.error("Erro ao enviar mensagem", { description: error.message });
      return;
    }

    setNewMessage("");
    setSelectedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande", { description: "O tamanho máximo é 10MB" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const loadOrder = async () => {
      const { data } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('id', orderId)
        .single();
      
      setOrder(data);
    };

    loadOrder();

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          setOrder(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const isDelivered = order?.payment_status === 'delivered';

  if (isDelivered && !isAdmin) {
    return (
      <Card className="card-gaming flex flex-col h-[600px]">
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Package className="h-8 w-8 text-success" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">✅ Seu pedido foi concluído com sucesso!</h3>
              <p className="text-muted-foreground">Obrigado por comprar conosco.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-gaming flex flex-col h-[600px]">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Chat do Pedido {orderNumber}
            </CardTitle>
            {customerName && (
              <p className="text-sm text-muted-foreground mt-1">Cliente: {customerName}</p>
            )}
          </div>
          {isAdmin && onMarkAsDelivered && (
            <Button onClick={onMarkAsDelivered} variant="default" size="sm">
              Marcar como Entregue
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma mensagem ainda. Inicie a conversa!
              </div>
            )}

            {messages.map((msg) => {
              const isOwnMessage = isAdmin ? msg.sender_type === 'admin' : msg.sender_type === 'customer';
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <Badge variant={msg.sender_type === 'admin' ? 'default' : 'secondary'} className="text-xs">
                      {msg.sender_type === 'admin' ? 'ADM' : 'Cliente'}
                    </Badge>
                    
                    <div
                      className={`rounded-lg p-3 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {msg.message && <p className="break-words">{msg.message}</p>}
                      
                      {msg.attachment_url && (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 mt-2 text-sm underline hover:opacity-80"
                        >
                          <Paperclip className="h-4 w-4" />
                          {msg.attachment_name || 'Anexo'}
                        </a>
                      )}
                    </div>
                    
                    <span className="text-xs text-muted-foreground">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-4 space-y-2">
          {selectedFile && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <Paperclip className="h-4 w-4" />
              <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".txt,.pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />

            <Button
              onClick={handleSendMessage}
              disabled={uploading || (!newMessage.trim() && !selectedFile)}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
