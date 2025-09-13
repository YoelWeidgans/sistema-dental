'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import NavegacionPersonalizada from '../../components/NavegacionPersonalizada'

interface Recordatorio {
  id: string
  cuota_id: string
  tipo_recordatorio: string
  fecha_programada: string
  estado: string
  mensaje: string
  created_at: string
}

interface Estadisticas {
  total: number
  enviados: number
  pendientes: number
  fallidos: number
}

export default function RecordatoriosPage() {
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    total: 0,
    enviados: 0,
    pendientes: 0,
    fallidos: 0
  })
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([])
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(true)

  const supabase = createSupabaseClient()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setCargando(true)
      
      // Cargar recordatorios
      const { data: recordatoriosData } = await supabase
        .from('recordatorios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      setRecordatorios(recordatoriosData || [])

      // Calcular estadísticas
      const stats = {
        total: recordatoriosData?.length || 0,
        enviados: recordatoriosData?.filter(r => r.estado === 'enviado').length || 0,
        pendientes: recordatoriosData?.filter(r => r.estado === 'pendiente').length || 0,
        fallidos: recordatoriosData?.filter(r => r.estado === 'fallido').length || 0
      }
      
      setEstadisticas(stats)
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setCargando(false)
    }
  }

  const procesarRecordatorios = async () => {
    setProcesando(true)
    setMensaje('')
    
    try {
      const response = await fetch('/api/recordatorios', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setMensaje(`✅ ${result.message}`)
        cargarDatos() // Recargar datos después del procesamiento
      } else {
        setMensaje(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error de conexión')
    } finally {
      setProcesando(false)
    }
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const obtenerColorEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800'
      case 'enviado': return 'bg-green-100 text-green-800'
      case 'fallido': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const obtenerColorTipo = (tipo: string) => {
    switch (tipo) {
      case 'dias_antes': return 'bg-blue-100 text-blue-800'
      case 'vencimiento': return 'bg-orange-100 text-orange-800'
      case 'post_vencimiento': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavegacionPersonalizada paginaActual="recordatorios" />

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Recordatorios</h1>
          <button
            onClick={procesarRecordatorios}
            disabled={procesando}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {procesando ? 'Procesando...' : 'Procesar Recordatorios'}
          </button>
        </div>

        {/* Mensaje de resultado */}
        {mensaje && (
          <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-blue-800 font-medium">{mensaje}</p>
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">#</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Enviados</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.enviados}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">⏳</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.pendientes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✗</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Fallidos</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.fallidos}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de recordatorios */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="text-lg font-medium text-gray-900">Recordatorios Recientes</h3>
          </div>
          
          {cargando ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">Cargando recordatorios...</p>
            </div>
          ) : recordatorios.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500 text-lg">No hay recordatorios generados</p>
              <p className="text-gray-400 text-sm mt-2">Haz click en "Procesar Recordatorios" para generar recordatorios automáticamente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mensaje
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Programada
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recordatorios.map((recordatorio) => (
                    <tr key={recordatorio.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${obtenerColorTipo(recordatorio.tipo_recordatorio)}`}>
                          {recordatorio.tipo_recordatorio.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{recordatorio.mensaje}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatearFecha(recordatorio.fecha_programada)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${obtenerColorEstado(recordatorio.estado)}`}>
                          {recordatorio.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatearFecha(recordatorio.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}