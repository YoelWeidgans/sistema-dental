'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import NavegacionPersonalizada from '@/components/NavegacionPersonalizada'

const supabase = createClient()

export default function HomePage() {
  const [estadisticas, setEstadisticas] = useState({
    totalPacientes: 0,
    citasHoy: 0,
    ingresosMes: 0,
    citasPendientes: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarEstadisticas()
  }, [])

  const cargarEstadisticas = async () => {
    try {
      // Cargar estadísticas básicas
      const { data: pacientes } = await supabase
        .from('pacientes')
        .select('id')

      const hoy = new Date().toISOString().split('T')[0]
      const { data: citasHoy } = await supabase
        .from('citas')
        .select('id')
        .eq('fecha_cita', hoy)
        .eq('estado', 'confirmada')

      const { data: citasPendientes } = await supabase
        .from('citas')
        .select('id')
        .eq('estado', 'confirmada')
        .gte('fecha_cita', hoy)

      setEstadisticas({
        totalPacientes: pacientes?.length || 0,
        citasHoy: citasHoy?.length || 0,
        ingresosMes: 0, // Puedes calcular esto después
        citasPendientes: citasPendientes?.length || 0
      })
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavegacionPersonalizada paginaActual="inicio" />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Principal</h1>
            <p className="text-gray-600">Bienvenido al sistema de gestión dental</p>
          </div>

          {/* Estadísticas principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">👥</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Pacientes
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {estadisticas.totalPacientes}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">📅</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Citas Hoy
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {estadisticas.citasHoy}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">💰</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Ingresos Mes
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ${estadisticas.ingresosMes.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">⏰</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Citas Pendientes
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {estadisticas.citasPendientes}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enlaces rápidos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Accesos Rápidos</h3>
                <div className="space-y-3">
                  <a href="/citas" className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <div className="flex items-center">
                      <span className="text-blue-600 mr-3">📅</span>
                      <span className="text-blue-800 font-medium">Gestionar Citas</span>
                    </div>
                  </a>
                  <a href="/agenda" className="block p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <div className="flex items-center">
                      <span className="text-green-600 mr-3">🌐</span>
                      <span className="text-green-800 font-medium">Agenda Online</span>
                    </div>
                  </a>
                  <a href="/pagos" className="block p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                    <div className="flex items-center">
                      <span className="text-purple-600 mr-3">💰</span>
                      <span className="text-purple-800 font-medium">Sistema de Caja</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">WhatsApp</h3>
                <div className="space-y-3">
                  <a href="/recordatorios-whatsapp" className="block p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <div className="flex items-center">
                      <span className="text-green-600 mr-3">📱</span>
                      <span className="text-green-800 font-medium">Recordatorios WhatsApp</span>
                    </div>
                  </a>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-yellow-600 mr-3">⚡</span>
                      <span className="text-yellow-800 text-sm">Modo Simulación Activo</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Reportes</h3>
                <div className="space-y-3">
                  <a href="/analytics" className="block p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                    <div className="flex items-center">
                      <span className="text-indigo-600 mr-3">📊</span>
                      <span className="text-indigo-800 font-medium">Analytics</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
