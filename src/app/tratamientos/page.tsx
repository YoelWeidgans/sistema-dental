'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Toast from '@/components/Toast'

interface Paciente {
  id: string
  nombre: string
  apellido: string
}

interface Tratamiento {
  id: string
  nombre: string
  descripcion?: string
  costo_total: number
  estado: string
  fecha_inicio?: string
  paciente_id: string
  pacientes?: Paciente
  planes_pago?: PlanPago[]
}

interface PlanPago {
  id: string
  nombre: string
  descripcion?: string
  monto_total: number
  cantidad_cuotas: number
  estado: string
  cuotas?: Cuota[]
}

interface Cuota {
  id?: string
  numero_cuota: number
  monto: string | number
  fecha_vencimiento: string
  concepto: string
  estado?: string
  fecha_pago?: string
}

interface ToastState {
  show: boolean
  message: string
  type: 'success' | 'error' | 'info'
}

export default function TratamientosPage() {
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' })
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    costo_total: '',
    paciente_id: '',
    fecha_inicio: '',
    notas: ''
  })

  // Estados para el plan de pago
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [showPlanView, setShowPlanView] = useState(false)
  const [selectedTratamiento, setSelectedTratamiento] = useState<Tratamiento | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PlanPago | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [planData, setPlanData] = useState({
    nombre: '',
    descripcion: '',
    cuotas: [{
      numero_cuota: 1,
      monto: '',
      fecha_vencimiento: '',
      concepto: ''
    }] as Cuota[]
  })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: 'info' })
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Obtener pacientes
      const { data: pacientesData, error: pacientesError } = await supabase
        .from('pacientes')
        .select('id, nombre, apellido')
        .order('nombre')

      if (pacientesError) {
        console.error('Error:', pacientesError)
        showToast('Error al cargar pacientes', 'error')
      } else {
        setPacientes(pacientesData || [])
      }

      // Obtener tratamientos con información del paciente y planes de pago
      const { data: tratamientosData, error: tratamientosError } = await supabase
        .from('tratamientos')
        .select(`
          *,
          pacientes (
            id,
            nombre,
            apellido
          ),
          planes_pago (
            id,
            nombre,
            descripcion,
            monto_total,
            cantidad_cuotas,
            estado
          )
        `)
        .order('created_at', { ascending: false })

      if (tratamientosError) {
        console.error('Error:', tratamientosError)
        showToast('Error al cargar tratamientos', 'error')
      } else {
        setTratamientos(tratamientosData || [])
      }
    } catch (error) {
      console.error('Error:', error)
      showToast('Error inesperado', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchPlanWithCuotas = async (planId: string) => {
    try {
      const { data: planData, error } = await supabase
        .from('planes_pago')
        .select(`
          *,
          cuotas (
            id,
            numero_cuota,
            monto,
            fecha_vencimiento,
            concepto,
            estado,
            fecha_pago
          )
        `)
        .eq('id', planId)
        .single()

      if (error) {
        throw error
      }

      return planData
    } catch (error) {
      console.error('Error:', error)
      showToast('Error al cargar el plan de pago', 'error')
      return null
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre || !formData.costo_total || !formData.paciente_id) {
      showToast('Nombre, costo y paciente son obligatorios', 'error')
      return
    }

    setFormLoading(true)

    try {
      const { error } = await supabase
        .from('tratamientos')
        .insert([{
          ...formData,
          costo_total: parseFloat(formData.costo_total.replace(/\./g, ''))
        }])

      if (error) {
        console.error('Error:', error)
        showToast('Error al guardar el tratamiento: ' + error.message, 'error')
      } else {
        showToast('Tratamiento creado exitosamente', 'success')
        setFormData({
          nombre: '',
          descripcion: '',
          costo_total: '',
          paciente_id: '',
          fecha_inicio: '',
          notas: ''
        })
        setShowForm(false)
        fetchData()
      }
    } catch (error) {
      console.error('Error:', error)
      showToast('Error inesperado', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  // Funciones para el plan de pago
  const handlePlanPago = async (tratamiento: Tratamiento) => {
    setSelectedTratamiento(tratamiento)
    
    // Verificar si ya tiene un plan de pago
    if (tratamiento.planes_pago && tratamiento.planes_pago.length > 0) {
      // Ya tiene plan, mostrar el plan existente
      const planCompleto = await fetchPlanWithCuotas(tratamiento.planes_pago[0].id)
      if (planCompleto) {
        setSelectedPlan(planCompleto)
        setShowPlanView(true)
      }
    } else {
      // No tiene plan, crear nuevo
      setPlanData({
        nombre: `Plan de pago - ${tratamiento.nombre}`,
        descripcion: '',
        cuotas: [{
          numero_cuota: 1,
          monto: '',
          fecha_vencimiento: '',
          concepto: 'Cuota inicial'
        }]
      })
      setEditMode(false)
      setShowPlanForm(true)
    }
  }

  const handleEditPlan = async () => {
    if (!selectedPlan) return
    
    // Cargar datos del plan para edición
    const cuotasFormateadas = selectedPlan.cuotas?.map(cuota => ({
      id: cuota.id,
      numero_cuota: cuota.numero_cuota,
      monto: cuota.monto.toString(),
      fecha_vencimiento: cuota.fecha_vencimiento,
      concepto: cuota.concepto,
      estado: cuota.estado
    })) || []

    setPlanData({
      nombre: selectedPlan.nombre,
      descripcion: selectedPlan.descripcion || '',
      cuotas: cuotasFormateadas
    })
    
    setEditMode(true)
    setShowPlanView(false)
    setShowPlanForm(true)
  }

  const agregarCuota = () => {
    setPlanData(prev => ({
      ...prev,
      cuotas: [...prev.cuotas, {
        numero_cuota: prev.cuotas.length + 1,
        monto: '',
        fecha_vencimiento: '',
        concepto: ''
      }]
    }))
  }

  const eliminarCuota = (index: number) => {
    if (planData.cuotas.length > 1) {
      setPlanData(prev => ({
        ...prev,
        cuotas: prev.cuotas.filter((_, i) => i !== index).map((cuota, i) => ({
          ...cuota,
          numero_cuota: i + 1
        }))
      }))
    }
  }

  const handleCuotaChange = (index: number, field: string, value: string) => {
    // Si es el campo monto, formatear con puntos de miles
    if (field === 'monto') {
      const numericValue = value.replace(/[^0-9]/g, '')
      const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      setPlanData(prev => ({
        ...prev,
        cuotas: prev.cuotas.map((cuota, i) => 
          i === index ? { ...cuota, [field]: formattedValue } : cuota
        )
      }))
    } else {
      setPlanData(prev => ({
        ...prev,
        cuotas: prev.cuotas.map((cuota, i) => 
          i === index ? { ...cuota, [field]: value } : cuota
        )
      }))
    }
  }

  const handlePlanInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setPlanData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const calcularTotalCuotas = () => {
    return planData.cuotas.reduce((total, cuota) => {
      const monto = typeof cuota.monto === 'string' ? cuota.monto : cuota.monto.toString()
      return total + (parseFloat(monto.replace(/\./g, '')) || 0)
    }, 0)
  }

  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedTratamiento) return

    // Validaciones
    const cuotasValidas = planData.cuotas.filter(c => c.monto && c.fecha_vencimiento)
    if (cuotasValidas.length === 0) {
      showToast('Debe agregar al menos una cuota válida', 'error')
      return
    }

    setPlanLoading(true)

    try {
      if (editMode && selectedPlan) {
        // Actualizar plan existente
        const { error: planError } = await supabase
          .from('planes_pago')
          .update({
            nombre: planData.nombre,
            descripcion: planData.descripcion,
            monto_total: calcularTotalCuotas(),
            cantidad_cuotas: cuotasValidas.length
          })
          .eq('id', selectedPlan.id)

        if (planError) {
          throw planError
        }

        // Eliminar cuotas existentes
        const { error: deleteError } = await supabase
          .from('cuotas')
          .delete()
          .eq('plan_pago_id', selectedPlan.id)

        if (deleteError) {
          throw deleteError
        }

        // Insertar cuotas actualizadas
        const cuotasParaInsertar = cuotasValidas.map(cuota => ({
          plan_pago_id: selectedPlan.id,
          numero_cuota: cuota.numero_cuota,
          monto: typeof cuota.monto === 'string' ? parseFloat(cuota.monto.replace(/\./g, '')) : cuota.monto,
          fecha_vencimiento: cuota.fecha_vencimiento,
          concepto: cuota.concepto || `Cuota ${cuota.numero_cuota}`
        }))

        const { error: cuotasError } = await supabase
          .from('cuotas')
          .insert(cuotasParaInsertar)

        if (cuotasError) {
          throw cuotasError
        }

        showToast('Plan de pago actualizado exitosamente', 'success')
      } else {
        // Crear nuevo plan
        const { data: planCreado, error: planError } = await supabase
          .from('planes_pago')
          .insert([{
            tratamiento_id: selectedTratamiento.id,
            nombre: planData.nombre,
            descripcion: planData.descripcion,
            monto_total: calcularTotalCuotas(),
            cantidad_cuotas: cuotasValidas.length
          }])
          .select()
          .single()

        if (planError) {
          throw planError
        }

        // Crear las cuotas
        const cuotasParaInsertar = cuotasValidas.map(cuota => ({
          plan_pago_id: planCreado.id,
          numero_cuota: cuota.numero_cuota,
          monto: typeof cuota.monto === 'string' ? parseFloat(cuota.monto.replace(/\./g, '')) : cuota.monto,
          fecha_vencimiento: cuota.fecha_vencimiento,
          concepto: cuota.concepto || `Cuota ${cuota.numero_cuota}`
        }))

        const { error: cuotasError } = await supabase
          .from('cuotas')
          .insert(cuotasParaInsertar)

        if (cuotasError) {
          throw cuotasError
        }

        showToast('Plan de pago creado exitosamente', 'success')
      }
      
      setShowPlanForm(false)
      setSelectedTratamiento(null)
      setSelectedPlan(null)
      setEditMode(false)
      fetchData()
      
    } catch (error) {
      console.error('Error:', error)
      showToast('Error al procesar el plan de pago', 'error')
    } finally {
      setPlanLoading(false)
    }
  }

  const marcarCuotaPagada = async (cuotaId: string) => {
    try {
      const { error } = await supabase
        .from('cuotas')
        .update({
          estado: 'pagado',
          fecha_pago: new Date().toISOString().split('T')[0]
        })
        .eq('id', cuotaId)

      if (error) {
        throw error
      }

      showToast('Cuota marcada como pagada', 'success')
      
      // Recargar el plan
      if (selectedPlan) {
        const planActualizado = await fetchPlanWithCuotas(selectedPlan.id)
        if (planActualizado) {
          setSelectedPlan(planActualizado)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      showToast('Error al marcar la cuota como pagada', 'error')
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800'
      case 'en_curso': return 'bg-blue-100 text-blue-800'
      case 'completado': return 'bg-green-100 text-green-800'
      case 'cancelado': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCuotaEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800'
      case 'pagado': return 'bg-green-100 text-green-800'
      case 'vencido': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTienePlan = (tratamiento: Tratamiento) => {
    return tratamiento.planes_pago && tratamiento.planes_pago.length > 0
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Tratamientos y Planes de Pago
          </h1>
          <div className="flex items-center space-x-4">
            <nav className="flex space-x-8 mr-6">
              <button 
                onClick={() => window.location.href = '/dashboard'}
                className="text-gray-600 hover:text-blue-600 font-medium border-b-2 border-transparent hover:border-blue-300 pb-1 transition-all"
              >
                Inicio
              </button>
              <button 
                onClick={() => window.location.href = '/pacientes'}
                className="text-gray-600 hover:text-blue-600 font-medium border-b-2 border-transparent hover:border-blue-300 pb-1 transition-all"
              >
                Pacientes
              </button>
              <button 
                onClick={() => window.location.href = '/tratamientos'}
                className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1"
              >
                Tratamientos
              </button>
              <button className="text-gray-400 font-medium border-b-2 border-transparent pb-1 cursor-not-allowed">
                Citas
              </button>
            </nav>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Nuevo Tratamiento
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Cargando tratamientos...</p>
          </div>
        ) : tratamientos.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">No hay tratamientos registrados</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Crear primer tratamiento
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tratamiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paciente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Costo Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan de Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tratamientos.map((tratamiento) => (
                    <tr key={tratamiento.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {tratamiento.nombre}
                        </div>
                        {tratamiento.descripcion && (
                          <div className="text-sm text-gray-500">
                            {tratamiento.descripcion}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tratamiento.pacientes?.nombre} {tratamiento.pacientes?.apellido}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${tratamiento.costo_total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(tratamiento.estado)}`}>
                          {tratamiento.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTienePlan(tratamiento) ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Plan Activo
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Sin Plan
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => handlePlanPago(tratamiento)}
                          className="text-green-600 hover:text-green-900 mr-3 transition-colors"
                        >
                          {getTienePlan(tratamiento) ? 'Ver Plan' : 'Crear Plan'}
                        </button>
                        <button className="text-blue-600 hover:text-blue-900 mr-3 transition-colors">
                          Editar
                        </button>
                        <button className="text-red-600 hover:text-red-900 transition-colors">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal para crear tratamiento */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-xl font-bold mb-6 text-gray-900">Nuevo Tratamiento</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Tratamiento *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required
                    placeholder="ej. Ortodoncia, Implante, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paciente *
                  </label>
                  <select
                    name="paciente_id"
                    value={formData.paciente_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Seleccionar paciente</option>
                    {pacientes.map((paciente) => (
                      <option key={paciente.id} value={paciente.id}>
                        {paciente.nombre} {paciente.apellido}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo Total *
                  </label>
                  <input
                    type="text"
                    name="costo_total"
                    value={formData.costo_total}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '')
                      const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                      setFormData(prev => ({ ...prev, costo_total: formatted }))
                    }}
                    required
                    placeholder="500.000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    name="fecha_inicio"
                    value={formData.fecha_inicio}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Descripción detallada del tratamiento..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas Adicionales
                </label>
                <textarea
                  name="notas"
                  value={formData.notas}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Observaciones, consideraciones especiales..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {formLoading ? 'Guardando...' : 'Crear Tratamiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para crear/editar plan de pago */}
      {showPlanForm && selectedTratamiento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editMode ? 'Editar Plan de Pago' : 'Crear Plan de Pago'}
                </h2>
                <p className="text-sm text-gray-600">
                  {selectedTratamiento.nombre} - {selectedTratamiento.pacientes?.nombre} {selectedTratamiento.pacientes?.apellido}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Costo del tratamiento</p>
                <p className="text-lg font-bold text-gray-900">
                  ${selectedTratamiento.costo_total.toLocaleString()}
                </p>
              </div>
            </div>
            
            <form onSubmit={handleSubmitPlan} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Plan
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={planData.nombre}
                    onChange={handlePlanInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total de las cuotas
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                    <span className="text-lg font-bold text-green-600">
                      ${calcularTotalCuotas().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={planData.descripcion}
                  onChange={handlePlanInputChange}
                  rows={2}
                  placeholder="Descripción del plan de pago..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Cuotas Personalizadas (A Palabra)
                  </h3>
                  <button
                    type="button"
                    onClick={agregarCuota}
                    className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors text-sm"
                  >
                    + Agregar Cuota
                  </button>
                </div>

                <div className="space-y-4">
                  {planData.cuotas.map((cuota, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Cuota #{cuota.numero_cuota}
                        </label>
                        <input
                          type="text"
                          placeholder="Monto"
                          value={cuota.monto}
                          onChange={(e) => handleCuotaChange(index, 'monto', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Vencimiento
                        </label>
                        <input
                          type="date"
                          value={cuota.fecha_vencimiento}
                          onChange={(e) => handleCuotaChange(index, 'fecha_vencimiento', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Concepto
                        </label>
                        <input
                          type="text"
                          placeholder="ej. Consulta inicial, Brackets, etc."
                          value={cuota.concepto}
                          onChange={(e) => handleCuotaChange(index, 'concepto', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="flex items-end">
                        {planData.cuotas.length > 1 && (
                          <button
                            type="button"
                            onClick={() => eliminarCuota(index)}
                            className="w-full bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowPlanForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={planLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {planLoading ? (editMode ? 'Actualizando...' : 'Creando...') : (editMode ? 'Actualizar Plan' : 'Crear Plan de Pago')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para ver plan existente */}
      {showPlanView && selectedPlan && selectedTratamiento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Plan de Pago</h2>
                <p className="text-sm text-gray-600">
                  {selectedTratamiento.nombre} - {selectedTratamiento.pacientes?.nombre} {selectedTratamiento.pacientes?.apellido}
                </p>
                <p className="text-lg font-medium text-gray-900 mt-2">{selectedPlan.nombre}</p>
                {selectedPlan.descripcion && (
                  <p className="text-sm text-gray-600">{selectedPlan.descripcion}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total del plan</p>
                <p className="text-lg font-bold text-green-600">
                  ${selectedPlan.monto_total.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">{selectedPlan.cantidad_cuotas} cuotas</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Cuotas del Plan</h3>
              <div className="space-y-3">
                {selectedPlan.cuotas?.map((cuota) => (
                  <div key={cuota.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <span className="font-medium text-gray-900">
                          Cuota #{cuota.numero_cuota}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          ${cuota.monto.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-600">
                          Vence: {new Date(cuota.fecha_vencimiento).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{cuota.concepto}</p>
                      {cuota.fecha_pago && (
                        <p className="text-xs text-green-600 mt-1">
                          Pagado el: {new Date(cuota.fecha_pago).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCuotaEstadoColor(cuota.estado || 'pendiente')}`}>
                        {cuota.estado || 'pendiente'}
                      </span>
                      {cuota.estado !== 'pagado' && (
                        <button
                          onClick={() => marcarCuotaPagada(cuota.id!)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                        >
                          Marcar Pagado
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowPlanView(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleEditPlan}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
              >
                Editar Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}