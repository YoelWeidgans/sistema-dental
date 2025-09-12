'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import NavegacionPersonalizada from '../../components/NavegacionPersonalizada'

interface RecordatorioCompleto {
  cuota_id: string
  paciente_nombre: string
  paciente_apellido: string
  tratamiento_tipo: string
  monto_cuota: number
  fecha_vencimiento: string
  estado_urgencia: 'proximo' | 'vence_hoy' | 'vencida'
  dias_restantes: number
}

export default function RecordatoriosPage() {
  const [recordatorios, setRecordatorios] = useState<RecordatorioCompleto[]>([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    cargarRecordatorios()
  }, [])

  const cargarRecordatorios = async () => {
    try {
      // Obtener fecha actual
      const hoy = new Date()
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
      
      const inicioMesStr = inicioMes.toISOString().split('T')[0]
      const finMesStr = finMes.toISOString().split('T')[0]

      // Obtener cuotas que vencen este mes
      const { data: cuotas, error } = await supabase
        .from('cuotas')
        .select(`
          id,
          monto,
          fecha_vencimiento,
          estado,
          tratamiento_id
        `)
        .gte('fecha_vencimiento', inicioMesStr)
        .lte('fecha_vencimiento', finMesStr)
        .eq('estado', 'pendiente')
        .order('fecha_vencimiento', { ascending: true })

      if (error) throw error

      // Obtener datos completos para cada cuota
      const recordatoriosCompletos: RecordatorioCompleto[] = []
      
      for (const cuota of cuotas || []) {
        // Obtener tratamiento
        const { data: tratamiento } = await supabase
          .from('tratamientos')
          .select('tipo, paciente_id')
          .eq('id', cuota.tratamiento_id)
          .single()

        if (tratamiento) {
          // Obtener paciente
          const { data: paciente } = await supabase
            .from('pacientes')
            .select('nombre, apellido')
            .eq('id', tratamiento.paciente_id)
            .single()

          if (paciente) {
            // Calcular estado de urgencia
            const fechaVencimiento = new Date(cuota.fecha_vencimiento)
            const hoyDate = new Date()
            const diffTime = fechaVencimiento.getTime() - hoyDate.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            let estadoUrgencia: 'proximo' | 'vence_hoy' | 'vencida'
            if (diffDays < 0) {
              estadoUrgencia = 'vencida'
            } else if (diffDays === 0) {
              estadoUrgencia = 'vence_hoy'
            } else {
              estadoUrgencia = 'proximo'
            }

            recordatoriosCompletos.push({
              cuota_id: cuota.id,
              paciente_nombre: paciente.nombre,
              paciente_apellido: paciente.apellido,
              tratamiento_tipo: tratamiento.tipo,
              monto_cuota: cuota.monto,
              fecha_vencimiento: cuota.fecha_vencimiento,
              estado_urgencia: estadoUrgencia,
              dias_restantes: diffDays
            })
          }
        }
      }

      setRecordatorios(recordatoriosCompletos)
    } catch (error) {
      console.error('Error cargando recordatorios:', error)
    } finally {
      setCargando(false)
    }
  }

  const marcarComoContactado = async (cuotaId: string) => {
    // Aquí se podría agregar lógica para marcar como contactado
    alert('Función de marcar como contactado - Por implementar')
  }

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(monto)
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR')
  }

  const obtenerEstadoColor = (estado: string) => {
    switch (estado) {
      case 'vencida': return 'bg-red-100 text-red-800 border-red-200'
      case 'vence_hoy': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'proximo': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const obtenerTextoEstado = (recordatorio: RecordatorioCompleto) => {
    if (recordatorio.estado_urgencia === 'vencida') {
      return `Vencida hace ${Math.abs(recordatorio.dias_restantes)} día${Math.abs(recordatorio.dias_restantes) !== 1 ? 's' : ''}`
    } else if (recordatorio.estado_urgencia === 'vence_hoy') {
      return 'Vence HOY'
    } else {
      return `Vence en ${recordatorio.dias_restantes} día${recordatorio.dias_restantes !== 1 ? 's' : ''}`
    }
  }

  const mesActual = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavegacionPersonalizada paginaActual="recordatorios" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">Cargando recordatorios...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavegacionPersonalizada paginaActual="recordatorios" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cuotas por Cobrar - {mesActual}</h1>
          <p className="mt-2 text-gray-600">
            Gestiona las cuotas que requieren seguimiento este mes
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Cuotas</h3>
            <p className="text-2xl font-bold text-gray-900">{recordatorios.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Vencidas</h3>
            <p className="text-2xl font-bold text-red-600">
              {recordatorios.filter(r => r.estado_urgencia === 'vencida').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Vencen Hoy</h3>
            <p className="text-2xl font-bold text-orange-600">
              {recordatorios.filter(r => r.estado_urgencia === 'vence_hoy').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Próximas</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {recordatorios.filter(r => r.estado_urgencia === 'proximo').length}
            </p>
          </div>
        </div>

        {/* Lista de recordatorios */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Cuotas que Requieren Atención</h2>
          </div>
          
          {recordatorios.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-gray-500 text-lg">No hay cuotas pendientes este mes</p>
              <p className="text-sm text-gray-400 mt-1">
                Todas las cobranzas están al día
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recordatorios.map((recordatorio) => (
                <div key={recordatorio.cuota_id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {recordatorio.paciente_apellido}, {recordatorio.paciente_nombre}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {recordatorio.tratamiento_tipo} - {formatearMoneda(recordatorio.monto_cuota)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Vencimiento: {formatearFecha(recordatorio.fecha_vencimiento)}
                          </p>
                        </div>
                        
                        <div className={`px-3 py-2 rounded-lg border ${obtenerEstadoColor(recordatorio.estado_urgencia)}`}>
                          <span className="text-sm font-medium">
                            {obtenerTextoEstado(recordatorio)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-6">
                      <button
                        onClick={() => marcarComoContactado(recordatorio.cuota_id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                      >
                        Marcar Contactado
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {recordatorios.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Prioritiza las cuotas vencidas y las que vencen hoy para mejorar el flujo de caja
            </p>
          </div>
        )}
      </div>
    </div>
  )
}