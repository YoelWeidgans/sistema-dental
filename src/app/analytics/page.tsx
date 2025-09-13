'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import NavegacionPersonalizada from '../../components/NavegacionPersonalizada'

interface MetricasFinancieras {
  ingresos_totales: number
  ingresos_mes: number
  cuotas_pendientes: number
  cuotas_vencidas: number
  tasa_cobranza: number
  pacientes_activos: number
  tratamientos_activos: number
}

interface MovimientoDiario {
  fecha: string
  ingresos: number
  egresos: number
  utilidad: number
}

interface Pago {
  monto: number
  fecha_pago?: string
}

interface Cuota {
  id: number
  monto: number
  total_pagado: number | null
  fecha_vencimiento?: string
}

interface Tratamiento {
  paciente_id: number
  id: number
}

export default function DashboardFinanciero() {
  const [vistActiva, setVistaActiva] = useState('ingresos-egresos')
  const [periodoActivo, setPeriodoActivo] = useState('esta-semana')
  const [metricas, setMetricas] = useState<MetricasFinancieras>({
    ingresos_totales: 0,
    ingresos_mes: 0,
    cuotas_pendientes: 0,
    cuotas_vencidas: 0,
    tasa_cobranza: 0,
    pacientes_activos: 0,
    tratamientos_activos: 0
  })
  const [movimientos, setMovimientos] = useState<MovimientoDiario[]>([])
  const [cargando, setCargando] = useState(true)

  const supabase = createSupabaseClient()

  const periodos = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'esta-semana', label: 'Esta semana' },
    { key: 'este-mes', label: 'Este mes' },
    { key: 'ultimo-mes', label: 'Último mes' },
    { key: 'ultimos-3-meses', label: 'Últimos 3 meses' },
    { key: 'este-año', label: 'Este año' }
  ]

  const vistas = [
    { key: 'ingresos-egresos', label: 'Ingresos y Egresos' },
    { key: 'servicios-vendidos', label: 'Servicios Vendidos' },
    { key: 'cuotas-cobranza', label: 'Cuotas y Cobranza' },
    { key: 'pacientes', label: 'Pacientes' },
    { key: 'reporte-mensual', label: 'Reporte Mensual' }
  ]

  useEffect(() => {
    cargarDatos()
  }, [periodoActivo])

  const obtenerFechasDelPeriodo = () => {
    const hoy = new Date()
    let fechaInicio: Date
    let fechaFin = new Date(hoy)

    switch (periodoActivo) {
      case 'hoy':
        fechaInicio = new Date(hoy)
        break
      case 'esta-semana':
        fechaInicio = new Date(hoy)
        fechaInicio.setDate(hoy.getDate() - hoy.getDay())
        break
      case 'este-mes':
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        break
      case 'ultimo-mes':
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
        fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
        break
      case 'ultimos-3-meses':
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1)
        break
      case 'este-año':
        fechaInicio = new Date(hoy.getFullYear(), 0, 1)
        break
      default:
        fechaInicio = new Date(hoy)
    }

    return {
      inicio: fechaInicio.toISOString().split('T')[0],
      fin: fechaFin.toISOString().split('T')[0]
    }
  }

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const { inicio, fin } = obtenerFechasDelPeriodo()
      
      await Promise.all([
        cargarMetricasFinancieras(inicio, fin),
        cargarMovimientosDiarios(inicio, fin)
      ])
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setCargando(false)
    }
  }

  const cargarMetricasFinancieras = async (fechaInicio: string, fechaFin: string) => {
    try {
      // Calcular ingresos totales de pagos
      const { data: pagos } = await supabase
        .from('pagos')
        .select('monto, fecha_pago')
        .gte('fecha_pago', fechaInicio)
        .lte('fecha_pago', fechaFin)

      const ingresosPeriodo = pagos?.reduce((sum, pago) => sum + pago.monto, 0) || 0

      // Calcular ingresos del mes actual
      const inicioMes = new Date().toISOString().slice(0, 7) + '-01'
      const finMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
      
      const { data: pagosMes } = await supabase
        .from('pagos')
        .select('monto')
        .gte('fecha_pago', inicioMes)
        .lte('fecha_pago', finMes)

      const ingresosMes = pagosMes?.reduce((sum, pago) => sum + pago.monto, 0) || 0

      // Contar cuotas pendientes
      const { data: cuotasPendientes } = await supabase
        .from('cuotas')
        .select('id, monto, total_pagado')
        .eq('estado', 'pendiente')

      const pendientes = cuotasPendientes?.filter(c => (c.total_pagado || 0) < c.monto).length || 0

      // Contar cuotas vencidas
      const hoy = new Date().toISOString().split('T')[0]
      const { data: cuotasVencidas } = await supabase
        .from('cuotas')
        .select('id, monto, total_pagado')
        .eq('estado', 'pendiente')
        .lt('fecha_vencimiento', hoy)

      const vencidas = cuotasVencidas?.filter(c => (c.total_pagado || 0) < c.monto).length || 0

      // Contar pacientes activos (con tratamientos en curso)
      const { data: pacientesActivos } = await supabase
        .from('tratamientos')
        .select('paciente_id')
        .in('estado', ['pendiente', 'en_curso'])

      const pacientesUnicos = new Set(pacientesActivos?.map(t => t.paciente_id)).size

      // Contar tratamientos activos
      const { data: tratamientosActivos } = await supabase
        .from('tratamientos')
        .select('id')
        .in('estado', ['pendiente', 'en_curso'])

      // Calcular tasa de cobranza
      const totalCuotas = cuotasPendientes?.length || 0
      const cuotasPagadas = totalCuotas - pendientes
      const tasaCobranza = totalCuotas > 0 ? Math.round((cuotasPagadas / totalCuotas) * 100) : 0

      setMetricas({
        ingresos_totales: ingresosPeriodo,
        ingresos_mes: ingresosMes,
        cuotas_pendientes: pendientes,
        cuotas_vencidas: vencidas,
        tasa_cobranza: tasaCobranza,
        pacientes_activos: pacientesUnicos,
        tratamientos_activos: tratamientosActivos?.length || 0
      })

    } catch (error) {
      console.error('Error cargando métricas:', error)
    }
  }

  const cargarMovimientosDiarios = async (fechaInicio: string, fechaFin: string) => {
    try {
      // Por ahora simulamos datos - en el futuro integraremos con tabla de egresos
      const movimientosDiarios: MovimientoDiario[] = []
      
      const inicio = new Date(fechaInicio)
      const fin = new Date(fechaFin)
      
      for (let fecha = new Date(inicio); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {
        const fechaStr = fecha.toISOString().split('T')[0]
        
        // Obtener ingresos reales del día
        const { data: pagosDelDia } = await supabase
          .from('pagos')
          .select('monto')
          .eq('fecha_pago', fechaStr)

        const ingresos = pagosDelDia?.reduce((sum, pago) => sum + pago.monto, 0) || 0
        const egresos = 0 // Por implementar cuando tengamos tabla de gastos
        
        movimientosDiarios.push({
          fecha: fechaStr,
          ingresos,
          egresos,
          utilidad: ingresos - egresos
        })
      }

      setMovimientos(movimientosDiarios)
    } catch (error) {
      console.error('Error cargando movimientos:', error)
    }
  }

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(monto)
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    })
  }

  const obtenerColorTasaCobranza = (tasa: number): string => {
    if (tasa >= 80) return 'text-green-600'
    if (tasa >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavegacionPersonalizada paginaActual="analytics" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">Cargando dashboard...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavegacionPersonalizada paginaActual="analytics" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header con filtros */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Financiero</h1>
            
            <div className="flex space-x-4">
              <select
                value={periodoActivo}
                onChange={(e) => setPeriodoActivo(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {periodos.map((periodo) => (
                  <option key={periodo.key} value={periodo.key}>
                    {periodo.label}
                  </option>
                ))}
              </select>

              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Nuevo Ingreso
              </button>
              <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                Nuevo Egreso
              </button>
            </div>
          </div>

          {/* Navegación por pestañas */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {vistas.map((vista) => (
                <button
                  key={vista.key}
                  onClick={() => setVistaActiva(vista.key)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    vistActiva === vista.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {vista.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Ingresos del Período</h3>
            <p className="text-2xl font-bold text-green-600">{formatearMoneda(metricas.ingresos_totales)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {periodos.find(p => p.key === periodoActivo)?.label}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Ingresos del Mes</h3>
            <p className="text-2xl font-bold text-blue-600">{formatearMoneda(metricas.ingresos_mes)}</p>
            <p className="text-xs text-gray-400 mt-1">Septiembre 2025</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Tasa de Cobranza</h3>
            <p className={`text-2xl font-bold ${obtenerColorTasaCobranza(metricas.tasa_cobranza)}`}>
              {metricas.tasa_cobranza}%
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {metricas.cuotas_vencidas} cuotas vencidas
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Pacientes Activos</h3>
            <p className="text-2xl font-bold text-gray-900">{metricas.pacientes_activos}</p>
            <p className="text-xs text-gray-400 mt-1">
              {metricas.tratamientos_activos} tratamientos en curso
            </p>
          </div>
        </div>

        {/* Contenido según vista activa */}
        {vistActiva === 'ingresos-egresos' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de ingresos y egresos */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ingresos y Egresos Diarios</h3>
              <div className="h-64 flex items-end space-x-2">
                {movimientos.slice(-7).map((mov, index) => {
                  const maxMonto = Math.max(...movimientos.map(m => Math.max(m.ingresos, m.egresos)))
                  const alturaIngresos = maxMonto > 0 ? (mov.ingresos / maxMonto) * 200 : 0
                  const alturaEgresos = maxMonto > 0 ? (mov.egresos / maxMonto) * 200 : 0

                  return (
                    <div key={mov.fecha} className="flex-1 flex flex-col items-center">
                      <div className="flex items-end space-x-1 mb-2">
                        <div 
                          className="bg-green-500 w-4 rounded-t"
                          style={{ height: `${alturaIngresos}px` }}
                          title={`Ingresos: ${formatearMoneda(mov.ingresos)}`}
                        ></div>
                        <div 
                          className="bg-red-500 w-4 rounded-t"
                          style={{ height: `${alturaEgresos}px` }}
                          title={`Egresos: ${formatearMoneda(mov.egresos)}`}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        {formatearFecha(mov.fecha)}
                      </p>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                  <span className="text-sm text-gray-600">Ingresos</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                  <span className="text-sm text-gray-600">Egresos</span>
                </div>
              </div>
            </div>

            {/* Resumen financiero */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen Financiero</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Ingresos:</span>
                  <span className="font-medium text-green-600">
                    {formatearMoneda(metricas.ingresos_totales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Egresos:</span>
                  <span className="font-medium text-red-600">$0</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">Utilidad Neta:</span>
                    <span className="font-bold text-blue-600">
                      {formatearMoneda(metricas.ingresos_totales)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium text-gray-900 mb-3">Estado de Cobranzas</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cuotas Pendientes:</span>
                    <span className="text-yellow-600">{metricas.cuotas_pendientes}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cuotas Vencidas:</span>
                    <span className="text-red-600">{metricas.cuotas_vencidas}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-900">Tasa de Cobranza:</span>
                    <span className={obtenerColorTasaCobranza(metricas.tasa_cobranza)}>
                      {metricas.tasa_cobranza}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {vistActiva === 'cuotas-cobranza' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Gestión de Cobranza</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{metricas.cuotas_pendientes}</div>
                <div className="text-sm text-gray-600">Cuotas Pendientes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{metricas.cuotas_vencidas}</div>
                <div className="text-sm text-gray-600">Cuotas Vencidas</div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${obtenerColorTasaCobranza(metricas.tasa_cobranza)}`}>
                  {metricas.tasa_cobranza}%
                </div>
                <div className="text-sm text-gray-600">Tasa de Cobranza</div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button 
                onClick={() => window.location.href = '/recordatorios'}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 mr-4"
              >
                Ver Recordatorios
              </button>
              <button 
                onClick={() => window.location.href = '/pagos'}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                Gestionar Pagos
              </button>
            </div>
          </div>
        )}

        {vistActiva === 'pacientes' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Estadísticas de Pacientes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">{metricas.pacientes_activos}</div>
                <div className="text-sm text-gray-600">Pacientes Activos</div>
                <div className="text-xs text-gray-400 mt-1">Con tratamientos en curso</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600">{metricas.tratamientos_activos}</div>
                <div className="text-sm text-gray-600">Tratamientos Activos</div>
                <div className="text-xs text-gray-400 mt-1">En curso o pendientes</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}