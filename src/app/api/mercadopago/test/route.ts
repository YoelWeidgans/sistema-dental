// Crear archivo: src/app/api/mercadopago/test/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig } from 'mercadopago';

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { success: false, error: 'Access token requerido' },
        { status: 400 }
      );
    }

    // Crear cliente con el access token proporcionado
    const client = new MercadoPagoConfig({
      accessToken: access_token,
    });

    // Hacer una consulta simple para verificar que las credenciales funcionan
    try {
      // Intentar obtener información de la cuenta
      const response = await fetch(`https://api.mercadopago.com/users/me`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        return NextResponse.json({
          success: true,
          message: 'Conexión exitosa con MercadoPago',
          user_info: {
            id: userData.id,
            nickname: userData.nickname,
            country: userData.site_id
          }
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Credenciales inválidas' },
          { status: 400 }
        );
      }
    } catch (apiError) {
      return NextResponse.json(
        { success: false, error: 'Error verificando credenciales' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error probando MercadoPago:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}