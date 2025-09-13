'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import NavegacionPersonalizada from '../../components/NavegacionPersonalizada'

const supabase = createSupabaseClient()

export default function CitasPage() {
  // Estados principales
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [citas, setCitas] = useState<any[]>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todas')
  
  // Estados para modal
  const [showModalCita, setShowModalCita] = useState(false)
  const [citaEditando, setCitaEditando] = useState<any>(null)
  const [creandoNuevoPaciente, setCreandoNuevoPaciente] = useState(false)
  const [horariosLibres, setHorariosLibres] = useState<string[]>([])
  
  // Horarios del consultorio
  const horariosConsultorio = [
    '08:00', '08:15', '08:30', '08:45',
    '09:00', '09:15', '09:30', '09:45',
    '10:00', '10:15', '10:30', '10:45',
    '11:00', '11:15', '11:30', '11:45',
    '12:00', '12:15', '12:30', '12:45',
    '13:00', '13:15', '13:30', '13:45',
    '14:00', '14:15', '14:30', '14:45',
    '15:00', '15:15', '15:30', '15:45',
    '16:00', '16:15', '16:30', '16:45',
    '17:00', '17:15', '17:30', '17:45',
    '18:00', '18:15', '18:30', '18:45',
    '19:00', '19:15', '19:30', '19:45'
  ]
  
  // Estados para formularios
  const [formCita, setFormCita] = useState({
    paciente_id: '',
    fecha_cita: selectedDate,
    hora_cita: '',
    duracion: 30,
    motivo: '',
    notas: '',
    telefono_contacto: '',
    email_contacto: ''
  })

  const [formNuevoPaciente, setFormNuevoPaciente] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: ''
  })

  useEffect(() => {
    cargarDatos()
  }, [selectedDate, filtroEstado])

  useEffect(() => {
    if (showModalCita && formCita.fecha_cita) {
      calcularHorariosLibres()
    }
  }, [showModalCita, formCita.fecha_cita, citaEditando])

  const calcularHorariosLibres = async () => {
    try {
      const fecha = new Date(formCita.fecha_cita + 'T00:00:00')
      const diaSemana = fecha.getDay()

      if (diaSemana === 0 || diaSemana === 6) {
        setHorariosLibres([])
        return
      }

      const { data: citas, error } = await supabase
        .from('citas')
        .select('hora_cita, id')
        .eq('fecha_cita', formCita.fecha_cita)
        .in('estado', ['confirmada', 'programada'])

      if (error) {
        setHorariosLibres(horariosConsultorio)
        return
      }

      const horasOcupadas = (citas || [])
        .filter(cita => !citaEditando || cita.id !== citaEditando.id)
        .map(cita => cita.hora_cita.substring(0, 5))

      const horasLibres = horariosConsultorio.filter(hora => !horasOcupadas.includes(hora))
      setHorariosLibres(horasLibres)
    } catch (error) {
      setHorariosLibres([])
    }
  }

  const cargarDatos = async () => {
    setLoading(true)
    
    try {
      const { data: pacientesData, error: pacientesError } = await supabase
        .from('pacientes')
        .select('*')
        .order('nombre')

      if (!pacientesError) {
        setPacientes(pacientesData || [])
      }

      let consulta = supabase
        .from('citas')
        .select('*')
        .eq('fecha_cita', selectedDate)
        .order('hora_cita')

      if (filtroEstado !== 'todas') {
        consulta = consulta.eq('estado', filtroEstado)
      }

      const { data: citasData, error: citasError } = await consulta

      if (!citasError) {
        setCitas(citasData || [])
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    }
    
    setLoading(false)
  }

  const obtenerNombrePaciente = (pacienteId: string) => {
    const paciente = pacientes.find(p => p.id === pacienteId)
    return paciente ? `${paciente.nombre} ${paciente.apellido}` : 'Paciente no encontrado'
  }

  const actualizarEstadoCita = async (citaId: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', citaId)

      if (!error) {
        cargarDatos()
      }
    } catch (error) {
      console.error('Error actualizando estado:', error)
    }
  }

  const eliminarCita = async (citaId: string) => {
    if (confirm('¿Estás seguro de eliminar esta cita?')) {
      try {
        const { error } = await supabase
          .from('citas')
          .delete()
          .eq('id', citaId)

        if (!error) {
          cargarDatos()
        }
      } catch (error) {
        console.error('Error eliminando cita:', error)
      }
    }
  }

  const editarCita = (cita: any) => {
    setCitaEditando(cita)
    setCreandoNuevoPaciente(false)
    
    const horaFormateada = cita.hora_cita ? cita.hora_cita.substring(0, 5) : ''
    
    setFormCita({
      paciente_id: cita.paciente_id,
      fecha_cita: cita.fecha_cita,
      hora_cita: horaFormateada,
      duracion: cita.duracion || 30,
      motivo: cita.motivo || '',
      notas: cita.notas || '',
      telefono_contacto: cita.telefono_contacto || '',
      email_contacto: cita.email_contacto || ''
    })
    setShowModalCita(true)
  }

  const guardarCita = async () => {
    try {
      let pacienteIdFinal = formCita.paciente_id

      if (creandoNuevoPaciente) {
        if (!formNuevoPaciente.nombre || !formNuevoPaciente.apellido || !formNuevoPaciente.telefono) {
          alert('Nombre, apellido y teléfono son obligatorios')
          return
        }

        const { data: nuevoPaciente, error: errorPaciente } = await supabase
          .from('pacientes')
          .insert([{
            nombre: formNuevoPaciente.nombre,
            apellido: formNuevoPaciente.apellido,
            telefono: formNuevoPaciente.telefono,
            email: formNuevoPaciente.email || null,
            fecha_nacimiento: '1990-01-01',
            direccion: 'Por definir'
          }])
          .select('id')
          .single()

        if (errorPaciente) {
          alert(`Error al crear el paciente: ${errorPaciente.message}`)
          return
        }

        pacienteIdFinal = nuevoPaciente.id
        
        const { data: pacientesData } = await supabase
          .from('pacientes')
          .select('*')
          .order('nombre')
        
        setPacientes(pacientesData || [])
      }
      
      if (citaEditando) {
        const { error } = await supabase
          .from('citas')
          .update({
            paciente_id: pacienteIdFinal,
            fecha_cita: formCita.fecha_cita,
            hora_cita: formCita.hora_cita + ':00',
            duracion: formCita.duracion,
            notas: `${formCita.motivo ? formCita.motivo + ' - ' : ''}${formCita.notas}`,
            telefono_contacto: creandoNuevoPaciente ? formNuevoPaciente.telefono : formCita.telefono_contacto,
            email_contacto: creandoNuevoPaciente ? formNuevoPaciente.email : formCita.email_contacto,
            updated_at: new Date().toISOString()
          })
          .eq('id', citaEditando.id)

        if (error) {
          alert('Error al actualizar la cita')
          return
        }
      } else {
        const { error } = await supabase
          .from('citas')
          .insert([{
            paciente_id: pacienteIdFinal,
            fecha_cita: formCita.fecha_cita,
            hora_cita: formCita.hora_cita + ':00',
            duracion: formCita.duracion,
            notas: `${formCita.motivo ? formCita.motivo + ' - ' : ''}${formCita.notas}`,
            telefono_contacto: creandoNuevoPaciente ? formNuevoPaciente.telefono : formCita.telefono_contacto,
            email_contacto: creandoNuevoPaciente ? formNuevoPaciente.email : formCita.email_contacto
          }])

        if (error) {
          alert('Error al crear la cita')
          return
        }
      }

      setShowModalCita(false)
      resetFormCita()
      cargarDatos()
    } catch (error: any) {
      alert('Error al guardar la cita')
    }
  }

  const resetFormCita = () => {
    setCitaEditando(null)
    setCreandoNuevoPaciente(false)
    setHorariosLibres([])
    setFormCita({
      paciente_id: '',
      fecha_cita: selectedDate,
      hora_cita: '',
      duracion: 30,
      motivo: '',
      notas: '',
      telefono_contacto: '',
      email_contacto: ''
    })
    setFormNuevoPaciente({
      nombre: '',
      apellido: '',
      telefono: '',
      email: ''
    })
  }

  const obtenerColorEstado = (estado: string) => {
    switch (estado) {
      case 'confirmada':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelada':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'completada':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'no_asistio':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha + 'T00:00:00')
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatearHora = (hora: string) => {
    return hora.substring(0, 5)
  }

  const citasDelDia = citas.length
  const citasConfirmadas = citas.filter(c => c.estado === 'confirmada').length
  const citasCompletadas = citas.filter(c => c.estado === 'completada').length
  const citasCanceladas = citas.filter(c => c.estado === 'cancelada').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando gestión de citas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavegacionPersonalizada paginaActual="citas" />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Citas</h1>
              <div className="flex items-center space-x-4">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="todas">Todas las citas</option>
                  <option value="confirmada">Confirmadas</option>
                  <option value="completada">Completadas</option>
                  <option value="cancelada">Canceladas</option>
                  <option value="no_asistio">No asistió</option>
                </select>
                <button
                  onClick={() => setShowModalCita(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  + Nueva Cita
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                <strong>Horarios de atención:</strong> Lunes a Viernes de 08:00 a 19:45 (intervalos de 15 minutos)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-800">Total del Día</h3>
                <p className="text-2xl font-bold text-gray-600">{citasDelDia}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-green-800">Confirmadas</h3>
                <p className="text-2xl font-bold text-green-600">{citasConfirmadas}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-800">Completadas</h3>
                <p className="text-2xl font-bold text-blue-600">{citasCompletadas}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-red-800">Canceladas</h3>
                <p className="text-2xl font-bold text-red-600">{citasCanceladas}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Citas para {formatearFecha(selectedDate)}
              </h3>
              
              {citas.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📅</div>
                  <p className="text-gray-500 text-lg">No hay citas programadas para esta fecha</p>
                  <button
                    onClick={() => setShowModalCita(true)}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    Programar Primera Cita
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {citas.map((cita) => (
                    <div key={cita.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-medium text-gray-900">
                              {formatearHora(cita.hora_cita)} - {obtenerNombrePaciente(cita.paciente_id)}
                            </h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${obtenerColorEstado(cita.estado)}`}>
                              {cita.estado?.charAt(0).toUpperCase() + cita.estado?.slice(1)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div>
                              <p><strong>Duración:</strong> {cita.duracion || 30} min</p>
                            </div>
                            <div>
                              {cita.telefono_contacto && <p><strong>Tel:</strong> {cita.telefono_contacto}</p>}
                              {cita.email_contacto && <p><strong>Email:</strong> {cita.email_contacto}</p>}
                            </div>
                            <div>
                              {cita.notas && <p><strong>Notas:</strong> {cita.notas}</p>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2 ml-4">
                          {cita.estado === 'confirmada' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => actualizarEstadoCita(cita.id, 'completada')}
                                className="text-blue-600 hover:text-blue-800 text-sm bg-blue-50 px-2 py-1 rounded"
                              >
                                Completar
                              </button>
                              <button
                                onClick={() => actualizarEstadoCita(cita.id, 'no_asistio')}
                                className="text-yellow-600 hover:text-yellow-800 text-sm bg-yellow-50 px-2 py-1 rounded"
                              >
                                No asistió
                              </button>
                            </div>
                          )}
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => editarCita(cita)}
                              className="text-gray-600 hover:text-gray-800 text-sm"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => actualizarEstadoCita(cita.id, 'cancelada')}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => eliminarCita(cita.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-blue-900">Agenda Online para Pacientes</h3>
                <p className="text-blue-700">Los pacientes pueden reservar turnos automáticamente</p>
              </div>
              <a
                href="/agenda"
                target="_blank"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Ver Agenda Pública
              </a>
            </div>
          </div>
        </div>
      </div>

      {showModalCita && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-8">
                  <button className="text-teal-600 border-b-2 border-teal-600 pb-2 font-medium">
                    {citaEditando ? 'Editar cita' : 'Crear una cita'}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowModalCita(false)
                    resetFormCita()
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Paciente</label>
                    <div className="relative">
                      <select
                        value={creandoNuevoPaciente ? '' : formCita.paciente_id}
                        onChange={(e) => {
                          setFormCita({...formCita, paciente_id: e.target.value})
                          if (e.target.value) {
                            setCreandoNuevoPaciente(false)
                          }
                        }}
                        disabled={creandoNuevoPaciente}
                        className={`w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-500 ${
                          creandoNuevoPaciente ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                      >
                        <option value="">Buscar paciente</option>
                        {pacientes.map(paciente => (
                          <option key={paciente.id} value={paciente.id}>
                            {paciente.nombre} {paciente.apellido}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex items-center mt-3">
                      <input 
                        type="radio" 
                        name="paciente_tipo" 
                        className="text-teal-600"
                        checked={creandoNuevoPaciente}
                        onChange={(e) => {
                          setCreandoNuevoPaciente(e.target.checked)
                          if (e.target.checked) {
                            setFormCita({...formCita, paciente_id: ''})
                          }
                        }}
                      />
                      <label 
                        className="ml-2 text-sm text-gray-600 cursor-pointer" 
                        onClick={() => {
                          setCreandoNuevoPaciente(!creandoNuevoPaciente)
                          if (!creandoNuevoPaciente) {
                            setFormCita({...formCita, paciente_id: ''})
                          }
                        }}
                      >
                        Crear nuevo paciente
                      </label>
                    </div>
                  </div>

                  {creandoNuevoPaciente && (
                    <div className="space-y-4 border border-teal-200 rounded-lg p-4 bg-teal-50">
                      <h4 className="text-sm font-medium text-teal-800">Datos del nuevo paciente</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                          <input
                            type="text"
                            value={formNuevoPaciente.nombre}
                            onChange={(e) => setFormNuevoPaciente({...formNuevoPaciente, nombre: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Nombre"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                          <input
                            type="text"
                            value={formNuevoPaciente.apellido}
                            onChange={(e) => setFormNuevoPaciente({...formNuevoPaciente, apellido: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Apellido"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                        <input
                          type="tel"
                          value={formNuevoPaciente.telefono}
                          onChange={(e) => setFormNuevoPaciente({...formNuevoPaciente, telefono: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          placeholder="11 1234-5678"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={formNuevoPaciente.email}
                          onChange={(e) => setFormNuevoPaciente({...formNuevoPaciente, email: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          placeholder="email@ejemplo.com"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Motivo</label>
                    <select
                      value={formCita.motivo}
                      onChange={(e) => setFormCita({...formCita, motivo: e.target.value})}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="">Seleccionar motivo</option>
                      <option value="Consulta general">Consulta general</option>
                      <option value="Limpieza dental">Limpieza dental</option>
                      <option value="Dolor dental">Dolor dental</option>
                      <option value="Revisión">Revisión</option>
                      <option value="Ortodoncia">Ortodoncia</option>
                      <option value="Blanqueamiento">Blanqueamiento</option>
                      <option value="Urgencia">Urgencia</option>
                      <option value="Extracción">Extracción</option>
                      <option value="Endodoncia">Endodoncia</option>
                      <option value="Implante">Implante</option>
                      <option value="Prótesis">Prótesis</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duración</label>
                    <select
                      value={formCita.duracion}
                      onChange={(e) => setFormCita({...formCita, duracion: parseInt(e.target.value)})}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1h 00min</option>
                      <option value={90}>1h 30min</option>
                      <option value={120}>2h 00min</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                    <input
                      type="date"
                      value={formCita.fecha_cita}
                      onChange={(e) => setFormCita({...formCita, fecha_cita: e.target.value})}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hora inicio</label>
                    <select
                      value={formCita.hora_cita}
                      onChange={(e) => setFormCita({...formCita, hora_cita: e.target.value})}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="">Seleccionar hora</option>
                      {horariosLibres.map((hora) => (
                        <option key={hora} value={hora}>
                          {hora}
                        </option>
                      ))}
                    </select>
                    {formCita.fecha_cita && horariosLibres.length === 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        No hay horarios disponibles para esta fecha
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nota de la cita</label>
                    <textarea
                      value={formCita.notas}
                      onChange={(e) => setFormCita({...formCita, notas: e.target.value})}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                      rows={8}
                      placeholder="Escribe aquí ..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-8 pt-6 border-t">
                <button
                  onClick={() => {
                    setShowModalCita(false)
                    resetFormCita()
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarCita}
                  disabled={
                    (!formCita.paciente_id && !creandoNuevoPaciente) || 
                    !formCita.fecha_cita || 
                    !formCita.hora_cita ||
                    (creandoNuevoPaciente && (!formNuevoPaciente.nombre || !formNuevoPaciente.apellido || !formNuevoPaciente.telefono))
                  }
                  className="px-8 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {citaEditando ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}