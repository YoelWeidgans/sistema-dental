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
  direccion: string
  created_at: string
}

interface HistoriaClinica {
  id: string
  paciente_id: string
  fecha_creacion: string
  motivo_consulta: string
  antecedentes_medicos: string
  antecedentes_odontologicos: string
  medicamentos_actuales: string
  alergias: string
  habitos: string
  observaciones_generales: string
}

interface Evolucion {
  id: string
  historia_clinica_id: string
  fecha_evolucion: string
  tratamiento_realizado: string
  observaciones: string
  proxima_cita: string
  estado_dental: string
}

const supabase = createClient()

export default function Pacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [historias, setHistorias] = useState<HistoriaClinica[]>([])
  const [evoluciones, setEvoluciones] = useState<Evolucion[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)
  const [mostrarModalHistoria, setMostrarModalHistoria] = useState(false)
  const [mostrarModalVerHistoria, setMostrarModalVerHistoria] = useState(false)
  const [mostrarModalEvolucion, setMostrarModalEvolucion] = useState(false)
  const [pacienteEditando, setPacienteEditando] = useState<Paciente | null>(null)
  const [historiaSeleccionada, setHistoriaSeleccionada] = useState<HistoriaClinica | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [nuevoPaciente, setNuevoPaciente] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    fecha_nacimiento: '',
    direccion: ''
  })
  const [nuevaHistoria, setNuevaHistoria] = useState({
    paciente_id: '',
    motivo_consulta: '',
    antecedentes_medicos: '',
    antecedentes_odontologicos: '',
    medicamentos_actuales: '',
    alergias: '',
    habitos: '',
    observaciones_generales: ''
  })
  const [nuevaEvolucion, setNuevaEvolucion] = useState({
    fecha_evolucion: new Date().toISOString().split('T')[0],
    tratamiento_realizado: '',
    observaciones: '',
    proxima_cita: '',
    estado_dental: 'bueno',
    crear_cita: false,
    fecha_proxima_cita: '',
    hora_proxima_cita: '',
    duracion_proxima_cita: '30'
  })

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR')
  }

  const calcularEdad = (fechaNacimiento: string) => {
    const hoy = new Date()
    const nacimiento = new Date(fechaNacimiento)
    let edad = hoy.getFullYear() - nacimiento.getFullYear()
    const mes = hoy.getMonth() - nacimiento.getMonth()
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--
    }
    return edad
  }

  const obtenerPacientes = async () => {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .order('apellido', { ascending: true })
    
    if (error) {
      console.error('Error al obtener pacientes:', error)
    } else {
      setPacientes(data || [])
    }
  }

  const obtenerHistorias = async () => {
    const { data, error } = await supabase
      .from('historias_clinicas')
      .select('*')
    
    if (error) {
      console.error('Error al obtener historias:', error)
    } else {
      setHistorias(data || [])
    }
  }

  const obtenerEvoluciones = async (historiaId: string) => {
    const { data, error } = await supabase
      .from('evoluciones')
      .select('*')
      .eq('historia_clinica_id', historiaId)
      .order('fecha_evolucion', { ascending: false })
    
    if (error) {
      console.error('Error al obtener evoluciones:', error)
    } else {
      setEvoluciones(data || [])
    }
  }

  useEffect(() => {
    obtenerPacientes()
    obtenerHistorias()
  }, [])

  const guardarPaciente = async () => {
    try {
      if (pacienteEditando) {
        const { error } = await supabase
          .from('pacientes')
          .update(nuevoPaciente)
          .eq('id', pacienteEditando.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('pacientes')
          .insert([nuevoPaciente])
        
        if (error) throw error
      }
      
      obtenerPacientes()
      cerrarModal()
    } catch (error) {
      console.error('Error al guardar paciente:', error)
      alert('Error al guardar paciente')
    }
  }

  const crearHistoriaClinica = async () => {
    try {
      const { data, error } = await supabase
        .from('historias_clinicas')
        .insert([nuevaHistoria])
        .select()
      
      if (error) throw error
      
      obtenerHistorias()
      setMostrarModalHistoria(false)
      setNuevaHistoria({
        paciente_id: '',
        motivo_consulta: '',
        antecedentes_medicos: '',
        antecedentes_odontologicos: '',
        medicamentos_actuales: '',
        alergias: '',
        habitos: '',
        observaciones_generales: ''
      })
      alert('Historia clínica creada correctamente')
    } catch (error) {
      console.error('Error al crear historia:', error)
      alert('Error al crear historia clínica')
    }
  }

  const agregarEvolucion = async () => {
    try {
      if (!historiaSeleccionada) return
      
      // Crear evolución
      const evolucionData = {
        historia_clinica_id: historiaSeleccionada.id,
        fecha_evolucion: nuevaEvolucion.fecha_evolucion,
        tratamiento_realizado: nuevaEvolucion.tratamiento_realizado,
        observaciones: nuevaEvolucion.observaciones,
        proxima_cita: nuevaEvolucion.proxima_cita,
        estado_dental: nuevaEvolucion.estado_dental
      }
      
      const { error: errorEvolucion } = await supabase
        .from('evoluciones')
        .insert([evolucionData])
      
      if (errorEvolucion) throw errorEvolucion
      
      // Si marcó crear cita, crear la cita también
      if (nuevaEvolucion.crear_cita && nuevaEvolucion.fecha_proxima_cita && nuevaEvolucion.hora_proxima_cita) {
        console.log('Intentando crear cita con datos:', {
          paciente_id: historiaSeleccionada.paciente_id,
          fecha_cita: nuevaEvolucion.fecha_proxima_cita,
          hora_cita: nuevaEvolucion.hora_proxima_cita,
          duracion: parseInt(nuevaEvolucion.duracion_proxima_cita),
          notas: `Cita programada desde evolución: ${nuevaEvolucion.tratamiento_realizado}`
        })
        
        const citaData = {
          paciente_id: historiaSeleccionada.paciente_id,
          fecha_cita: nuevaEvolucion.fecha_proxima_cita,
          hora_cita: nuevaEvolucion.hora_proxima_cita + ':00',
          duracion: parseInt(nuevaEvolucion.duracion_proxima_cita),
          notas: `Cita programada desde evolución: ${nuevaEvolucion.tratamiento_realizado}`
        }
        
        const { data: citaCreada, error: errorCita } = await supabase
          .from('citas')
          .insert([citaData])
          .select()
        
        console.log('Resultado crear cita:', { citaCreada, errorCita })
        
        if (errorCita) {
          console.error('Error detallado al crear cita:', errorCita)
          alert(`Evolución guardada, pero hubo un error al crear la cita: ${errorCita.message}`)
        } else {
          console.log('Cita creada exitosamente:', citaCreada)
        }
      }
      
      obtenerEvoluciones(historiaSeleccionada.id)
      setMostrarModalEvolucion(false)
      setNuevaEvolucion({
        fecha_evolucion: new Date().toISOString().split('T')[0],
        tratamiento_realizado: '',
        observaciones: '',
        proxima_cita: '',
        estado_dental: 'bueno',
        crear_cita: false,
        fecha_proxima_cita: '',
        hora_proxima_cita: '',
        duracion_proxima_cita: '30'
      })
      
      if (nuevaEvolucion.crear_cita) {
        alert('Evolución guardada y cita creada correctamente')
      } else {
        alert('Evolución guardada correctamente')
      }
    } catch (error) {
      console.error('Error al agregar evolución:', error)
      alert('Error al agregar evolución')
    }
  }

  const eliminarPaciente = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este paciente?')) {
      try {
        const { error } = await supabase
          .from('pacientes')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        obtenerPacientes()
        obtenerHistorias()
        alert('Paciente eliminado correctamente')
      } catch (error) {
        console.error('Error al eliminar paciente:', error)
        alert('Error al eliminar paciente')
      }
    }
  }

  const abrirModal = (paciente?: Paciente) => {
    if (paciente) {
      setPacienteEditando(paciente)
      setNuevoPaciente({
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        telefono: paciente.telefono,
        email: paciente.email,
        fecha_nacimiento: paciente.fecha_nacimiento,
        direccion: paciente.direccion
      })
    } else {
      setPacienteEditando(null)
      setNuevoPaciente({
        nombre: '',
        apellido: '',
        telefono: '',
        email: '',
        fecha_nacimiento: '',
        direccion: ''
      })
    }
    setMostrarModal(true)
  }

  const cerrarModal = () => {
    setMostrarModal(false)
    setPacienteEditando(null)
  }

  const abrirModalHistoria = (pacienteId: string) => {
    setNuevaHistoria({
      ...nuevaHistoria,
      paciente_id: pacienteId
    })
    setMostrarModalHistoria(true)
  }

  const verHistoriaClinica = (pacienteId: string) => {
    const historia = historias.find(h => h.paciente_id === pacienteId)
    if (historia) {
      setHistoriaSeleccionada(historia)
      obtenerEvoluciones(historia.id)
      setMostrarModalVerHistoria(true)
    }
  }

  const tieneHistoria = (pacienteId: string) => {
    return historias.some(h => h.paciente_id === pacienteId)
  }

  const obtenerEstadoColor = (estado: string) => {
    switch (estado) {
      case 'excelente': return 'text-green-600 bg-green-100'
      case 'bueno': return 'text-blue-600 bg-blue-100'
      case 'regular': return 'text-yellow-600 bg-yellow-100'
      case 'malo': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const pacientesFiltrados = pacientes.filter(paciente =>
    paciente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    paciente.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
    paciente.telefono.includes(busqueda) ||
    paciente.email.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalPacientes = pacientes.length
  const totalHistorias = historias.length
  const pacientesConHistoria = historias.length
  const pacientesSinHistoria = totalPacientes - pacientesConHistoria

  return (
    <div className="min-h-screen bg-gray-50">
      <NavegacionPersonalizada paginaActual="pacientes" />
      
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Pacientes</h1>
            <button
              onClick={() => abrirModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + Nuevo Paciente
            </button>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalPacientes}</div>
              <div className="text-sm text-blue-600">Total Pacientes</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{pacientesConHistoria}</div>
              <div className="text-sm text-green-600">Con Historia</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{pacientesSinHistoria}</div>
              <div className="text-sm text-yellow-600">Sin Historia</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{totalHistorias}</div>
              <div className="text-sm text-purple-600">Historias Clínicas</div>
            </div>
          </div>

          {/* Buscador */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Buscar pacientes por nombre, apellido, teléfono o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Tabla de pacientes */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apellido</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Edad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Registro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Historia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pacientesFiltrados.map((paciente) => (
                  <tr key={paciente.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{paciente.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{paciente.apellido}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{paciente.telefono}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{paciente.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {calcularEdad(paciente.fecha_nacimiento)} años
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatearFecha(paciente.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {tieneHistoria(paciente.id) ? (
                        <button
                          onClick={() => verHistoriaClinica(paciente.id)}
                          className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded-full text-xs font-medium transition-colors"
                        >
                          Ver Historia
                        </button>
                      ) : (
                        <button
                          onClick={() => abrirModalHistoria(paciente.id)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-xs font-medium transition-colors"
                        >
                          Crear Historia
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => abrirModal(paciente)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminarPaciente(paciente.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nuevo/Editar Paciente */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {pacienteEditando ? 'Editar Paciente' : 'Nuevo Paciente'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={nuevoPaciente.nombre}
                  onChange={(e) => setNuevoPaciente({...nuevoPaciente, nombre: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                <input
                  type="text"
                  value={nuevoPaciente.apellido}
                  onChange={(e) => setNuevoPaciente({...nuevoPaciente, apellido: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={nuevoPaciente.telefono}
                  onChange={(e) => setNuevoPaciente({...nuevoPaciente, telefono: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={nuevoPaciente.email}
                  onChange={(e) => setNuevoPaciente({...nuevoPaciente, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={nuevoPaciente.fecha_nacimiento || ''}
                  onChange={(e) => setNuevoPaciente({...nuevoPaciente, fecha_nacimiento: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={nuevoPaciente.direccion}
                  onChange={(e) => setNuevoPaciente({...nuevoPaciente, direccion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={cerrarModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarPaciente}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                {pacienteEditando ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Historia Clínica */}
      {mostrarModalHistoria && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Nueva Historia Clínica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Consulta</label>
                <textarea
                  value={nuevaHistoria.motivo_consulta}
                  onChange={(e) => setNuevaHistoria({...nuevaHistoria, motivo_consulta: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Antecedentes Médicos</label>
                <textarea
                  value={nuevaHistoria.antecedentes_medicos}
                  onChange={(e) => setNuevaHistoria({...nuevaHistoria, antecedentes_medicos: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Antecedentes Odontológicos</label>
                <textarea
                  value={nuevaHistoria.antecedentes_odontologicos}
                  onChange={(e) => setNuevaHistoria({...nuevaHistoria, antecedentes_odontologicos: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medicamentos Actuales</label>
                <textarea
                  value={nuevaHistoria.medicamentos_actuales}
                  onChange={(e) => setNuevaHistoria({...nuevaHistoria, medicamentos_actuales: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label>
                <textarea
                  value={nuevaHistoria.alergias}
                  onChange={(e) => setNuevaHistoria({...nuevaHistoria, alergias: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hábitos</label>
                <textarea
                  value={nuevaHistoria.habitos}
                  onChange={(e) => setNuevaHistoria({...nuevaHistoria, habitos: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Fumar, bruxismo, etc."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones Generales</label>
                <textarea
                  value={nuevaHistoria.observaciones_generales}
                  onChange={(e) => setNuevaHistoria({...nuevaHistoria, observaciones_generales: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setMostrarModalHistoria(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={crearHistoriaClinica}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Crear Historia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Historia Clínica */}
      {mostrarModalVerHistoria && historiaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Historia Clínica</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setMostrarModalEvolucion(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  + Nueva Evolución
                </button>
                <button
                  onClick={() => setMostrarModalVerHistoria(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Información base */}
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Información del Paciente</h4>
                  <p className="text-sm text-blue-800">
                    {pacientes.find(p => p.id === historiaSeleccionada.paciente_id)?.nombre} {' '}
                    {pacientes.find(p => p.id === historiaSeleccionada.paciente_id)?.apellido}
                  </p>
                  <p className="text-xs text-blue-600">
                    Historia creada: {formatearFecha(historiaSeleccionada.fecha_creacion)}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Motivo de Consulta</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {historiaSeleccionada.motivo_consulta || 'No especificado'}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Antecedentes Médicos</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {historiaSeleccionada.antecedentes_medicos || 'Ninguno registrado'}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Antecedentes Odontológicos</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {historiaSeleccionada.antecedentes_odontologicos || 'Ninguno registrado'}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Medicamentos Actuales</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {historiaSeleccionada.medicamentos_actuales || 'Ninguno'}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Alergias</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {historiaSeleccionada.alergias || 'Ninguna conocida'}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Hábitos</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {historiaSeleccionada.habitos || 'Ninguno registrado'}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Observaciones Generales</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {historiaSeleccionada.observaciones_generales || 'Ninguna'}
                  </p>
                </div>
              </div>

              {/* Timeline de evoluciones */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Timeline de Evoluciones</h4>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {evoluciones.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>No hay evoluciones registradas</p>
                      <p className="text-sm">Haz click en "Nueva Evolución" para agregar la primera</p>
                    </div>
                  ) : (
                    evoluciones.map((evolucion) => (
                      <div key={evolucion.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm font-medium text-gray-900">
                            {formatearFecha(evolucion.fecha_evolucion)}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${obtenerEstadoColor(evolucion.estado_dental)}`}>
                            {evolucion.estado_dental}
                          </span>
                        </div>
                        
                        <div className="mb-2">
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Tratamiento Realizado:</h5>
                          <p className="text-sm text-gray-600">{evolucion.tratamiento_realizado}</p>
                        </div>

                        {evolucion.observaciones && (
                          <div className="mb-2">
                            <h5 className="text-sm font-medium text-gray-700 mb-1">Observaciones:</h5>
                            <p className="text-sm text-gray-600">{evolucion.observaciones}</p>
                          </div>
                        )}

                        {evolucion.proxima_cita && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-1">Próxima Cita:</h5>
                            <p className="text-sm text-gray-600">{evolucion.proxima_cita}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Evolución */}
      {mostrarModalEvolucion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Nueva Evolución</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={nuevaEvolucion.fecha_evolucion}
                  onChange={(e) => setNuevaEvolucion({...nuevaEvolucion, fecha_evolucion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tratamiento Realizado</label>
                <textarea
                  value={nuevaEvolucion.tratamiento_realizado}
                  onChange={(e) => setNuevaEvolucion({...nuevaEvolucion, tratamiento_realizado: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe el tratamiento realizado..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado Dental</label>
                <select
                  value={nuevaEvolucion.estado_dental}
                  onChange={(e) => setNuevaEvolucion({...nuevaEvolucion, estado_dental: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="excelente">Excelente</option>
                  <option value="bueno">Bueno</option>
                  <option value="regular">Regular</option>
                  <option value="malo">Malo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={nuevaEvolucion.observaciones}
                  onChange={(e) => setNuevaEvolucion({...nuevaEvolucion, observaciones: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Observaciones adicionales..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Próxima Cita (Recomendación)</label>
                <input
                  type="text"
                  value={nuevaEvolucion.proxima_cita}
                  onChange={(e) => setNuevaEvolucion({...nuevaEvolucion, proxima_cita: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Control en 15 días, continuar tratamiento..."
                />
              </div>

              {/* Sección para programar cita */}
              <div className="border-t pt-4">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="crear_cita"
                    checked={nuevaEvolucion.crear_cita}
                    onChange={(e) => setNuevaEvolucion({...nuevaEvolucion, crear_cita: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="crear_cita" className="ml-2 block text-sm font-medium text-gray-700">
                    Programar próxima cita ahora
                  </label>
                </div>

                {nuevaEvolucion.crear_cita && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                        <input
                          type="date"
                          value={nuevaEvolucion.fecha_proxima_cita}
                          onChange={(e) => setNuevaEvolucion({...nuevaEvolucion, fecha_proxima_cita: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                        <select
                          value={nuevaEvolucion.hora_proxima_cita}
                          onChange={(e) => setNuevaEvolucion({...nuevaEvolucion, hora_proxima_cita: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Seleccionar hora</option>
                          <option value="08:00">08:00</option>
                          <option value="08:15">08:15</option>
                          <option value="08:30">08:30</option>
                          <option value="08:45">08:45</option>
                          <option value="09:00">09:00</option>
                          <option value="09:15">09:15</option>
                          <option value="09:30">09:30</option>
                          <option value="09:45">09:45</option>
                          <option value="10:00">10:00</option>
                          <option value="10:15">10:15</option>
                          <option value="10:30">10:30</option>
                          <option value="10:45">10:45</option>
                          <option value="11:00">11:00</option>
                          <option value="11:15">11:15</option>
                          <option value="11:30">11:30</option>
                          <option value="11:45">11:45</option>
                          <option value="12:00">12:00</option>
                          <option value="12:15">12:15</option>
                          <option value="12:30">12:30</option>
                          <option value="12:45">12:45</option>
                          <option value="13:00">13:00</option>
                          <option value="13:15">13:15</option>
                          <option value="13:30">13:30</option>
                          <option value="13:45">13:45</option>
                          <option value="14:00">14:00</option>
                          <option value="14:15">14:15</option>
                          <option value="14:30">14:30</option>
                          <option value="14:45">14:45</option>
                          <option value="15:00">15:00</option>
                          <option value="15:15">15:15</option>
                          <option value="15:30">15:30</option>
                          <option value="15:45">15:45</option>
                          <option value="16:00">16:00</option>
                          <option value="16:15">16:15</option>
                          <option value="16:30">16:30</option>
                          <option value="16:45">16:45</option>
                          <option value="17:00">17:00</option>
                          <option value="17:15">17:15</option>
                          <option value="17:30">17:30</option>
                          <option value="17:45">17:45</option>
                          <option value="18:00">18:00</option>
                          <option value="18:15">18:15</option>
                          <option value="18:30">18:30</option>
                          <option value="18:45">18:45</option>
                          <option value="19:00">19:00</option>
                          <option value="19:15">19:15</option>
                          <option value="19:30">19:30</option>
                          <option value="19:45">19:45</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
                        <select
                          value={nuevaEvolucion.duracion_proxima_cita}
                          onChange={(e) => setNuevaEvolucion({...nuevaEvolucion, duracion_proxima_cita: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="30">30 minutos</option>
                          <option value="45">45 minutos</option>
                          <option value="60">1 hora</option>
                          <option value="90">1.5 horas</option>
                          <option value="120">2 horas</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setMostrarModalEvolucion(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={agregarEvolucion}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                {nuevaEvolucion.crear_cita ? 'Guardar y Crear Cita' : 'Guardar Evolución'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}