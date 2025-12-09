import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageSquare, Send, X, ArrowLeft, Ticket, User } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SupportTicket {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string } | null;
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

export function AdminTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadTickets();

    const channel = supabase
      .channel('admin-tickets')
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
    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading tickets:', error);
      return;
    }

    // Fetch profiles for each ticket
    const ticketsWithProfiles = await Promise.all(
      (data || []).map(async (ticket) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', ticket.user_id)
          .single();
        
        return { ...ticket, profiles: profile };
      })
    );

    setTickets(ticketsWithProfiles);
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

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
        sender_type: 'admin',
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

  const openCount = tickets.filter(t => t.status === 'open').length;
  const waitingCount = tickets.filter(t => t.status === 'waiting_customer').length;

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h3 className="font-semibold">{selectedTicket.subject}</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{categoryLabels[selectedTicket.category]}</Badge>
              <Badge className={statusColors[selectedTicket.status]}>
                {statusLabels[selectedTicket.status]}
              </Badge>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {selectedTicket.profiles?.full_name || 'Usuário'}
              </span>
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
                      className={`flex ${message.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.sender_type === 'admin'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-xs font-medium mb-1">
                          {message.sender_type === 'admin' ? 'Suporte' : 'Cliente'}
                        </p>
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
                          message.sender_type === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground'
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
                    placeholder="Digite sua resposta..."
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6" />
            Tickets de Suporte
          </h2>
          <p className="text-muted-foreground">
            {openCount} abertos • {waitingCount} aguardando resposta
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="answered">Respondidos</SelectItem>
            <SelectItem value="waiting_customer">Aguardando Cliente</SelectItem>
            <SelectItem value="closed">Fechados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum ticket encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                ticket.status === 'open' || ticket.status === 'waiting_customer' 
                  ? 'border-primary/50' 
                  : ''
              }`}
              onClick={() => openTicket(ticket)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ticket.subject}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {categoryLabels[ticket.category]}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {ticket.profiles?.full_name || 'Usuário'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <Badge className={`${statusColors[ticket.status]} text-white shrink-0`}>
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