'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import NavegacionPersonalizada from '@/components/NavegacionPersonalizada'

interface EstadisticasDashboard {
  totalPacientes: number
  tratamientosActivos: number
  cuotasPendientes: number
  ingresosMes: number
  recordatoriosPendientes: number
}

interface ConfiguracionEmpresa {
  nombre_empresa: string
  nombre_doctor: string
  especialidad: string
}

export default function DashboardPage() {
  const [estadisticas, setEstadisticas] = useState<EstadisticasDashboard>({
    totalPacientes: 0,
    tratamientosActivos: 0,
    cuotasPendientes: 0,
    ingresosMes: 0,
    recordatoriosPendientes: 0
  })
  const [configuracion, setConfiguracion] = useState<ConfiguracionEmpresa | null>(null)
  const [cargando, setCargando] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setCargando(true)

      // Cargar configuración de la empresa
      const { data: config } = await supabase
        .from('configuracion_empresa')
        .select('nombre_empresa, nombre_doctor, especialidad')
        .single()

      if (config) {
        setConfiguracion(config)
      }

      // Cargar estadísticas
      const [pacientes, tratamientos, cuotas, recordatorios] = await Promise.all([
        supabase.from('pacientes').select('id'),
        supabase.from('tratamientos').select('id, estado').neq('estado', 'completado'),
        supabase.from('cuotas').select('monto, estado, created_at'),
        supabase.from('recordatorios').select('id').eq('estado', 'pendiente')
      ])

      // Calcular ingresos del mes actual
      const fechaActual = new Date()
      const inicioMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1)
      
      const cuotasPagadasMes = cuotas.data?.filter(c => 
        c.estado === 'pagado' && new Date(c.created_at) >= inicioMes
      ) || []
      
      const ingresosMes = cuotasPagadasMes.reduce((sum, c) => sum + (c.monto || 0), 0)

      setEstadisticas({
        totalPacientes: pacientes.data?.length || 0,
        tratamientosActivos: tratamientos.data?.length || 0,
        cuotasPendientes: cuotas.data?.filter(c => c.estado === 'pendiente').length || 0,
        ingresosMes,
        recordatoriosPendientes: recordatorios.data?.length || 0
      })

    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setCargando(false)
    }
  }

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(monto)
  }

  const navegarA = (ruta: string) => {
    window.location.href = ruta
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navegación personalizada */}
      <NavegacionPersonalizada paginaActual="dashboard" />

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header personalizado */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            {configuracion?.nombre_empresa || 'Panel de Control'}
          </h1>
          {configuracion?.nombre_doctor && (
            <p className="text-xl text-gray-600 mt-2">
              {configuracion.nombre_doctor}
              {configuracion.especialidad && (
                <span className="text-gray-500"> - {configuracion.especialidad}</span>
              )}
            </p>
          )}
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('es-AR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {cargando ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando panel de control...</p>
          </div>
        ) : (
          <>
            {/* Tarjetas de estadísticas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">👥</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Pacientes</p>
                    <p className="text-3xl font-bold text-gray-900">{estadisticas.totalPacientes}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🦷</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Tratamientos Activos</p>
                    <p className="text-3xl font-bold text-gray-900">{estadisticas.tratamientosActivos}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💰</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Cuotas Pendientes</p>
                    <p className="text-3xl font-bold text-gray-900">{estadisticas.cuotasPendientes}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📊</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Ingresos del Mes</p>
                    <p className="text-2xl font-bold text-gray-900">{formatearMonto(estadisticas.ingresosMes)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🔔</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Recordatorios del Mes</p>
                    <p className="text-3xl font-bold text-gray-900">{estadisticas.recordatoriosPendientes}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjetas de acceso rápido */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div 
                onClick={() => navegarA('/pacientes')}
                className="bg-white rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-transparent hover:border-blue-500"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">👥</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Gestionar Pacientes</h3>
                  <p className="text-gray-600">Agregar, editar y ver información de pacientes</p>
                </div>
              </div>

              <div 
                onClick={() => navegarA('/tratamientos')}
                className="bg-white rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-transparent hover:border-green-500"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🦷</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Tratamientos</h3>
                  <p className="text-gray-600">Crear planes de pago y gestionar tratamientos</p>
                </div>
              </div>

              <div 
                onClick={() => navegarA('/analytics')}
                className="bg-white rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-transparent hover:border-purple-500"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">📊</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics</h3>
                  <p className="text-gray-600">Reportes financieros y métricas de rendimiento</p>
                </div>
              </div>

              <div 
                onClick={() => navegarA('/recordatorios')}
                className="bg-white rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-transparent hover:border-yellow-500"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔔</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Recordatorios</h3>
                  <p className="text-gray-600">Sistema automático de recordatorios de pago</p>
                </div>
              </div>

              <div 
                onClick={() => navegarA('/citas')}
                className="bg-white rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-transparent hover:border-indigo-500"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">📅</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Agenda de Citas</h3>
                  <p className="text-gray-600">Gestión automática de turnos via WhatsApp</p>
                </div>
              </div>

              <div 
                onClick={() => navegarA('/configuracion')}
                className="bg-white rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-transparent hover:border-gray-500"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">⚙️</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Configuración</h3>
                  <p className="text-gray-600">Personalizar sistema y configuraciones</p>
                </div>
              </div>
            </div>

            {/* Resumen de estado del sistema */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado del Sistema</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-800 font-medium">Sistema Operativo</span>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-blue-800 font-medium">Recordatorios Activos</span>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-purple-800 font-medium">WhatsApp Conectado</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}