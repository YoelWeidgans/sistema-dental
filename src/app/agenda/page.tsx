'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

const supabase = createSupabaseClient()

export default function AgendaOnline() {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [citasExistentes, setCitasExistentes] = useState<any[]>([])
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [paso, setPaso] = useState(1) // 1: fecha, 2: hora, 3: datos, 4: confirmación
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    motivo: '',
    es_nuevo_paciente: true
  })

  // Horarios estandarizados del consultorio
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

  // Cargar horas disponibles cuando se selecciona una fecha
  useEffect(() => {
    if (selectedDate) {
      cargarHorasDisponibles()
    }
  }, [selectedDate])

  const cargarHorasDisponibles = async () => {
    if (!selectedDate) return

    try {
      console.log('🔄 Calculando horas disponibles para:', selectedDate)
      
      // Obtener día de la semana (0 = domingo, 1 = lunes, ..., 6 = sábado)
      const fecha = new Date(selectedDate + 'T00:00:00')
      const diaSemana = fecha.getDay()

      // Verificar si es día laborable (lunes a viernes = 1-5)
      if (diaSemana === 0 || diaSemana === 6) {
        console.log('📅 Fin de semana - no hay horarios disponibles')
        setHorasDisponibles([])
        return
      }

      // Cargar citas existentes para esta fecha
      const { data: citas, error } = await supabase
        .from('citas')
        .select('hora_cita, duracion')
        .eq('fecha_cita', selectedDate)
        .in('estado', ['confirmada', 'programada'])

      if (error) {
        console.error('❌ Error cargando citas:', error)
        setCitasExistentes([])
      } else {
        console.log('✅ Citas existentes:', citas?.length || 0)
        setCitasExistentes(citas || [])
      }

      // Filtrar horarios disponibles
      const horasLibres = horariosConsultorio.filter(hora => {
        // Verificar si ya hay una cita en este horario
        const citaExistente = (citas || []).some(cita => {
          const horaCita = cita.hora_cita
          // Comparar solo HH:MM (sin segundos)
          const horaCitaFormateada = horaCita.substring(0, 5)
          return horaCitaFormateada === hora
        })
        
        return !citaExistente
      })

      console.log('⏰ Horas disponibles generadas:', horasLibres.length)
      setHorasDisponibles(horasLibres)
    } catch (error) {
      console.error('💥 Error calculando horas:', error)
      setHorasDisponibles([])
    }
  }

  const reservarTurno = async () => {
    setLoading(true)
    
    try {
      console.log('💾 Iniciando reserva de turno...')
      console.log('📋 Datos del formulario:', formData)
      console.log('📅 Fecha seleccionada:', selectedDate)
      console.log('⏰ Hora seleccionada:', selectedTime)

      // Primero, verificar si es paciente existente por teléfono
      const { data: pacienteExistente, error: errorBusqueda } = await supabase
        .from('pacientes')
        .select('id')
        .eq('telefono', formData.telefono)
        .single()

      if (errorBusqueda && errorBusqueda.code !== 'PGRST116') {
        // PGRST116 = no rows returned, que es normal si no existe
        console.error('❌ Error buscando paciente:', errorBusqueda)
        throw new Error(`Error buscando paciente: ${errorBusqueda.message}`)
      }

      let pacienteId = pacienteExistente?.id
      console.log('👤 Paciente existente ID:', pacienteId)

      // Si no existe, crear nuevo paciente
      if (!pacienteId) {
        console.log('➕ Creando nuevo paciente...')
        
        const { data: nuevoPaciente, error: errorPaciente } = await supabase
          .from('pacientes')
          .insert([{
            nombre: formData.nombre,
            apellido: formData.apellido,
            telefono: formData.telefono,
            email: formData.email || null,
            fecha_nacimiento: '1990-01-01', // Fecha por defecto
            direccion: 'Por definir' // Dirección por defecto
          }])
          .select('id')
          .single()

        if (errorPaciente) {
          console.error('❌ Error creando paciente:', errorPaciente)
          throw new Error(`Error creando paciente: ${errorPaciente.message}`)
        }
        
        pacienteId = nuevoPaciente.id
        console.log('✅ Nuevo paciente creado con ID:', pacienteId)
      }

      // Preparar datos de la cita
      const datosCita = {
        paciente_id: pacienteId,
        fecha_cita: selectedDate,
        hora_cita: selectedTime + ':00', // Agregar segundos para formato correcto
        duracion: 30,
        notas: `${formData.motivo || 'Consulta general'} - Reserva online`,
        telefono_contacto: formData.telefono,
        email_contacto: formData.email || null
      }

      console.log('📝 Datos de la cita a insertar:', datosCita)

      // Crear la cita
      const { data: nuevaCita, error: errorCita } = await supabase
        .from('citas')
        .insert([datosCita])
        .select()

      if (errorCita) {
        console.error('❌ Error creando cita:', errorCita)
        throw new Error(`Error creando cita: ${errorCita.message}`)
      }

      console.log('✅ Cita creada exitosamente:', nuevaCita)
      setPaso(4) // Mostrar confirmación
    } catch (error: any) {
      console.error('💥 Error completo reservando turno:', error)
      alert(`Error al reservar el turno: ${error.message || 'Error desconocido'}. Por favor intente nuevamente.`)
    }
    
    setLoading(false)
  }

  const reiniciarFormulario = () => {
    setPaso(1)
    setSelectedDate('')
    setSelectedTime('')
    setFormData({
      nombre: '',
      apellido: '',
      telefono: '',
      email: '',
      motivo: '',
      es_nuevo_paciente: true
    })
  }

  const obtenerFechaMinima = () => {
    const hoy = new Date()
    hoy.setDate(hoy.getDate() + 1) // Mínimo mañana
    return hoy.toISOString().split('T')[0]
  }

  const obtenerFechaMaxima = () => {
    const hoy = new Date()
    hoy.setDate(hoy.getDate() + 30) // Máximo 30 días
    return hoy.toISOString().split('T')[0]
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
    return hora.substring(0, 5) // Solo HH:MM
  }

  const esDiaLaboral = (fecha: string) => {
    const date = new Date(fecha + 'T00:00:00')
    const diaSemana = date.getDay()
    return diaSemana >= 1 && diaSemana <= 5 // Lunes a viernes
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Reserva tu Turno Online
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Programa tu cita de manera fácil y rápida. Selecciona el día y horario que mejor te convenga.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6 max-w-lg mx-auto">
            <p className="text-blue-800 text-sm">
              <strong>Horarios de atención:</strong> Lunes a Viernes de 08:00 a 19:45
            </p>
          </div>
        </div>

        {/* Indicador de pasos */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  paso >= stepNumber 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {stepNumber === 4 && paso >= 4 ? '✓' : stepNumber}
                </div>
                {stepNumber < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    paso > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2 space-x-8 text-sm text-gray-600">
            <span>Fecha</span>
            <span>Horario</span>
            <span>Datos</span>
            <span>Confirmación</span>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            
            {/* Paso 1: Seleccionar fecha */}
            {paso === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Selecciona una fecha</h2>
                <div className="space-y-4">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={obtenerFechaMinima()}
                    max={obtenerFechaMaxima()}
                    className="w-full text-lg p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  {selectedDate && !esDiaLaboral(selectedDate) && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800">
                        No atendemos los fines de semana. Por favor selecciona un día de lunes a viernes.
                      </p>
                    </div>
                  )}
                  
                  {selectedDate && esDiaLaboral(selectedDate) && horasDisponibles.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800">
                        No hay horarios disponibles para esta fecha. Por favor selecciona otro día.
                      </p>
                    </div>
                  )}
                  
                  {selectedDate && esDiaLaboral(selectedDate) && horasDisponibles.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800">
                        ✓ {formatearFecha(selectedDate)} - {horasDisponibles.length} horarios disponibles
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-8">
                  <button
                    onClick={() => setPaso(2)}
                    disabled={!selectedDate || !esDiaLaboral(selectedDate) || horasDisponibles.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium text-lg"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {/* Paso 2: Seleccionar hora */}
            {paso === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Selecciona un horario</h2>
                <p className="text-gray-600 mb-6">{formatearFecha(selectedDate)}</p>
                
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-8">
                  {horasDisponibles.map((hora) => (
                    <button
                      key={hora}
                      onClick={() => setSelectedTime(hora)}
                      className={`p-3 rounded-lg border font-medium transition-colors ${
                        selectedTime === hora
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      {formatearHora(hora)}
                    </button>
                  ))}
                </div>

                {horasDisponibles.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No hay horarios disponibles para esta fecha</p>
                    <p className="text-sm">Intenta con otro día</p>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={() => setPaso(1)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium"
                  >
                    Volver
                  </button>
                  <button
                    onClick={() => setPaso(3)}
                    disabled={!selectedTime}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {/* Paso 3: Datos del paciente */}
            {paso === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Completa tus datos</h2>
                <p className="text-gray-600 mb-6">
                  {formatearFecha(selectedDate)} a las {formatearHora(selectedTime)}
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Tu nombre"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Apellido *
                      </label>
                      <input
                        type="text"
                        value={formData.apellido}
                        onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Tu apellido"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="11 1234-5678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motivo de la consulta
                    </label>
                    <select
                      value={formData.motivo}
                      onChange={(e) => setFormData({...formData, motivo: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecciona un motivo</option>
                      <option value="Consulta general">Consulta general</option>
                      <option value="Limpieza dental">Limpieza dental</option>
                      <option value="Dolor dental">Dolor dental</option>
                      <option value="Revisión">Revisión</option>
                      <option value="Ortodoncia">Ortodoncia</option>
                      <option value="Blanqueamiento">Blanqueamiento</option>
                      <option value="Urgencia">Urgencia</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => setPaso(2)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium"
                  >
                    Volver
                  </button>
                  <button
                    onClick={reservarTurno}
                    disabled={loading || !formData.nombre || !formData.apellido || !formData.telefono}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Reservando...
                      </>
                    ) : (
                      'Confirmar Reserva'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Paso 4: Confirmación */}
            {paso === 4 && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">¡Turno Confirmado!</h2>
                  <p className="text-gray-600">Tu cita ha sido reservada exitosamente</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                  <h3 className="font-bold text-blue-900 mb-4">Detalles de tu cita:</h3>
                  <div className="space-y-2 text-blue-800">
                    <p><strong>Fecha:</strong> {formatearFecha(selectedDate)}</p>
                    <p><strong>Hora:</strong> {formatearHora(selectedTime)}</p>
                    <p><strong>Paciente:</strong> {formData.nombre} {formData.apellido}</p>
                    <p><strong>Teléfono:</strong> {formData.telefono}</p>
                    {formData.email && <p><strong>Email:</strong> {formData.email}</p>}
                    {formData.motivo && <p><strong>Motivo:</strong> {formData.motivo}</p>}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
                  <p className="text-yellow-800 text-sm">
                    <strong>Importante:</strong> Te contactaremos 24 horas antes para confirmar tu cita. 
                    Si necesitas cancelar o reprogramar, por favor comunícate con nosotros con al menos 2 horas de anticipación.
                  </p>
                </div>

                <button
                  onClick={reiniciarFormulario}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium"
                >
                  Reservar Otro Turno
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Información de contacto */}
        <div className="max-w-2xl mx-auto mt-12 text-center">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">¿Necesitas ayuda?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <p className="font-medium">Teléfono</p>
                <p>11 1234-5678</p>
              </div>
              <div>
                <p className="font-medium">Email</p>
                <p>info@consultorio.com</p>
              </div>
              <div>
                <p className="font-medium">Horarios</p>
                <p>Lun-Vie 08:00-19:45</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}