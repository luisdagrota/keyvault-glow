import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, MessageSquare, Send, X, Upload, Ticket, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  sender_type: string;
  message: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  technical: "Problema Técnico",
  payment: "Pagamento",
  seller: "Vendedor",
  order: "Pedido"
};

const statusLabels: Record<string, string> = {
  open: "Aberto",
  answered: "Respondido",
  waiting_customer: "Aguardando Cliente",
  closed: "Fechado"
};

const statusColors: Record<string, string> = {
  open: "bg-yellow-500",
  answered: "bg-green-500",
  waiting_customer: "bg-blue-500",
  closed: "bg-gray-500"
};

export function CustomerTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ category: "", subject: "", message: "" });
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadTickets();

    const channel = supabase
      .channel('customer-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => loadTickets())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages' }, (payload) => {
        if (selectedTicket && (payload.new as any).ticket_id === selectedTicket.id) {
          setMessages(prev => [...prev, payload.new as TicketMessage]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket?.id]);

  const loadTickets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading tickets:', error);
      return;
    }

    setTickets(data || []);
    setLoading(false);
  };

  const loadMessages = async (ticketId: string) => {
    setMessagesLoading(true);
    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
    setMessagesLoading(false);
  };

  const handleCreateTicket = async () => {
    if (!newTicket.category || !newTicket.subject || !newTicket.message) {
      toast.error("Preencha todos os campos");
      return;
    }

    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        category: newTicket.category,
        subject: newTicket.subject
      })
      .select()
      .single();

    if (ticketError) {
      toast.error("Erro ao criar ticket");
      setSending(false);
      return;
    }

    const { error: messageError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_type: 'customer',
        message: newTicket.message
      });

    if (messageError) {
      toast.error("Erro ao enviar mensagem");
      setSending(false);
      return;
    }

    toast.success("Ticket criado com sucesso!");
    setNewTicket({ category: "", subject: "", message: "" });
    setCreateDialogOpen(false);
    setSending(false);
    loadTickets();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: selectedTicket.id,
        sender_id: user.id,
        sender_type: 'customer',
        message: newMessage.trim()
      });

    if (error) {
      toast.error("Erro ao enviar mensagem");
      setSending(false);
      return;
    }

    setNewMessage("");
    setSending(false);
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    const { error } = await supabase
      .from('support_tickets')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', selectedTicket.id);

    if (error) {
      toast.error("Erro ao fechar ticket");
      return;
    }

    toast.success("Ticket fechado");
    setSelectedTicket(null);
    loadTickets();
  };

  const openTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    loadMessages(ticket.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (selectedTicket) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h3 className="font-semibold">{selectedTicket.subject}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{categoryLabels[selectedTicket.category]}</Badge>
              <Badge className={statusColors[selectedTicket.status]}>
                {statusLabels[selectedTicket.status]}
              </Badge>
            </div>
          </div>
          {selectedTicket.status !== 'closed' && (
            <Button variant="outline" size="sm" onClick={handleCloseTicket}>
              <X className="h-4 w-4 mr-2" />
              Fechar Ticket
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.sender_type === 'customer'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        {message.attachment_url && (
                          <a
                            href={message.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline mt-2 block"
                          >
                            📎 {message.attachment_name || 'Anexo'}
                          </a>
                        )}
                        <p className={`text-xs mt-1 ${
                          message.sender_type === 'customer' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {selectedTicket.status !== 'closed' && (
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6" />
            Meus Tickets
          </h2>
          <p className="text-muted-foreground">Acompanhe seus pedidos de suporte</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Abrir Novo Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <Select value={newTicket.category} onValueChange={(v) => setNewTicket(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Problema Técnico</SelectItem>
                    <SelectItem value="payment">Pagamento</SelectItem>
                    <SelectItem value="seller">Vendedor</SelectItem>
                    <SelectItem value="order">Pedido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Assunto</label>
                <Input
                  placeholder="Descreva brevemente o problema"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  placeholder="Descreva detalhadamente o problema..."
                  value={newTicket.message}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, message: e.target.value }))}
                  className="min-h-[120px]"
                />
              </div>
              <Button onClick={handleCreateTicket} disabled={sending} className="w-full">
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Ticket
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Você não tem tickets de suporte</p>
            <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Abrir Primeiro Ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => openTicket(ticket)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ticket.subject}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {categoryLabels[ticket.category]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <Badge className={`${statusColors[ticket.status]} text-white`}>
                    {statusLabels[ticket.status]}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}