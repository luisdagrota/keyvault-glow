import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Paperclip, Package, X, Image as ImageIcon, FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { TypingIndicator } from "./TypingIndicator";
import { RefundRequestButton } from "@/components/RefundRequestButton";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  sender_type: "customer" | "admin" | "seller";
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
  isSeller?: boolean;
  onMarkAsDelivered?: () => void;
}

export function ChatWindow({ orderId, orderNumber, customerName, isAdmin, isSeller = false, onMarkAsDelivered }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const userType = isAdmin ? 'admin' : (isSeller ? 'seller' : 'customer');
  const { isOtherTyping, handleTyping, stopTyping } = useTypingIndicator(orderId, userType);

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

    const field = isAdmin ? 'unread_admin_count' : (isSeller ? 'unread_seller_count' : 'unread_customer_count');
    
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

    stopTyping();

    let attachmentUrl = null;
    let attachmentName = null;

    // Upload file if selected
    if (selectedFile) {
      setUploading(true);
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${orderId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
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
        sender_type: userType,
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

  const formatDateGroup = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const isImageFile = (fileName: string | null) => {
    if (!fileName) return false;
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext ? imageExts.includes(ext) : false;
  };

  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const loadOrder = async () => {
      const { data } = await supabase
        .from('orders')
        .select('payment_status, seller_id, transaction_amount, updated_at')
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
  const canShowRefundButton = !isAdmin && order && ['approved', 'delivered'].includes(order.payment_status);

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = '';
  messages.forEach(msg => {
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msg.created_at, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

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
    <>
      {/* Refund Request Button - Above Chat for Customers */}
      {canShowRefundButton && (
        <div className="mb-4">
          <RefundRequestButton
            orderId={orderId}
            orderAmount={order.transaction_amount}
            sellerId={order.seller_id}
            paymentStatus={order.payment_status}
            deliveredAt={order.payment_status === 'delivered' ? order.updated_at : undefined}
          />
        </div>
      )}

      <Card className="card-gaming flex flex-col h-[calc(100vh-200px)] sm:h-[600px] min-h-[400px] max-h-[700px]">
        <CardHeader className="border-b border-border p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="truncate">Chat do Pedido {orderNumber}</span>
              </CardTitle>
              {customerName && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Cliente: {customerName}</p>
              )}
            </div>
            {(isAdmin || isSeller) && onMarkAsDelivered && (
              <Button onClick={onMarkAsDelivered} variant="default" size="sm" className="w-full sm:w-auto mt-2 sm:mt-0 h-9">
                Marcar como Entregue
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
            <div className="space-y-3 sm:space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                  Nenhuma mensagem ainda. Inicie a conversa!
                </div>
              )}

              {groupedMessages.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-3">
                  {/* Date separator */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground px-2">
                      {formatDateGroup(group.date)}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {group.messages.map((msg) => {
                    const isOwnMessage = msg.sender_type === userType;
                    const isImage = isImageFile(msg.attachment_name);
                    
                    const getSenderLabel = (type: string) => {
                      switch (type) {
                        case 'admin': return 'ADM';
                        case 'seller': return 'Vendedor';
                        default: return 'Cliente';
                      }
                    };
                    
                    const getSenderVariant = (type: string) => {
                      switch (type) {
                        case 'admin': return 'default';
                        case 'seller': return 'outline';
                        default: return 'secondary';
                      }
                    };
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] sm:max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                          <Badge variant={getSenderVariant(msg.sender_type) as any} className="text-xs">
                            {getSenderLabel(msg.sender_type)}
                          </Badge>
                          
                          <div
                            className={`rounded-lg p-2 sm:p-3 text-sm ${
                              isOwnMessage
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            {msg.message && <p className="break-words whitespace-pre-wrap">{msg.message}</p>}
                            
                            {msg.attachment_url && (
                              <>
                                {isImage ? (
                                  <button
                                    onClick={() => setPreviewImage(msg.attachment_url)}
                                    className="mt-2 block rounded-md overflow-hidden hover:opacity-90 transition-opacity"
                                  >
                                    <img 
                                      src={msg.attachment_url} 
                                      alt={msg.attachment_name || 'Imagem'} 
                                      className="max-w-full max-h-48 object-cover rounded-md"
                                    />
                                  </button>
                                ) : (
                                  <a
                                    href={msg.attachment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 mt-2 text-xs sm:text-sm p-2 rounded-md ${
                                      isOwnMessage 
                                        ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' 
                                        : 'bg-background hover:bg-background/80'
                                    } transition-colors`}
                                  >
                                    <FileText className="h-4 w-4 flex-shrink-0" />
                                    <span className="flex-1 truncate">{msg.attachment_name || 'Anexo'}</span>
                                    <Download className="h-3 w-3 flex-shrink-0" />
                                  </a>
                                )}
                              </>
                            )}
                          </div>
                          
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Typing indicator */}
              <TypingIndicator 
                isTyping={isOtherTyping} 
                label={isOtherTyping ? "Digitando..." : ""} 
              />
            </div>
          </ScrollArea>

          <div className="border-t border-border p-3 sm:p-4 space-y-2">
            {selectedFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                {selectedFile.type.startsWith('image/') ? (
                  <ImageIcon className="h-4 w-4 flex-shrink-0 text-primary" />
                ) : (
                  <Paperclip className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="text-xs sm:text-sm flex-1 truncate">{selectedFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  className="h-8 w-8 p-0"
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
                accept=".txt,.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
              />
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-10 w-10 sm:h-10 sm:w-10 flex-shrink-0"
                title="Anexar arquivo ou imagem"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <Textarea
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                placeholder="Digite sua mensagem..."
                className="flex-1 min-h-[40px] max-h-[100px] sm:max-h-[120px] resize-none text-sm"
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
                className="h-10 w-10 sm:h-10 sm:w-10 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-2">
          {previewImage && (
            <img 
              src={previewImage} 
              alt="Preview" 
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
