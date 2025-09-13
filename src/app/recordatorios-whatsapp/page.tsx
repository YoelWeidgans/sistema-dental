'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import NavegacionPersonalizada from '../../components/NavegacionPersonalizada'

const supabase = createSupabaseClient()

export default function RecordatoriosWhatsApp() {
  const [activeTab, setActiveTab] = useState('notificaciones')
  const [notificaciones, setNotificaciones] = useState<any[]>([])
  const [plantillas, setPlantillas] = useState<any[]>([])
  const [citasProximas, setCitasProximas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [configuracion, setConfiguracion] = useState({
    recordatorios_activos: true,
    horas_anticipacion: 24,
    confirmacion_automatica: true
  })

  // Estados para editar plantillas
  const [editandoPlantilla, setEditandoPlantilla] = useState<any>(null)
  const [nuevaPlantilla, setNuevaPlantilla] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    
    try {
      // Cargar notificaciones recientes
      const { data: notificacionesData } = await supabase
        .from('notificaciones_whatsapp')
        .select(`
          *,
          citas (
            fecha_cita,
            hora_cita,
            paciente_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      setNotificaciones(notificacionesData || [])

      // Cargar plantillas de mensajes
      const { data: plantillasData } = await supabase
        .from('plantillas_mensajes')
        .select('*')
        .eq('activo', true)
        .order('tipo')

      setPlantillas(plantillasData || [])

      // Cargar citas próximas (próximos 7 días)
      const hoy = new Date()
      const enUnaSemana = new Date()
      enUnaSemana.setDate(hoy.getDate() + 7)

      const { data: citasData } = await supabase
        .from('citas')
        .select(`
          *,
          pacientes (nombre, telefono)
        `)
        .gte('fecha_cita', hoy.toISOString().split('T')[0])
        .lte('fecha_cita', enUnaSemana.toISOString().split('T')[0])
        .eq('estado', 'confirmada')
        .order('fecha_cita')
        .order('hora_cita')

      setCitasProximas(citasData || [])

    } catch (error) {
      console.error('Error cargando datos:', error)
    }
    
    setLoading(false)
  }

  // Función para programar recordatorios automáticos
  const programarRecordatorios = async () => {
    try {
      const mañana = new Date()
      mañana.setDate(mañana.getDate() + 1)
      const fechaMañana = mañana.toISOString().split('T')[0]

      // Buscar citas para mañana que no tengan recordatorio enviado
      const { data: citasMañana } = await supabase
        .from('citas')
        .select(`
          *,
          pacientes (nombre, telefono)
        `)
        .eq('fecha_cita', fechaMañana)
        .eq('estado', 'confirmada')

      if (!citasMañana?.length) {
        alert('No hay citas para mañana')
        return
      }

      // Obtener plantilla de recordatorio
      const plantillaRecordatorio = plantillas.find(p => p.tipo === 'recordatorio_cita')
      if (!plantillaRecordatorio) {
        alert('No hay plantilla de recordatorio configurada')
        return
      }

      let recordatoriosProgramados = 0

      for (const cita of citasMañana) {
        // Verificar si ya tiene recordatorio programado
        const { data: recordatorioExistente } = await supabase
          .from('notificaciones_whatsapp')
          .select('id')
          .eq('cita_id', cita.id)
          .eq('tipo_notificacion', 'recordatorio_cita')
          .single()

        if (!recordatorioExistente && cita.pacientes?.telefono) {
          // Generar mensaje personalizado
          const mensaje = plantillaRecordatorio.plantilla
            .replace('{{nombre}}', cita.pacientes.nombre)
            .replace('{{fecha}}', formatearFecha(cita.fecha_cita))
            .replace('{{hora}}', formatearHora(cita.hora_cita))

          // Programar notificación para las 10:00 AM del día anterior
          const fechaProgramada = new Date(cita.fecha_cita)
          fechaProgramada.setDate(fechaProgramada.getDate() - 1)
          fechaProgramada.setHours(10, 0, 0, 0)

          const { error } = await supabase
            .from('notificaciones_whatsapp')
            .insert([{
              cita_id: cita.id,
              tipo_notificacion: 'recordatorio_cita',
              telefono: cita.pacientes.telefono,
              mensaje: mensaje,
              fecha_programada: fechaProgramada.toISOString(),
              estado: 'pendiente'
            }])

          if (!error) {
            recordatoriosProgramados++
          }
        }
      }

      alert(`${recordatoriosProgramados} recordatorios programados para enviar`)
      cargarDatos()

    } catch (error) {
      console.error('Error programando recordatorios:', error)
      alert('Error al programar recordatorios')
    }
  }

  // Función para enviar recordatorio manual
  const enviarRecordatorio = async (cita: any) => {
    try {
      const plantillaRecordatorio = plantillas.find(p => p.tipo === 'recordatorio_cita')
      if (!plantillaRecordatorio) {
        alert('No hay plantilla de recordatorio configurada')
        return
      }

      const mensaje = plantillaRecordatorio.plantilla
        .replace('{{nombre}}', cita.pacientes?.nombre || 'Paciente')
        .replace('{{fecha}}', formatearFecha(cita.fecha_cita))
        .replace('{{hora}}', formatearHora(cita.hora_cita))

      // Simular envío de WhatsApp
      console.log('Enviando WhatsApp a:', cita.pacientes?.telefono)
      console.log('Mensaje:', mensaje)

      // Guardar notificación como enviada
      const { error } = await supabase
        .from('notificaciones_whatsapp')
        .insert([{
          cita_id: cita.id,
          tipo_notificacion: 'recordatorio_cita',
          telefono: cita.pacientes?.telefono || '',
          mensaje: mensaje,
          fecha_programada: new Date().toISOString(),
          fecha_enviado: new Date().toISOString(),
          estado: 'enviado'
        }])

      if (error) {
        console.error('Error guardando notificación:', error)
      } else {
        alert(`Recordatorio enviado a ${cita.pacientes?.nombre}`)
        cargarDatos()
      }

    } catch (error) {
      console.error('Error enviando recordatorio:', error)
      alert('Error al enviar recordatorio')
    }
  }

  // Función para guardar plantilla editada
  const guardarPlantilla = async (plantilla: any) => {
    try {
      const { error } = await supabase
        .from('plantillas_mensajes')
        .update({ plantilla: nuevaPlantilla })
        .eq('id', plantilla.id)

      if (error) {
        console.error('Error actualizando plantilla:', error)
        alert('Error al guardar plantilla')
      } else {
        alert('Plantilla actualizada')
        setEditandoPlantilla(null)
        setNuevaPlantilla('')
        cargarDatos()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar plantilla')
    }
  }

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha + 'T00:00:00')
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }

  const formatearHora = (hora: string) => {
    return hora.substring(0, 5)
  }

  const obtenerColorEstado = (estado: string) => {
    switch (estado) {
      case 'enviado':
        return 'bg-green-100 text-green-800'
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800'
      case 'fallido':
        return 'bg-red-100 text-red-800'
      case 'leido':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const obtenerIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'recordatorio_cita':
        return '📅'
      case 'confirmacion_cita':
        return '✅'
      case 'recordatorio_pago':
        return '💰'
      case 'cita_cancelada':
        return '❌'
      default:
        return '📱'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando recordatorios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavegacionPersonalizada paginaActual="recordatorios-whatsapp" />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Recordatorios WhatsApp</h1>
                <p className="text-gray-600">Automatiza la comunicación con tus pacientes</p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={programarRecordatorios}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Programar Recordatorios
                </button>
                <button
                  onClick={cargarDatos}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Actualizar
                </button>
              </div>
            </div>

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-800">Citas Próximas</h3>
                <p className="text-2xl font-bold text-blue-600">{citasProximas.length}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-green-800">Enviados Hoy</h3>
                <p className="text-2xl font-bold text-green-600">
                  {notificaciones.filter(n => 
                    n.fecha_enviado && 
                    new Date(n.fecha_enviado).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-yellow-800">Pendientes</h3>
                <p className="text-2xl font-bold text-yellow-600">
                  {notificaciones.filter(n => n.estado === 'pendiente').length}
                </p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-red-800">Fallidos</h3>
                <p className="text-2xl font-bold text-red-600">
                  {notificaciones.filter(n => n.estado === 'fallido').length}
                </p>
              </div>
            </div>
          </div>

          {/* Pestañas */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('notificaciones')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'notificaciones'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Notificaciones
              </button>
              <button
                onClick={() => setActiveTab('citas')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'citas'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Citas Próximas
              </button>
              <button
                onClick={() => setActiveTab('plantillas')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'plantillas'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Plantillas
              </button>
              <button
                onClick={() => setActiveTab('configuracion')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'configuracion'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Configuración
              </button>
            </nav>
          </div>

          {/* Contenido de pestañas */}
          {activeTab === 'notificaciones' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Historial de Notificaciones</h3>
                
                {notificaciones.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">📱</div>
                    <p className="text-gray-500 text-lg">No hay notificaciones registradas</p>
                    <button
                      onClick={programarRecordatorios}
                      className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Programar Primeros Recordatorios
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notificaciones.map((notificacion) => (
                      <div key={notificacion.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="text-2xl">{obtenerIconoTipo(notificacion.tipo_notificacion)}</span>
                              <div>
                                <h4 className="font-medium text-gray-900">{notificacion.tipo_notificacion.replace('_', ' ').toUpperCase()}</h4>
                                <p className="text-sm text-gray-500">{notificacion.telefono}</p>
                              </div>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${obtenerColorEstado(notificacion.estado)}`}>
                                {notificacion.estado}
                              </span>
                            </div>
                            <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 mb-2">
                              {notificacion.mensaje}
                            </div>
                            <div className="text-sm text-gray-500">
                              <p>Programado: {new Date(notificacion.fecha_programada).toLocaleString('es-AR')}</p>
                              {notificacion.fecha_enviado && (
                                <p>Enviado: {new Date(notificacion.fecha_enviado).toLocaleString('es-AR')}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'citas' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Citas Próximas (Próximos 7 días)</h3>
                
                {citasProximas.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">📅</div>
                    <p className="text-gray-500 text-lg">No hay citas programadas para los próximos 7 días</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {citasProximas.map((cita) => (
                      <div key={cita.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-2">
                              <h4 className="font-medium text-gray-900">
                                {formatearFecha(cita.fecha_cita)} - {formatearHora(cita.hora_cita)}
                              </h4>
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                {cita.estado}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <p><strong>Paciente:</strong> {cita.pacientes?.nombre}</p>
                              <p><strong>Teléfono:</strong> {cita.pacientes?.telefono}</p>
                              {cita.motivo && <p><strong>Motivo:</strong> {cita.motivo}</p>}
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => enviarRecordatorio(cita)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                            >
                              Enviar Recordatorio
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'plantillas' && (
            <div className="space-y-6">
              {plantillas.map((plantilla) => (
                <div key={plantilla.id} className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                          <span className="mr-2">{obtenerIconoTipo(plantilla.tipo)}</span>
                          {plantilla.tipo.replace('_', ' ').toUpperCase()}
                        </h3>
                        <p className="text-sm text-gray-500">Plantilla para {plantilla.tipo.replace('_', ' ')}</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditandoPlantilla(plantilla)
                          setNuevaPlantilla(plantilla.plantilla)
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Editar
                      </button>
                    </div>
                    
                    {editandoPlantilla?.id === plantilla.id ? (
                      <div className="space-y-4">
                        <textarea
                          value={nuevaPlantilla}
                          onChange={(e) => setNuevaPlantilla(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={4}
                        />
                        <div className="text-sm text-gray-500 mb-4">
                          <p><strong>Variables disponibles:</strong></p>
                          <p>{'{{nombre}}'} - Nombre del paciente</p>
                          <p>{'{{fecha}}'} - Fecha de la cita</p>
                          <p>{'{{hora}}'} - Hora de la cita</p>
                          <p>{'{{monto}}'} - Monto del pago (solo recordatorios de pago)</p>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => guardarPlantilla(plantilla)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => {
                              setEditandoPlantilla(null)
                              setNuevaPlantilla('')
                            }}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                        {plantilla.plantilla}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'configuracion' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Configuración de Recordatorios</h3>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Recordatorios Automáticos</h4>
                      <p className="text-sm text-gray-500">Enviar recordatorios automáticamente a los pacientes</p>
                    </div>
                    <button
                      onClick={() => setConfiguracion({...configuracion, recordatorios_activos: !configuracion.recordatorios_activos})}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                        configuracion.recordatorios_activos ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        configuracion.recordatorios_activos ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horas de anticipación para recordatorios
                    </label>
                    <select
                      value={configuracion.horas_anticipacion}
                      onChange={(e) => setConfiguracion({...configuracion, horas_anticipacion: parseInt(e.target.value)})}
                      className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={12}>12 horas antes</option>
                      <option value={24}>24 horas antes</option>
                      <option value={48}>48 horas antes</option>
                      <option value={72}>72 horas antes</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Confirmación Automática</h4>
                      <p className="text-sm text-gray-500">Enviar confirmación inmediata al crear citas</p>
                    </div>
                    <button
                      onClick={() => setConfiguracion({...configuracion, confirmacion_automatica: !configuracion.confirmacion_automatica})}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                        configuracion.confirmacion_automatica ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        configuracion.confirmacion_automatica ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">Estado de WhatsApp API</h4>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                        <div>
                          <p className="text-yellow-800 font-medium">Modo Simulación</p>
                          <p className="text-yellow-700 text-sm">Los mensajes se registran pero no se envían realmente. Configurar Twilio para envíos reales.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => alert('Configuración guardada')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Guardar Configuración
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}