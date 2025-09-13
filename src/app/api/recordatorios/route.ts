import { createSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST() {
  console.log('=== INICIO API RECORDATORIOS ===')
  
  const supabase = createSupabaseClient()
  
  try {
    console.log('1. Obteniendo cuotas pendientes...')
    
    // Obtener cuotas pendientes
    const { data: cuotas, error: cuotasError } = await supabase
      .from('cuotas')
      .select('*')
      .eq('estado', 'pendiente')

    console.log('2. Cuotas encontradas:', cuotas?.length || 0)

    if (cuotasError) {
      console.error('Error obteniendo cuotas:', cuotasError)
      return NextResponse.json({ 
        success: false, 
        error: cuotasError.message 
      }, { status: 500 })
    }

    if (!cuotas || cuotas.length === 0) {
      console.log('3. No hay cuotas pendientes')
      return NextResponse.json({ 
        success: true, 
        message: 'No hay cuotas pendientes para procesar',
        recordatoriosCreados: 0 
      })
    }

    console.log('3. Procesando cuotas...')
    let recordatoriosCreados = 0
    const errores = []

    for (const cuota of cuotas) {
      console.log(`Procesando cuota ${cuota.id}...`)
      
      try {
        // Verificar si ya existen recordatorios para esta cuota
        const { data: existentes } = await supabase
          .from('recordatorios')
          .select('id')
          .eq('cuota_id', cuota.id)

        if (existentes && existentes.length > 0) {
          console.log(`Cuota ${cuota.id} ya tiene recordatorios, saltando...`)
          continue
        }

        // Calcular fechas de recordatorios
        const fechaVencimiento = new Date(cuota.fecha_vencimiento)
        
        const recordatoriosParaCrear = [
          {
            cuota_id: cuota.id,
            tipo_recordatorio: 'dias_antes',
            fecha_programada: new Date(fechaVencimiento.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            estado: 'pendiente',
            mensaje: 'Su cuota vence en 7 días'
          },
          {
            cuota_id: cuota.id,
            tipo_recordatorio: 'dias_antes',
            fecha_programada: new Date(fechaVencimiento.getTime() - (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            estado: 'pendiente',
            mensaje: 'Su cuota vence en 3 días'
          },
          {
            cuota_id: cuota.id,
            tipo_recordatorio: 'dias_antes',
            fecha_programada: new Date(fechaVencimiento.getTime() - (1 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            estado: 'pendiente',
            mensaje: 'Su cuota vence mañana'
          },
          {
            cuota_id: cuota.id,
            tipo_recordatorio: 'vencimiento',
            fecha_programada: fechaVencimiento.toISOString().split('T')[0],
            estado: 'pendiente',
            mensaje: 'Su cuota vence hoy'
          },
          {
            cuota_id: cuota.id,
            tipo_recordatorio: 'post_vencimiento',
            fecha_programada: new Date(fechaVencimiento.getTime() + (1 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            estado: 'pendiente',
            mensaje: 'Su cuota está vencida'
          }
        ]

        // Insertar recordatorios
        const { error: insertError } = await supabase
          .from('recordatorios')
          .insert(recordatoriosParaCrear)

        if (insertError) {
          console.error(`Error insertando recordatorios para cuota ${cuota.id}:`, insertError)
          errores.push(`Cuota ${cuota.id}: ${insertError.message}`)
        } else {
          recordatoriosCreados += recordatoriosParaCrear.length
          console.log(`Creados ${recordatoriosParaCrear.length} recordatorios para cuota ${cuota.id}`)
        }

      } catch (error) {
        console.error(`Error procesando cuota ${cuota.id}:`, error)
        errores.push(`Cuota ${cuota.id}: Error interno`)
      }
    }

    console.log(`4. Procesamiento completado. Recordatorios creados: ${recordatoriosCreados}`)

    if (errores.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Errores durante el procesamiento: ${errores.join(', ')}`,
        recordatoriosCreados
      }, { status: 207 }) // 207 Multi-Status
    }

    return NextResponse.json({
      success: true,
      message: `Procesados exitosamente. Se crearon ${recordatoriosCreados} recordatorios para ${cuotas.length} cuotas`,
      recordatoriosCreados
    })

  } catch (error) {
    console.error('Error general en API:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

export async function GET() {
  const supabase = createSupabaseClient()
  
  try {
    // Obtener estadísticas de recordatorios
    const { data: recordatorios, error } = await supabase
      .from('recordatorios')
      .select('estado')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const estadisticas = {
      total: recordatorios?.length || 0,
      enviados: recordatorios?.filter(r => r.estado === 'enviado').length || 0,
      pendientes: recordatorios?.filter(r => r.estado === 'pendiente').length || 0,
      fallidos: recordatorios?.filter(r => r.estado === 'fallido').length || 0
    }

    return NextResponse.json({ success: true, estadisticas })

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}