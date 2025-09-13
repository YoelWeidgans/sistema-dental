// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'

interface Tratamiento {
  id: string
  tipo: string
  costo_total: number
  pacientes: {
    nombre: string
    apellido: string
  }
}

interface Cuota {
  id: string
  tratamiento_id: string
  numero_cuota: number
  monto: number
  fecha_vencimiento: string
  estado: 'pendiente' | 'pagado' | 'vencido'
  created_at: string
}

export default function PlanPagoPage() {
  const params = useParams()
  const tratamientoId = params.id as string
  
  const [tratamiento, setTratamiento] = useState<Tratamiento | null>(null)
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [cargando, setCargando] = useState(false)

  // Formulario
  const [cantidadCuotas, setCantidadCuotas] = useState('')
  const [montoPorCuota, setMontoPorCuota] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')

  const supabase = createSupabaseClient()

  useEffect(() => {
    if (tratamientoId) {
      cargarTratamiento()
      cargarCuotas()
    }
  }, [tratamientoId])

  const cargarTratamiento = async () => {
    try {
      const { data } = await supabase
        .from('tratamientos')
        .select(`
          id,
          tipo,
          costo_total,
          pacientes (
            nombre,
            apellido
          )
        `)
        .eq('id', tratamientoId)
        .single()

      setTratamiento(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cargarCuotas = async () => {
    try {
      const { data, error } = await supabase
        .from('cuotas')
        .select('*')
        .eq('tratamiento_id', tratamientoId)
        .order('numero_cuota', { ascending: true })

      if (!error) {
        setCuotas(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const crearPlanPago = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)

    try {
      const cantidad = parseInt(cantidadCuotas)
      const monto = parseFloat(montoPorCuota.replace(/\./g, ''))
      const fechaBase = new Date(fechaInicio)

      const cuotasACrear = []
      
      for (let i = 1; i <= cantidad; i++) {
        const fechaVencimiento = new Date(fechaBase)
        fechaVencimiento.setMonth(fechaVencimiento.getMonth() + (i - 1))
        
        cuotasACrear.push({
          tratamiento_id: tratamientoId,
          numero_cuota: i,
          monto: monto,
          fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
          estado: 'pendiente'
        })
      }

      const { error } = await supabase
        .from('cuotas')
        .insert(cuotasACrear)

      if (error) {
        alert(`Error: ${error.message}`)
        return
      }

      alert('Plan de pago creado exitosamente')
      setMostrarFormulario(false)
      setCantidadCuotas('')
      setMontoPorCuota('')
      setFechaInicio('')
      cargarCuotas()
    } catch (error) {
      alert(`Error: ${error}`)
    } finally {
      setCargando(false)
    }
  }

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(monto)
  }

  const formatearNumero = (valor: string) => {
    const soloNumeros = valor.replace(/\D/g, '')
    if (!soloNumeros) return ''
    const numero = parseInt(soloNumeros)
    return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const obtenerColorEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800'
      case 'pagado': return 'bg-green-100 text-green-800'
      case 'vencido': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!tratamiento) {
    return <div className="p-8">Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navegación */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900">Sistema Dental</h1>
              <nav className="flex space-x-8">
                <button onClick={() => window.location.href = '/dashboard'} className="text-gray-600 hover:text-blue-600 font-medium">Inicio</button>
                <button onClick={() => window.location.href = '/pacientes'} className="text-gray-600 hover:text-blue-600 font-medium">Pacientes</button>
                <button onClick={() => window.location.href = '/tratamientos'} className="text-blue-600 font-medium border-b-2 border-blue-500 pb-1">Tratamientos</button>
                <button onClick={() => window.location.href = '/analytics'} className="text-gray-600 hover:text-blue-600 font-medium">Analytics</button>
                <button onClick={() => window.location.href = '/recordatorios'} className="text-gray-600 hover:text-blue-600 font-medium">Recordatorios</button>
                <button onClick={() => window.location.href = '/configuracion'} className="text-gray-600 hover:text-blue-600 font-medium">Configuración</button>
              </nav>
            </div>
            <button onClick={() => window.location.href = '/'} className="text-gray-600 hover:text-red-600 font-medium">Cerrar Sesión</button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button onClick={() => window.location.href = '/tratamientos'} className="text-blue-600 hover:text-blue-800 mb-4">← Volver a Tratamientos</button>
          <h1 className="text-3xl font-bold text-gray-900">Plan de Pago</h1>
          <p className="text-gray-600 mt-2">
            {tratamiento.tipo} - {tratamiento.pacientes?.apellido}, {tratamiento.pacientes?.nombre}
          </p>
          <p className="text-gray-600">Costo total: {formatearMonto(tratamiento.costo_total)}</p>
        </div>

        {/* Botón crear plan */}
        {cuotas.length === 0 && (
          <div className="mb-8">
            <button
              onClick={() => setMostrarFormulario(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Crear Plan de Pago
            </button>
          </div>
        )}

        {/* Formulario */}
        {mostrarFormulario && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Crear Plan de Pago</h2>
                  <button onClick={() => setMostrarFormulario(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>

                <form onSubmit={crearPlanPago} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad de Cuotas</label>
                    <input
                      type="number"
                      value={cantidadCuotas}
                      onChange={(e) => setCantidadCuotas(e.target.value)}
                      min="1"
                      max="60"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monto por Cuota</label>
                    <input
                      type="text"
                      value={formatearNumero(montoPorCuota)}
                      onChange={(e) => setMontoPorCuota(e.target.value.replace(/\D/g, ''))}
                      placeholder="100.000"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primera Cuota Vence</label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <button type="button" onClick={() => setMostrarFormulario(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
                    <button type="submit" disabled={cargando} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                      {cargando ? 'Creando...' : 'Crear Plan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Lista de cuotas */}
        {cuotas.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h3 className="text-lg font-medium text-gray-900">Cuotas del Plan de Pago</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {cuotas.map((cuota) => (
                <div key={cuota.id} className="px-6 py-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900">Cuota #{cuota.numero_cuota}</div>
                    <div className="text-sm text-gray-500">Vence: {new Date(cuota.fecha_vencimiento).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{formatearMonto(cuota.monto)}</div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${obtenerColorEstado(cuota.estado)}`}>
                      {cuota.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}