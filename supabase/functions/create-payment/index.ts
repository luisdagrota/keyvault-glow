import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  productId: string;
  productName: string;
  productPrice: number;
  customerEmail: string;
  customerName: string;
  paymentMethod: 'pix' | 'credit_card' | 'ticket';
  userId?: string;
  sellerId?: string;
  sellerName?: string;
  cardData?: {
    cardNumber: string;
    cardholderName: string;
    cardExpirationMonth: string;
    cardExpirationYear: string;
    securityCode: string;
    identificationType: string;
    identificationNumber: string;
    installments: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const paymentRequest: PaymentRequest = await req.json();
    console.log('Creating payment for:', paymentRequest.productName);

    // Preparar body base para Mercado Pago
    const webhookUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;
    
    const paymentBody: any = {
      transaction_amount: paymentRequest.productPrice,
      description: paymentRequest.productName,
      notification_url: webhookUrl,
      payer: {
        email: paymentRequest.customerEmail,
        ...(paymentRequest.customerName && {
          first_name: paymentRequest.customerName.split(' ')[0],
          last_name: paymentRequest.customerName.split(' ').slice(1).join(' ') || paymentRequest.customerName.split(' ')[0]
        })
      }
    };
    
    console.log('Webhook URL configured:', webhookUrl);

    // Configurar de acordo com o método de pagamento
    if (paymentRequest.paymentMethod === 'pix') {
      paymentBody.payment_method_id = 'pix';
    } else if (paymentRequest.paymentMethod === 'ticket') {
      paymentBody.payment_method_id = 'bolbradesco';
    } else if (paymentRequest.paymentMethod === 'credit_card' && paymentRequest.cardData) {
      // Para cartão de crédito, seria necessário gerar o token no frontend
      // Por enquanto, vamos retornar um erro informando que precisa implementar
      throw new Error('Pagamento com cartão requer integração do Mercado Pago SDK no frontend para gerar o card token');
    }

    // Criar pagamento no Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify(paymentBody)
    });

    const mpData = await mpResponse.json();
    console.log('Mercado Pago response:', mpData);

    if (!mpResponse.ok) {
      throw new Error(`Mercado Pago error: ${JSON.stringify(mpData)}`);
    }

    // Salvar pedido no banco
    const orderData: any = {
      product_id: paymentRequest.productId,
      product_name: paymentRequest.productName,
      product_price: paymentRequest.productPrice,
      customer_email: paymentRequest.customerEmail,
      customer_name: paymentRequest.customerName,
      payment_method: paymentRequest.paymentMethod,
      payment_status: mpData.status,
      payment_id: mpData.id.toString(),
      transaction_amount: paymentRequest.productPrice,
      pix_qr_code: mpData.point_of_interaction?.transaction_data?.qr_code || null,
      pix_qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      ticket_url: mpData.transaction_details?.external_resource_url || null,
      user_id: paymentRequest.userId || null,
      seller_id: paymentRequest.sellerId || null,
      seller_name: paymentRequest.sellerName || null
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw orderError;
    }

    console.log('Order created successfully:', order.id);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        paymentId: mpData.id,
        status: mpData.status,
        pixQrCode: mpData.point_of_interaction?.transaction_data?.qr_code,
        pixQrCodeBase64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
        ticketUrl: mpData.transaction_details?.external_resource_url,
        approvedUrl: mpData.point_of_interaction?.transaction_data?.ticket_url
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error in create-payment:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
