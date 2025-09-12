'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import NavegacionPersonalizada from '@/components/NavegacionPersonalizada'

interface Paciente {
  id: string
  nombre: string
  apellido: string
  telefono: string
  email: string
  fecha_nacimiento: string
  obra_social: string
  created_at: string
}

interface Tratamiento {
  id: string
  paciente_id: string
  tipo: string
  descripcion: string
  costo_total: number
  estado: 'pendiente' | 'en_curso' | 'completado' | 'cancelado'
  fecha_inicio: string
  notas: string
  created_at: string
  pacientes: Paciente
}

export default function TratamientosPage() {
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [tratamientoEditando, setTratamientoEditando] = useState<Tratamiento | null>(null)

  const [pacienteId, setPacienteId] = useState('')
  const [tipo, setTipo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [costoTotal, setCostoTotal] = useState('')
  const [estado, setEstado] = useState<'pendiente' | 'en_curso' | 'completado' | 'cancelado'>('pendiente')
  const [fechaInicio, setFechaInicio] = useState('')
  const [notas, setNotas] = useState('')

  const supabase = createClient()

  const formatearNumero = (valor: string) => {
    const soloNumeros = valor.replace(/\D/g, '')
    if (!soloNumeros) return ''
    const numero = parseInt(soloNumeros)
    return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const manejarCambioMonto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value
    const soloNumeros = valor.replace(/\D/g, '')
    setCostoTotal(soloNumeros)
  }

  useEffect(() => {
    cargarTratamientos()
    cargarPacientes()
  }, [])

  const cargarTratamientos = async () => {
    try {
      const { data } = await supabase
        .from('tratamientos')
        .select(`
          *,
          pacientes (
            id,
            nombre,
            apellido,
            telefono,
            email,
            fecha_nacimiento,
            obra_social,
            created_at
          )
        `)
        .order('created_at', { ascending: false })

      setTratamientos(data || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cargarPacientes = async () => {
    try {
      const { data } = await supabase
        .from('pacientes')
        .select('*')
        .order('apellido', { ascending: true })

      setPacientes(data || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const limpiarFormulario = () => {
    setPacienteId('')
    setTipo('')
    setDescripcion('')
    setCostoTotal('')
    setEstado('pendiente')
    setFechaInicio('')
    setNotas('')
    setTratamientoEditando(null)
  }

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)

    try {
      if (!pacienteId || !tipo || !costoTotal) {
        alert('Por favor completa todos los campos requeridos')
        setCargando(false)
        return
      }

      const costoNumerico = parseInt(costoTotal) || 0

      const datos = {
        paciente_id: pacienteId,
        nombre: tipo,
        tipo,
        descripcion,
        costo_total: costoNumerico,
        estado,
        fecha_inicio: fechaInicio,
        notas
      }

      const resultado = tratamientoEditando
        ? await supabase.from('tratamientos').update(datos).eq('id', tratamientoEditando.id)
        : await supabase.from('tratamientos').insert([datos])

      if (resultado.error) {
        alert(`Error: ${resultado.error.message}`)
        return
      }

      alert('Tratamiento guardado exitosamente')
      limpiarFormulario()
      setMostrarFormulario(false)
      cargarTratamientos()
    } catch (error) {
      alert(`Error: ${error}`)
    } finally {
      setCargando(false)
    }
  }

  const editarTratamiento = (tratamiento: Tratamiento) => {
    setTratamientoEditando(tratamiento)
    setPacienteId(tratamiento.paciente_id)
    setTipo(tratamiento.tipo)
    setDescripcion(tratamiento.descripcion)
    setCostoTotal(tratamiento.costo_total.toString())
    setEstado(tratamiento.estado)
    setFechaInicio(tratamiento.fecha_inicio ? tratamiento.fecha_inicio.split('T')[0] : '')
    setNotas(tratamiento.notas || '')
    setMostrarFormulario(true)
  }

  const eliminarTratamiento = async (id: string) => {
    if (!confirm('¿Eliminar este tratamiento?')) return

    const { error } = await supabase.from('tratamientos').delete().eq('id', id)
    if (!error) {
      alert('Tratamiento eliminado')
      cargarTratamientos()
    }
  }

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(monto)
  }

  const obtenerColorEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800'
      case 'en_curso': return 'bg-blue-100 text-blue-800'
      case 'completado': return 'bg-green-100 text-green-800'
      case 'cancelado': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavegacionPersonalizada paginaActual="tratamientos" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Tratamientos</h1>
          <button 
            onClick={() => { limpiarFormulario(); setMostrarFormulario(true) }} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            + Nuevo Tratamiento
          </button>
        </div>

        {mostrarFormulario && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{tratamientoEditando ? 'Editar' : 'Nuevo'} Tratamiento</h2>
                  <button onClick={() => setMostrarFormulario(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>

                <form onSubmit={manejarSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Paciente *</label>
                    <select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Seleccionar paciente</option>
                      {pacientes.map((paciente) => (
                        <option key={paciente.id} value={paciente.id}>{paciente.apellido}, {paciente.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Tratamiento *</label>
                    <input type="text" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Ej: Blanqueamiento" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                    <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Costo Total *</label>
                    <input type="text" value={formatearNumero(costoTotal)} onChange={manejarCambioMonto} placeholder="1.000.000" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                    <select value={estado} onChange={(e) => setEstado(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="pendiente">Pendiente</option>
                      <option value="en_curso">En Curso</option>
                      <option value="completado">Completado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Inicio</label>
                    <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
                    <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>

                  <div className="flex justify-end space-x-4 pt-6">
                    <button type="button" onClick={() => setMostrarFormulario(false)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
                    <button type="submit" disabled={cargando} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{cargando ? 'Guardando...' : 'Guardar'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="grid grid-cols-6 gap-4 text-sm font-medium text-gray-500 uppercase">
              <div>Paciente</div>
              <div>Tratamiento</div>
              <div>Costo Total</div>
              <div>Estado</div>
              <div>Plan de Pago</div>
              <div>Acciones</div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {tratamientos.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">🦷</div>
                <p className="text-gray-500 text-lg">No hay tratamientos registrados</p>
                <button
                  onClick={() => { limpiarFormulario(); setMostrarFormulario(true) }}
                  className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Crear el primer tratamiento
                </button>
              </div>
            ) : (
              tratamientos.map((tratamiento) => (
                <div key={tratamiento.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="grid grid-cols-6 gap-4 items-center">
                    <div>
                      <div className="font-medium text-gray-900">{tratamiento.pacientes?.apellido}, {tratamiento.pacientes?.nombre}</div>
                      <div className="text-sm text-gray-500">{tratamiento.pacientes?.obra_social}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{tratamiento.tipo}</div>
                      <div className="text-sm text-gray-500">{tratamiento.descripcion}</div>
                    </div>
                    <div className="font-medium text-gray-900">{formatearMonto(tratamiento.costo_total)}</div>
                    <div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${obtenerColorEstado(tratamiento.estado)}`}>
                        {tratamiento.estado}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <button 
                        onClick={() => window.location.href = `/tratamientos/${tratamiento.id}/plan-pago`} 
                        className="block text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Ver Plan
                      </button>
                      <button 
                        onClick={() => window.location.href = `/tratamientos/${tratamiento.id}/editar-plan`} 
                        className="block text-green-600 hover:text-green-800 font-medium text-sm"
                      >
                        Editar Plan
                      </button>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => editarTratamiento(tratamiento)} className="text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                      <button onClick={() => eliminarTratamiento(tratamiento.id)} className="text-red-600 hover:text-red-800 font-medium">Eliminar</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}