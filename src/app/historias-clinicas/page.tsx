'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import NavegacionPersonalizada from '../../components/NavegacionPersonalizada'

const supabase = createSupabaseClient()

export default function HistoriasClinicas() {
  const [loading, setLoading] = useState(true)
  const [pacientes, setPacientes] = useState<any[]>([])
  const [historias, setHistorias] = useState<any[]>([])
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null)
  const [historiaActual, setHistoriaActual] = useState<any>(null)
  const [evoluciones, setEvoluciones] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('lista')
  const [showModalEvolucion, setShowModalEvolucion] = useState(false)

  const [formHistoria, setFormHistoria] = useState({
    motivo_consulta: '',
    antecedentes_medicos: '',
    antecedentes_odontologicos: '',
    medicamentos_actuales: '',
    alergias: '',
    habitos: '',
    observaciones_generales: ''
  })

  const [formEvolucion, setFormEvolucion] = useState({
    fecha_evolucion: new Date().toISOString().split('T')[0],
    tratamiento_realizado: '',
    observaciones: '',
    proxima_cita: '',
    estado_dental: 'bueno'
  })

  const formatearNumero = (numero: number) => {
    return Math.round(numero).toLocaleString('es-AR')
  }

  const cargarDatos = async () => {
    setLoading(true)
    try {
      // Cargar pacientes
      const { data: pacientesData } = await supabase
        .from('pacientes')
        .select('*')
        .order('nombre')

      // Cargar historias clínicas
      const { data: historiasData } = await supabase
        .from('historias_clinicas')
        .select(`
          *,
          pacientes (
            id,
            nombre,
            apellido,
            telefono,
            email
          )
        `)
        .order('created_at', { ascending: false })

      setPacientes(pacientesData || [])
      setHistorias(historiasData || [])

    } catch (error) {
      console.error('Error cargando datos:', error)
    }
    setLoading(false)
  }

  const cargarEvoluciones = async (historiaId: string) => {
    try {
      const { data: evolucionesData } = await supabase
        .from('evoluciones')
        .select('*')
        .eq('historia_clinica_id', historiaId)
        .order('fecha_evolucion', { ascending: false })

      setEvoluciones(evolucionesData || [])
    } catch (error) {
      console.error('Error cargando evoluciones:', error)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const crearHistoriaClinica = async () => {
    if (!pacienteSeleccionado) {
      alert('Debe seleccionar un paciente')
      return
    }

    try {
      const nuevaHistoria = {
        paciente_id: pacienteSeleccionado.id,
        ...formHistoria
      }

      const { data, error } = await supabase
        .from('historias_clinicas')
        .insert([nuevaHistoria])
        .select()

      if (error) {
        console.error('Error creando historia:', error)
        alert('Error al crear la historia clínica')
      } else {
        console.log('Historia creada exitosamente:', data)
        setActiveTab('lista')
        resetFormHistoria()
        setPacienteSeleccionado(null)
        cargarDatos()
      }
    } catch (error) {
      console.error('Error creando historia:', error)
      alert('Error al crear la historia clínica')
    }
  }

  const agregarEvolucion = async () => {
    if (!historiaActual) return

    try {
      const nuevaEvolucion = {
        historia_clinica_id: historiaActual.id,
        ...formEvolucion
      }

      const { data, error } = await supabase
        .from('evoluciones')
        .insert([nuevaEvolucion])
        .select()

      if (error) {
        console.error('Error agregando evolución:', error)
        alert('Error al agregar la evolución')
      } else {
        console.log('Evolución agregada exitosamente:', data)
        setShowModalEvolucion(false)
        resetFormEvolucion()
        cargarEvoluciones(historiaActual.id)
      }
    } catch (error) {
      console.error('Error agregando evolución:', error)
      alert('Error al agregar la evolución')
    }
  }

  const verHistoria = (historia: any) => {
    setHistoriaActual(historia)
    cargarEvoluciones(historia.id)
    setActiveTab('detalle')
  }

  const resetFormHistoria = () => {
    setFormHistoria({
      motivo_consulta: '',
      antecedentes_medicos: '',
      antecedentes_odontologicos: '',
      medicamentos_actuales: '',
      alergias: '',
      habitos: '',
      observaciones_generales: ''
    })
  }

  const resetFormEvolucion = () => {
    setFormEvolucion({
      fecha_evolucion: new Date().toISOString().split('T')[0],
      tratamiento_realizado: '',
      observaciones: '',
      proxima_cita: '',
      estado_dental: 'bueno'
    })
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'excelente': return 'text-green-600 bg-green-100'
      case 'bueno': return 'text-blue-600 bg-blue-100'
      case 'regular': return 'text-yellow-600 bg-yellow-100'
      case 'malo': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando historias clínicas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavegacionPersonalizada paginaActual="historias" />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Historias Clínicas</h1>
                <p className="text-gray-600">Gestión de fichas médicas y evolución de pacientes</p>
              </div>
              <button
                onClick={() => setActiveTab('nueva')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                + Nueva Historia
              </button>
            </div>
          </div>

          {/* Pestañas */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('lista')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'lista'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Lista de Historias ({historias.length})
              </button>
              {activeTab === 'detalle' && historiaActual && (
                <button
                  onClick={() => setActiveTab('detalle')}
                  className="py-2 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm"
                >
                  {historiaActual.pacientes?.nombre} {historiaActual.pacientes?.apellido}
                </button>
              )}
              {activeTab === 'nueva' && (
                <button
                  onClick={() => setActiveTab('nueva')}
                  className="py-2 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm"
                >
                  Nueva Historia Clínica
                </button>
              )}
            </nav>
          </div>

          {/* Contenido de pestañas */}
          {activeTab === 'lista' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Historias Clínicas Registradas</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {historias.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-gray-500">No hay historias clínicas registradas</p>
                    <button
                      onClick={() => setActiveTab('nueva')}
                      className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Crear la primera historia clínica
                    </button>
                  </div>
                ) : (
                  historias.map((historia) => (
                    <div key={historia.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900">
                                {historia.pacientes?.nombre} {historia.pacientes?.apellido}
                              </h4>
                              <p className="text-sm text-gray-500">
                                Tel: {historia.pacientes?.telefono} | Email: {historia.pacientes?.email}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Motivo consulta:</span> {historia.motivo_consulta || 'No especificado'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Creada: {formatearFecha(historia.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => verHistoria(historia)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium"
                          >
                            Ver Historia
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'nueva' && (
            <div className="space-y-6">
              {/* Selección de paciente */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">1. Seleccionar Paciente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pacientes.map((paciente) => (
                    <div
                      key={paciente.id}
                      onClick={() => setPacienteSeleccionado(paciente)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        pacienteSeleccionado?.id === paciente.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h4 className="font-medium text-gray-900">{paciente.nombre} {paciente.apellido}</h4>
                      <p className="text-sm text-gray-500">{paciente.telefono}</p>
                      <p className="text-sm text-gray-500">{paciente.email}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulario de historia clínica */}
              {pacienteSeleccionado && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    2. Historia Clínica - {pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Motivo de Consulta</label>
                      <textarea
                        value={formHistoria.motivo_consulta}
                        onChange={(e) => setFormHistoria({...formHistoria, motivo_consulta: e.target.value})}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Describa el motivo principal de la consulta..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Antecedentes Médicos</label>
                        <textarea
                          value={formHistoria.antecedentes_medicos}
                          onChange={(e) => setFormHistoria({...formHistoria, antecedentes_medicos: e.target.value})}
                          rows={4}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Enfermedades, cirugías, hospitalizaciones..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Antecedentes Odontológicos</label>
                        <textarea
                          value={formHistoria.antecedentes_odontologicos}
                          onChange={(e) => setFormHistoria({...formHistoria, antecedentes_odontologicos: e.target.value})}
                          rows={4}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Tratamientos previos, extracciones, ortodoncias..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Medicamentos Actuales</label>
                        <textarea
                          value={formHistoria.medicamentos_actuales}
                          onChange={(e) => setFormHistoria({...formHistoria, medicamentos_actuales: e.target.value})}
                          rows={3}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Lista de medicamentos que toma actualmente..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Alergias</label>
                        <textarea
                          value={formHistoria.alergias}
                          onChange={(e) => setFormHistoria({...formHistoria, alergias: e.target.value})}
                          rows={3}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Alergias a medicamentos, materiales, alimentos..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Hábitos</label>
                      <textarea
                        value={formHistoria.habitos}
                        onChange={(e) => setFormHistoria({...formHistoria, habitos: e.target.value})}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Fumar, bruxismo, morderse las uñas, etc..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Observaciones Generales</label>
                      <textarea
                        value={formHistoria.observaciones_generales}
                        onChange={(e) => setFormHistoria({...formHistoria, observaciones_generales: e.target.value})}
                        rows={4}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Cualquier información adicional relevante..."
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setActiveTab('lista')
                          setPacienteSeleccionado(null)
                          resetFormHistoria()
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={crearHistoriaClinica}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Crear Historia Clínica
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'detalle' && historiaActual && (
            <div className="space-y-6">
              {/* Información del paciente */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {historiaActual.pacientes?.nombre} {historiaActual.pacientes?.apellido}
                    </h3>
                    <p className="text-gray-600">
                      Tel: {historiaActual.pacientes?.telefono} | Email: {historiaActual.pacientes?.email}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Historia creada: {formatearFecha(historiaActual.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModalEvolucion(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    + Nueva Evolución
                  </button>
                </div>
              </div>

              {/* Datos de la historia clínica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Información Clínica</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-700">Motivo de Consulta</h5>
                      <p className="text-gray-600">{historiaActual.motivo_consulta || 'No especificado'}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700">Antecedentes Médicos</h5>
                      <p className="text-gray-600">{historiaActual.antecedentes_medicos || 'Ninguno'}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700">Antecedentes Odontológicos</h5>
                      <p className="text-gray-600">{historiaActual.antecedentes_odontologicos || 'Ninguno'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Información Adicional</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-700">Medicamentos Actuales</h5>
                      <p className="text-gray-600">{historiaActual.medicamentos_actuales || 'Ninguno'}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700">Alergias</h5>
                      <p className="text-gray-600">{historiaActual.alergias || 'Ninguna'}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700">Hábitos</h5>
                      <p className="text-gray-600">{historiaActual.habitos || 'Ninguno'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evoluciones */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="text-lg font-medium text-gray-900">Evoluciones ({evoluciones.length})</h4>
                </div>
                <div className="divide-y divide-gray-200">
                  {evoluciones.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-gray-500">No hay evoluciones registradas</p>
                      <button
                        onClick={() => setShowModalEvolucion(true)}
                        className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Agregar primera evolución
                      </button>
                    </div>
                  ) : (
                    evoluciones.map((evolucion, index) => (
                      <div key={evolucion.id} className="px-6 py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {formatearFecha(evolucion.fecha_evolucion)}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(evolucion.estado_dental)}`}>
                                {evolucion.estado_dental}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <h6 className="font-medium text-gray-700">Tratamiento Realizado</h6>
                                <p className="text-gray-600">{evolucion.tratamiento_realizado}</p>
                              </div>
                              {evolucion.observaciones && (
                                <div>
                                  <h6 className="font-medium text-gray-700">Observaciones</h6>
                                  <p className="text-gray-600">{evolucion.observaciones}</p>
                                </div>
                              )}
                              {evolucion.proxima_cita && (
                                <div>
                                  <h6 className="font-medium text-gray-700">Próxima Cita</h6>
                                  <p className="text-gray-600">{evolucion.proxima_cita}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para nueva evolución */}
      {showModalEvolucion && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Nueva Evolución</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha</label>
                  <input
                    type="date"
                    value={formEvolucion.fecha_evolucion}
                    onChange={(e) => setFormEvolucion({...formEvolucion, fecha_evolucion: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tratamiento Realizado</label>
                  <textarea
                    value={formEvolucion.tratamiento_realizado}
                    onChange={(e) => setFormEvolucion({...formEvolucion, tratamiento_realizado: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Describe el tratamiento realizado..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado Dental</label>
                  <select
                    value={formEvolucion.estado_dental}
                    onChange={(e) => setFormEvolucion({...formEvolucion, estado_dental: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="excelente">Excelente</option>
                    <option value="bueno">Bueno</option>
                    <option value="regular">Regular</option>
                    <option value="malo">Malo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                  <textarea
                    value={formEvolucion.observaciones}
                    onChange={(e) => setFormEvolucion({...formEvolucion, observaciones: e.target.value})}
                    rows={2}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Observaciones adicionales..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Próxima Cita</label>
                  <input
                    type="text"
                    value={formEvolucion.proxima_cita}
                    onChange={(e) => setFormEvolucion({...formEvolucion, proxima_cita: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Ej: Control en 15 días, limpieza en 6 meses..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowModalEvolucion(false)
                    resetFormEvolucion()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={agregarEvolucion}
                  disabled={!formEvolucion.tratamiento_realizado}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Agregar Evolución
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}