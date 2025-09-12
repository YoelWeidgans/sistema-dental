'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import NavegacionPersonalizada from '../../components/NavegacionPersonalizada'

const supabase = createClient()

export default function AnalyticsMetodoPago() {
  const [loading, setLoading] = useState(true)
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]) // Primer día del mes
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]) // Hoy
  const [tipoVista, setTipoVista] = useState('mes') // 'dia' o 'mes'
  const [ingresosPorMetodo, setIngresosPorMetodo] = useState<any>({})
  const [ingresosPorDia, setIngresosPorDia] = useState<any[]>([])

  useEffect(() => {
    cargarDatos()
  }, [fechaInicio, fechaFin])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      // Cargar pagos en el rango de fechas
      const { data: pagos, error } = await supabase
        .from('pagos')
        .select('*')
        .gte('fecha_pago', fechaInicio)
        .lte('fecha_pago', fechaFin)

      if (error) {
        console.error('Error cargando pagos:', error)
        return
      }

      // Agrupar por método de pago
      const agrupados = pagos?.reduce((acc: any, pago: any) => {
        let metodo = pago.metodo_pago

        // Agrupar métodos similares
        if (metodo === 'galicia_pay') {
          metodo = 'Cuenta Galicia'
        } else if (metodo === 'efectivo') {
          metodo = 'Efectivo'
        } else if (metodo === 'transferencia') {
          metodo = 'Cuenta Galicia'
        } else if (metodo === 'tarjeta_credito' || metodo === 'tarjeta_debito') {
          metodo = 'Otro medio de pago'
        } else {
          metodo = 'Otro medio de pago'
        }

        if (!acc[metodo]) {
          acc[metodo] = 0
        }
        acc[metodo] += parseFloat(pago.monto)
        return acc
      }, {}) || {}

      setIngresosPorMetodo(agrupados)

      // Agrupar por día para vista diaria
      const agrupadosPorDia = pagos?.reduce((acc: any, pago: any) => {
        const fecha = pago.fecha_pago
        if (!acc[fecha]) {
          acc[fecha] = {
            fecha,
            'Cuenta Galicia': 0,
            'Efectivo': 0,
            'Otro medio de pago': 0,
            total: 0
          }
        }

        let metodo = pago.metodo_pago
        if (metodo === 'galicia_pay' || metodo === 'transferencia') {
          metodo = 'Cuenta Galicia'
        } else if (metodo === 'efectivo') {
          metodo = 'Efectivo'
        } else {
          metodo = 'Otro medio de pago'
        }

        acc[fecha][metodo] += parseFloat(pago.monto)
        acc[fecha].total += parseFloat(pago.monto)
        return acc
      }, {}) || {}

      setIngresosPorDia(Object.values(agrupadosPorDia).sort((a: any, b: any) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      ))

    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const totalIngresos = Object.values(ingresosPorMetodo).reduce((sum: number, monto: any) => sum + monto, 0)

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const establecerPeriodo = (periodo: string) => {
    const hoy = new Date()
    
    switch (periodo) {
      case 'hoy':
        setFechaInicio(hoy.toISOString().split('T')[0])
        setFechaFin(hoy.toISOString().split('T')[0])
        break
      case 'semana':
        const inicioSemana = new Date(hoy.setDate(hoy.getDate() - 7))
        setFechaInicio(inicioSemana.toISOString().split('T')[0])
        setFechaFin(new Date().toISOString().split('T')[0])
        break
      case 'mes':
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        setFechaInicio(inicioMes.toISOString().split('T')[0])
        setFechaFin(new Date().toISOString().split('T')[0])
        break
      case 'trimestre':
        const inicioTrimestre = new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1)
        setFechaInicio(inicioTrimestre.toISOString().split('T')[0])
        setFechaFin(new Date().toISOString().split('T')[0])
        break
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavegacionPersonalizada paginaActual="analytics" />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Analytics por Método de Pago</h1>
            <p className="text-gray-600">Distribución de ingresos por forma de pago</p>
          </div>

          {/* Filtros de período */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <h3 className="text-lg font-medium text-gray-900">Período de análisis</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => establecerPeriodo('hoy')}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Hoy
                </button>
                <button
                  onClick={() => establecerPeriodo('semana')}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Última semana
                </button>
                <button
                  onClick={() => establecerPeriodo('mes')}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Este mes
                </button>
                <button
                  onClick={() => establecerPeriodo('trimestre')}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Trimestre
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Desde</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="mt-1 border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Hasta</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="mt-1 border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="flex items-center space-x-4 ml-8">
                <label className="text-sm font-medium text-gray-700">Vista:</label>
                <select
                  value={tipoVista}
                  onChange={(e) => setTipoVista(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="mes">Resumen del período</option>
                  <option value="dia">Detalle por día</option>
                </select>
              </div>
            </div>
          </div>

          {/* Vista resumen del período */}
          {tipoVista === 'mes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Resumen por método */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Ingresos por Método de Pago</h3>
                <div className="space-y-4">
                  {Object.entries(ingresosPorMetodo).map(([metodo, monto]: [string, any]) => {
                    const porcentaje = totalIngresos > 0 ? (monto / totalIngresos * 100).toFixed(1) : 0
                    return (
                      <div key={metodo} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full ${
                            metodo === 'Cuenta Galicia' ? 'bg-blue-500' :
                            metodo === 'Efectivo' ? 'bg-green-500' : 'bg-purple-500'
                          }`}></div>
                          <span className="font-medium text-gray-900">{metodo}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">${monto.toFixed(2)}</p>
                          <p className="text-sm text-gray-500">{porcentaje}%</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">Total del período</span>
                    <span className="font-bold text-xl text-green-600">${totalIngresos.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Gráfico de barras visual */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Distribución Visual</h3>
                <div className="space-y-4">
                  {Object.entries(ingresosPorMetodo).map(([metodo, monto]: [string, any]) => {
                    const porcentaje = totalIngresos > 0 ? (monto / totalIngresos * 100) : 0
                    return (
                      <div key={metodo} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{metodo}</span>
                          <span>${monto.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${
                              metodo === 'Cuenta Galicia' ? 'bg-blue-500' :
                              metodo === 'Efectivo' ? 'bg-green-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${porcentaje}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Vista detalle por día */}
          {tipoVista === 'dia' && (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Detalle por Día</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cuenta Galicia
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Efectivo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Otro medio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total del día
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ingresosPorDia.map((dia: any, index: number) => (
                      <tr key={dia.fecha} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatearFecha(dia.fecha)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                          ${dia['Cuenta Galicia'].toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                          ${dia['Efectivo'].toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-semibold">
                          ${dia['Otro medio de pago'].toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          ${dia.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {ingresosPorDia.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No hay datos para el período seleccionado</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}