// Crear archivo: src/app/api/mercadopago/preference/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { cuotaId, monto, concepto, pacienteEmail, pacienteNombre, userId } = await request.json();

    // Validar datos requeridos
    if (!cuotaId || !monto || !userId) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Obtener credenciales del usuario desde la base de datos
    const { data: configData, error: configError } = await supabase
      .from('mercadopago_config')
      .select('access_token, is_sandbox')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (configError || !configData) {
      return NextResponse.json(
        { success: false, error: 'MercadoPago no configurado. Ve a Configuración para agregar tus credenciales.' },
        { status: 400 }
      );
    }

    // Configurar MercadoPago con las credenciales del usuario
    const client = new MercadoPagoConfig({
      accessToken: configData.access_token,
    });

    const preference = new Preference(client);

    // Crear preferencia de pago
    const preferenceData = {
      items: [
        {
          id: cuotaId,
          title: concepto || 'Cuota de tratamiento dental',
          quantity: 1,
          unit_price: parseFloat(monto.toString()),
          currency_id: 'ARS',
        }
      ],
      payer: {
        name: pacienteNombre || 'Paciente',
        email: pacienteEmail || 'paciente@email.com',
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL}/pago/exito`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/pago/error`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/pago/pendiente`,
      },
      auto_return: 'approved',
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mercadopago/webhook`,
      external_reference: cuotaId,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
      statement_descriptor: 'CONSULTORIO DENTAL',
    };

    const response = await preference.create({ body: preferenceData });

    // Guardar preference_id en la cuota
    await supabase
      .from('cuotas')
      .update({ mercadopago_preference_id: response.id })
      .eq('id', cuotaId);

    // Log de la transacción
    await supabase
      .from('mercadopago_transactions')
      .insert({
        user_id: userId,
        cuota_id: cuotaId,
        preference_id: response.id,
        status: 'created',
        amount: parseFloat(monto.toString())
      });

    return NextResponse.json({
      success: true,
      preference_id: response.id,
      init_point: configData.is_sandbox ? response.sandbox_init_point : response.init_point,
      is_sandbox: configData.is_sandbox
    });

  } catch (error) {
    console.error('Error creando preferencia MercadoPago:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}