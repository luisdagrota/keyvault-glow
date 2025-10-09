import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookData = await req.json();
    console.log('Webhook received from Mercado Pago:', webhookData);

    // Mercado Pago envia notificações com type "payment"
    if (webhookData.type !== 'payment') {
      console.log('Ignored webhook type:', webhookData.type);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const paymentId = webhookData.data?.id;
    if (!paymentId) {
      console.error('No payment ID in webhook data');
      return new Response(JSON.stringify({ error: 'No payment ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    // Consultar status atualizado no Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!mpResponse.ok) {
      throw new Error(`Mercado Pago API error: ${mpResponse.status}`);
    }

    const paymentData = await mpResponse.json();
    console.log('Payment status from Mercado Pago:', {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail
    });

    // Atualizar status no banco de dados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: order, error: selectError } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_id', paymentId.toString())
      .single();

    if (selectError) {
      console.error('Error finding order:', selectError);
      // Retorna 200 mesmo assim para não reprocessar webhook
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Atualizar status do pedido
    const { error: updateError } = await supabase
      .from('orders')
      .update({ payment_status: paymentData.status })
      .eq('payment_id', paymentId.toString());

    if (updateError) {
      console.error('Error updating order:', updateError);
    } else {
      console.log('Order updated successfully:', order.id);
    }

    // TODO: Aqui você pode adicionar lógica para enviar e-mail com a key/credencial
    // quando paymentData.status === 'approved'
    if (paymentData.status === 'approved') {
      console.log('Payment approved - should send delivery email to:', order.customer_email);
      // Implementar envio de e-mail com Resend ou outro serviço
    }

    return new Response(
      JSON.stringify({ 
        received: true,
        orderId: order.id,
        status: paymentData.status 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
