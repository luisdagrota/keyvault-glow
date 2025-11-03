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
    console.log('📥 Webhook received from Mercado Pago:', JSON.stringify(webhookData));

    // Mercado Pago envia notificações com type "payment"
    if (webhookData.type !== 'payment') {
      console.log('⏭️  Ignored webhook type:', webhookData.type);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const paymentId = webhookData.data?.id;
    if (!paymentId) {
      console.error('❌ No payment ID in webhook data');
      return new Response(JSON.stringify({ error: 'No payment ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Processing payment ID:', paymentId);

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
      // Se for 404, pode ser ID de teste do simulador - retornar 200 para não reproces sar
      if (mpResponse.status === 404) {
        console.log('Payment not found (possibly test ID):', paymentId);
        return new Response(JSON.stringify({ received: true, note: 'Payment not found' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      // Para outros erros, também retornar 200 mas logar o erro
      console.error(`Mercado Pago API error: ${mpResponse.status}`);
      return new Response(JSON.stringify({ received: true, error: 'API error' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const paymentData = await mpResponse.json();
    console.log('✅ Payment data retrieved from Mercado Pago:', {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      payer_email: paymentData.payer?.email
    });

    // Atualizar status no banco de dados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: order, error: selectError } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_id', paymentId.toString())
      .maybeSingle();

    if (selectError || !order) {
      console.error('❌ Error finding order or order not found:', selectError);
      // Retorna 200 mesmo assim para não reprocessar webhook
      return new Response(JSON.stringify({ received: true, note: 'Order not found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📦 Order found:', {
      orderId: order.id,
      currentStatus: order.payment_status,
      newStatus: paymentData.status,
      customerEmail: order.customer_email,
      userId: order.user_id
    });

    // Atualizar status do pedido
    const { error: updateError } = await supabase
      .from('orders')
      .update({ payment_status: paymentData.status })
      .eq('payment_id', paymentId.toString());

    if (updateError) {
      console.error('❌ Error updating order:', updateError);
    } else {
      console.log('✅ Order updated successfully:', {
        orderId: order.id,
        oldStatus: order.payment_status,
        newStatus: paymentData.status
      });
    }

    // Enviar notificação quando o pagamento for aprovado
    if (paymentData.status === 'approved') {
      console.log('🎉 Payment APPROVED! Order:', order.id);
      console.log('📧 Should send delivery email to:', order.customer_email);
      
      if (order.user_id) {
        console.log('👤 Order is linked to user:', order.user_id);
      }
      
      // TODO: Implementar envio de e-mail com Resend ou outro serviço
      // Exemplo: await sendDeliveryEmail(order.customer_email, order.product_name);
    } else if (paymentData.status === 'rejected') {
      console.log('❌ Payment REJECTED! Order:', order.id);
    } else if (paymentData.status === 'pending' || paymentData.status === 'in_process') {
      console.log('⏳ Payment still PENDING/IN_PROCESS! Order:', order.id);
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
