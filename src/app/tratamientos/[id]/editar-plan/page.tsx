'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Cuota {
  id: string
  numero_cuota: number
  monto: number
  fecha_vencimiento: string
  estado: string
}

export default function EditarPlanPago({ params }: { params: { id: string } }) {
  const [tratamiento, setTratamiento] = useState<any>(null)
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      // Cargar tratamiento con consulta más simple
      const { data: tratamientoData, error: tratamientoError } = await supabase
        .from('tratamientos')
        .select('id, tipo, costo_total, paciente_id')
        .eq('id', params.id)
        .single()

      if (tratamientoError) throw tratamientoError

      // Cargar paciente por separado
      const { data: pacienteData } = await supabase
        .from('pacientes')
        .select('nombre, apellido')
        .eq('id', tratamientoData.paciente_id)
        .single()

      const tratamientoCompleto = {
        ...tratamientoData,
        paciente: pacienteData || { nombre: 'N/A', apellido: '' }
      }
      
      setTratamiento(tratamientoCompleto)

      // Cargar cuotas
      const { data: cuotasData, error: cuotasError } = await supabase
        .from('cuotas')
        .select('id, numero_cuota, monto, fecha_vencimiento, estado')
        .eq('tratamiento_id', params.id)
        .order('numero_cuota', { ascending: true })

      if (cuotasError) throw cuotasError
      setCuotas(cuotasData || [])

    } catch (error) {
      console.error('Error cargando datos:', error)
      alert('Error cargando el plan de pago')
    } finally {
      setCargando(false)
    }
  }

  const actualizarCuota = (index: number, campo: string, valor: any) => {
    const nuevasCuotas = [...cuotas]
    nuevasCuotas[index] = { ...nuevasCuotas[index], [campo]: valor }
    setCuotas(nuevasCuotas)
  }

  const agregarCuota = () => {
    const ultimoNumero = Math.max(...cuotas.map(c => c.numero_cuota), 0)
    const nuevaCuota: Cuota = {
      id: `temp_${Date.now()}`,
      numero_cuota: ultimoNumero + 1,
      monto: 0,
      fecha_vencimiento: '',
      estado: 'pendiente'
    }
    setCuotas([...cuotas, nuevaCuota])
  }

  const eliminarCuota = (index: number) => {
    if (cuotas.length <= 1) {
      alert('Debe haber al menos una cuota')
      return
    }
    const nuevasCuotas = cuotas.filter((_, i) => i !== index)
    setCuotas(nuevasCuotas)
  }

  const guardarCambios = async () => {
    if (!tratamiento) return

    // Validaciones
    if (cuotas.length === 0) {
      alert('Debe haber al menos una cuota')
      return
    }

    for (let i = 0; i < cuotas.length; i++) {
      const cuota = cuotas[i]
      if (!cuota.monto || cuota.monto <= 0) {
        alert(`El monto de la cuota ${i + 1} debe ser mayor a 0`)
        return
      }
      if (!cuota.fecha_vencimiento) {
        alert(`La fecha de vencimiento de la cuota ${i + 1} es obligatoria`)
        return
      }
    }

    setGuardando(true)

    try {
      // Eliminar cuotas existentes que no tienen pagos asociados
      const cuotasExistentes = cuotas.filter(c => !c.id.startsWith('temp_'))
      const idsExistentes = cuotasExistentes.map(c => c.id)

      // Obtener cuotas que se van a eliminar
      const { data: cuotasActuales } = await supabase
        .from('cuotas')
        .select('id')
        .eq('tratamiento_id', params.id)

      const idsActuales = cuotasActuales?.map(c => c.id) || []
      const idsAEliminar = idsActuales.filter(id => !idsExistentes.includes(id))

      // Verificar que las cuotas a eliminar no tengan pagos
      if (idsAEliminar.length > 0) {
        const { data: pagosExistentes } = await supabase
          .from('pagos')
          .select('cuota_id')
          .in('cuota_id', idsAEliminar)

        if (pagosExistentes && pagosExistentes.length > 0) {
          alert('No se pueden eliminar cuotas que ya tienen pagos registrados')
          setGuardando(false)
          return
        }

        // Eliminar recordatorios de las cuotas a eliminar
        await supabase
          .from('recordatorios')
          .delete()
          .in('cuota_id', idsAEliminar)

        // Eliminar cuotas
        await supabase
          .from('cuotas')
          .delete()
          .in('id', idsAEliminar)
      }

      // Actualizar/insertar cuotas
      for (let i = 0; i < cuotas.length; i++) {
        const cuota = cuotas[i]
        
        if (cuota.id.startsWith('temp_')) {
          // Nueva cuota
          const { error } = await supabase
            .from('cuotas')
            .insert({
              tratamiento_id: params.id,
              numero_cuota: cuota.numero_cuota,
              monto: cuota.monto,
              fecha_vencimiento: cuota.fecha_vencimiento,
              estado: 'pendiente'
            })
          
          if (error) throw error
        } else {
          // Cuota existente
          const { error } = await supabase
            .from('cuotas')
            .update({
              numero_cuota: cuota.numero_cuota,
              monto: cuota.monto,
              fecha_vencimiento: cuota.fecha_vencimiento
            })
            .eq('id', cuota.id)
          
          if (error) throw error
        }
      }

      // Actualizar costo total del tratamiento
      const costoTotal = cuotas.reduce((sum, cuota) => sum + cuota.monto, 0)
      await supabase
        .from('tratamientos')
        .update({ costo_total: costoTotal })
        .eq('id', params.id)

      alert('Plan de pago actualizado correctamente')
      router.push('/tratamientos')

    } catch (error) {
      console.error('Error guardando cambios:', error)
      alert('Error al guardar los cambios')
    } finally {
      setGuardando(false)
    }
  }

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(monto)
  }

  const totalPlan = cuotas.reduce((sum, cuota) => sum + cuota.monto, 0)

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">Cargando plan de pago...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!tratamiento) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-red-600">No se encontró el tratamiento</p>
            <button
              onClick={() => router.push('/tratamientos')}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Volver a Tratamientos
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navegación simple sin componente externo */}
      <nav className="bg-blue-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-white text-xl font-bold">Sistema Dental</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="text-white hover:text-gray-200">Inicio</a>
              <a href="/pacientes" className="text-white hover:text-gray-200">Pacientes</a>
              <a href="/tratamientos" className="text-white hover:text-gray-200">Tratamientos</a>
              <a href="/pagos" className="text-white hover:text-gray-200">Pagos</a>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/tratamientos')}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Volver a Tratamientos
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">Editar Plan de Pago</h1>
          <p className="mt-2 text-gray-600">
            {tratamiento.tipo} - {tratamiento.paciente.nombre} {tratamiento.paciente.apellido}
          </p>
          <p className="text-sm text-gray-500">
            Costo original: {formatearMoneda(tratamiento.costo_total)} | 
            Nuevo total: {formatearMoneda(totalPlan)}
          </p>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Cuotas del Plan de Pago</h2>
            <button
              onClick={agregarCuota}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700"
            >
              + Agregar Cuota
            </button>
          </div>

          <div className="space-y-4">
            {cuotas.map((cuota, index) => (
              <div key={cuota.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Cuota #{cuota.numero_cuota}
                    </label>
                    <input
                      type="number"
                      value={cuota.numero_cuota}
                      onChange={(e) => actualizarCuota(index, 'numero_cuota', parseInt(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monto</label>
                    <input
                      type="number"
                      value={cuota.monto}
                      onChange={(e) => actualizarCuota(index, 'monto', parseFloat(e.target.value) || 0)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vencimiento</label>
                    <input
                      type="date"
                      value={cuota.fecha_vencimiento}
                      onChange={(e) => actualizarCuota(index, 'fecha_vencimiento', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => eliminarCuota(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                      disabled={cuotas.length <= 1}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {cuota.estado !== 'pendiente' && (
                  <div className="mt-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      cuota.estado === 'pagado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {cuota.estado === 'pagado' ? 'Pagada' : 'Pago Parcial'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Total del Plan: {formatearMoneda(totalPlan)}
                </p>
                <p className="text-sm text-gray-500">
                  {cuotas.length} cuota{cuotas.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="space-x-3">
                <button
                  onClick={() => router.push('/tratamientos')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarCambios}
                  disabled={guardando}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}