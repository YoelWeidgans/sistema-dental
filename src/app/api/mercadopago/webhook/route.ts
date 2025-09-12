// Crear archivo: src/app/api/mercadopago/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Webhook recibido:', body);

    // MercadoPago envía diferentes tipos de notificaciones
    if (body.type === 'payment') {
      const paymentId = body.data.id;
      
      if (!paymentId) {
        return NextResponse.json({ success: false, error: 'Payment ID no encontrado' });
      }

      // Obtener información del pago desde la cuota usando external_reference
      const cuotaId = body.external_reference;
      
      if (!cuotaId) {
        console.log('External reference no encontrada');
        return NextResponse.json({ success: true }); // No procesar si no hay referencia
      }

      // Buscar la cuota para obtener el user_id
      const { data: cuotaData, error: cuotaError } = await supabase
        .from('cuotas')
        .select(`
          *,
          plan_pago:planes_pago!inner(
            tratamiento:tratamientos!inner(
              paciente:pacientes!inner(
                user_id
              )
            )
          )
        `)
        .eq('id', cuotaId)
        .single();

      if (cuotaError || !cuotaData) {
        console.log('Cuota no encontrada:', cuotaError);
        return NextResponse.json({ success: false, error: 'Cuota no encontrada' });
      }

      const userId = cuotaData.plan_pago.tratamiento.paciente.user_id;

      // Obtener credenciales del usuario
      const { data: configData, error: configError } = await supabase
        .from('mercadopago_config')
        .select('access_token')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (configError || !configData) {
        console.log('Configuración MercadoPago no encontrada:', configError);
        return NextResponse.json({ success: false, error: 'Config no encontrada' });
      }

      // Configurar cliente MercadoPago con credenciales del usuario
      const client = new MercadoPagoConfig({
        accessToken: configData.access_token,
      });

      // Obtener detalles del pago desde MercadoPago
      const payment = new Payment(client);
      const paymentInfo = await payment.get({ id: paymentId });
      
      if (paymentInfo.status === 'approved') {
        // El pago fue aprobado, actualizar la cuota
        const { error: updateError } = await supabase
          .from('cuotas')
          .update({
            estado: 'pagado',
            fecha_pago: new Date().toISOString().split('T')[0],
            mercadopago_payment_id: paymentId,
            notas: `Pago procesado por MercadoPago. ID: ${paymentId}. Método: ${paymentInfo.payment_method_id}`
          })
          .eq('id', cuotaId);
          
        if (updateError) {
          console.error('Error actualizando cuota:', updateError);
          return NextResponse.json({ success: false, error: 'Error actualizando cuota' });
        }

        // Log de la transacción
        await supabase
          .from('mercadopago_transactions')
          .insert({
            user_id: userId,
            cuota_id: cuotaId,
            payment_id: paymentId,
            status: paymentInfo.status,
            amount: paymentInfo.transaction_amount,
            payment_method: paymentInfo.payment_method_id,
            webhook_data: body
          });
        
        console.log(`Cuota ${cuotaId} marcada como pagada`);
      }
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error procesando webhook:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}