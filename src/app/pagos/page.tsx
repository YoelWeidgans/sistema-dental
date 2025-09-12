'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export default function Pagos() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [pacientes, setPacientes] = useState<any[]>([])
  const [cuotas, setCuotas] = useState<any[]>([])
  const [pagos, setPagos] = useState<any[]>([])
  const [egresos, setEgresos] = useState<any[]>([])
  const [showModalIngreso, setShowModalIngreso] = useState(false)
  const [showModalEgreso, setShowModalEgreso] = useState(false)
  const [egresoEditando, setEgresoEditando] = useState<any>(null)
  const [pagoEditando, setPagoEditando] = useState<any>(null)
  
  const [formIngreso, setFormIngreso] = useState({
    paciente_id: '',
    cuota_id: '',
    monto: '',
    concepto: 'Pago de cuota',
    metodo_pago: 'efectivo',
    notas: ''
  })
  
  const [formEgreso, setFormEgreso] = useState({
    concepto: '',
    monto: '',
    categoria: 'general',
    metodo_pago: 'efectivo',
    notas: ''
  })

  // FUNCIÓN PARA FORMATEAR NÚMEROS CON PUNTOS (SIN CENTAVOS)
  const formatearNumero = (numero: number) => {
    return Math.round(numero).toLocaleString('es-AR')
  }

  const formatearHora = (timestamp: string) => {
    const fecha = new Date(timestamp)
    return fecha.toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    })
  }

  const cargarDatos = async () => {
    setLoading(true)
    try {
      console.log('🔄 Cargando datos para fecha:', selectedDate)

      const { data: pacientesData } = await supabase.from('pacientes').select('*').order('nombre')
      const { data: cuotasData } = await supabase.from('cuotas').select('*')
      const { data: pagosData } = await supabase.from('pagos').select('*').eq('fecha_pago', selectedDate)
      const { data: egresosData } = await supabase.from('egresos').select('*').eq('fecha_egreso', selectedDate)

      setPacientes(pacientesData || [])
      setCuotas(cuotasData || [])
      setPagos(pagosData || [])
      setEgresos(egresosData || [])
      
    } catch (error) {
      console.error('Error cargando datos:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [selectedDate])

  const totalIngresos = pagos.reduce((sum, pago) => sum + (parseFloat(pago.monto) || 0), 0)
  const totalEgresos = egresos.reduce((sum, egreso) => sum + (parseFloat(egreso.monto) || 0), 0)
  const cuotasPendientes = cuotas.filter(cuota => cuota.saldo_pendiente > 0)

  const obtenerNombrePaciente = (pago: any) => {
    if (pago.paciente_id) {
      const paciente = pacientes.find(p => p.id === pago.paciente_id)
      return paciente?.nombre || 'Paciente no encontrado'
    }
    
    if (pago.cuota_id) {
      const cuota = cuotas.find(c => c.id === pago.cuota_id)
      if (cuota) {
        const paciente = pacientes.find(p => p.id === cuota.paciente_id)
        return paciente?.nombre || 'Paciente no encontrado'
      }
    }
    
    return 'Cliente general'
  }

  const registrarIngreso = async () => {
    try {
      const nuevoIngreso = {
        paciente_id: formIngreso.paciente_id || null,
        cuota_id: formIngreso.cuota_id || null,
        monto: parseFloat(formIngreso.monto),
        concepto: formIngreso.concepto,
        metodo_pago: formIngreso.metodo_pago,
        notas: formIngreso.notas,
        fecha_pago: selectedDate
      }

      if (pagoEditando) {
        const { error } = await supabase.from('pagos').update(nuevoIngreso).eq('id', pagoEditando.id)
        if (!error) {
          setShowModalIngreso(false)
          resetFormIngreso()
          cargarDatos()
        }
      } else {
        const { error } = await supabase.from('pagos').insert([nuevoIngreso])
        if (!error) {
          setShowModalIngreso(false)
          resetFormIngreso()
          cargarDatos()
        }
      }
    } catch (error) {
      alert('Error al registrar el pago')
    }
  }

  const registrarEgreso = async () => {
    try {
      const nuevoEgreso = {
        concepto: formEgreso.concepto,
        monto: parseFloat(formEgreso.monto),
        categoria: formEgreso.categoria,
        metodo_pago: formEgreso.metodo_pago,
        notas: formEgreso.notas,
        fecha_egreso: selectedDate
      }

      if (egresoEditando) {
        const { error } = await supabase.from('egresos').update(nuevoEgreso).eq('id', egresoEditando.id)
        if (!error) {
          setShowModalEgreso(false)
          resetFormEgreso()
          cargarDatos()
        }
      } else {
        const { error } = await supabase.from('egresos').insert([nuevoEgreso])
        if (!error) {
          setShowModalEgreso(false)
          resetFormEgreso()
          cargarDatos()
        }
      }
    } catch (error) {
      alert('Error al registrar el egreso')
    }
  }

  const eliminarPago = async (pagoId: string) => {
    if (confirm('¿Estás seguro de eliminar este pago?')) {
      try {
        const { error } = await supabase.from('pagos').delete().eq('id', pagoId)
        if (!error) cargarDatos()
      } catch (error) {
        alert('Error al eliminar el pago')
      }
    }
  }

  const editarPago = (pago: any) => {
    setPagoEditando(pago)
    setFormIngreso({
      paciente_id: pago.paciente_id || '',
      cuota_id: pago.cuota_id || '',
      monto: pago.monto.toString(),
      concepto: pago.concepto,
      metodo_pago: pago.metodo_pago,
      notas: pago.notas || ''
    })
    setShowModalIngreso(true)
  }

  const eliminarEgreso = async (egresoId: string) => {
    if (confirm('¿Estás seguro de eliminar este egreso?')) {
      try {
        const { error } = await supabase.from('egresos').delete().eq('id', egresoId)
        if (!error) cargarDatos()
      } catch (error) {
        alert('Error al eliminar el egreso')
      }
    }
  }

  const editarEgreso = (egreso: any) => {
    setEgresoEditando(egreso)
    setFormEgreso({
      concepto: egreso.concepto,
      monto: egreso.monto.toString(),
      categoria: egreso.categoria,
      metodo_pago: egreso.metodo_pago,
      notas: egreso.notas || ''
    })
    setShowModalEgreso(true)
  }

  const resetFormIngreso = () => {
    setFormIngreso({
      paciente_id: '',
      cuota_id: '',
      monto: '',
      concepto: 'Pago de cuota',
      metodo_pago: 'efectivo',
      notas: ''
    })
    setPagoEditando(null)
  }

  const resetFormEgreso = () => {
    setFormEgreso({
      concepto: '',
      monto: '',
      categoria: 'general',
      metodo_pago: 'efectivo',
      notas: ''
    })
    setEgresoEditando(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando sistema de pagos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <a href="/" className="flex items-center px-1 pt-1 text-white hover:text-blue-200 transition-colors">
                <span className="ml-2">🏠 Inicio</span>
              </a>
              <a href="/pacientes" className="flex items-center px-1 pt-1 text-white hover:text-blue-200 transition-colors">
                <span className="ml-2">👥 Pacientes</span>
              </a>
              <a href="/tratamientos" className="flex items-center px-1 pt-1 text-white hover:text-blue-200 transition-colors">
                <span className="ml-2">🦷 Tratamientos</span>
              </a>
              <a href="/citas" className="flex items-center px-1 pt-1 text-white hover:text-blue-200 transition-colors">
                <span className="ml-2">📅 Citas</span>
              </a>
              <div className="flex items-center px-1 pt-1 text-blue-200 border-b-2 border-blue-200">
                <span className="ml-2">💰 Pagos</span>
              </div>
              <a href="/recordatorios-whatsapp" className="flex items-center px-1 pt-1 text-white hover:text-blue-200 transition-colors">
                <span className="ml-2">📱 WhatsApp</span>
              </a>
              <a href="/analytics" className="flex items-center px-1 pt-1 text-white hover:text-blue-200 transition-colors">
                <span className="ml-2">📊 Analytics</span>
              </a>
              <a href="/analytics-metodo-pago" className="flex items-center px-1 pt-1 text-white hover:text-blue-200 transition-colors">
                <span className="ml-2">💳 Analytics Métodos</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Ingresos y egresos</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded">Hoy</button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                />
              </div>
              <button
                onClick={() => setShowModalIngreso(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded font-medium"
              >
                Nuevo ingreso
              </button>
              <button
                onClick={() => setShowModalEgreso(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium"
              >
                Egreso
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Ingreso</p>
              <p className="text-lg font-semibold text-green-600">${formatearNumero(totalIngresos)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Egreso</p>
              <p className="text-lg font-semibold text-red-600">-${formatearNumero(totalEgresos)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Neto</p>
              <p className={`text-lg font-semibold ${totalIngresos - totalEgresos >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${formatearNumero(totalIngresos - totalEgresos)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cuotas Pendientes</p>
              <p className="text-lg font-semibold text-purple-600">{cuotasPendientes.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="bg-gray-700 text-white px-6 py-4 rounded-t-lg">
            <div className="grid grid-cols-7 gap-4 text-sm font-medium">
              <div>Hora</div>
              <div>Paciente</div>
              <div>Concepto</div>
              <div>Medio de pago</div>
              <div>Comentario</div>
              <div className="text-right">Monto</div>
              <div className="text-center">Acciones</div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {pagos.map((pago) => (
              <div key={`pago-${pago.id}`} className="px-6 py-4 hover:bg-gray-50">
                <div className="grid grid-cols-7 gap-4 items-center text-sm">
                  <div className="text-gray-600">{formatearHora(pago.created_at)}</div>
                  <div className="font-medium text-gray-900">{obtenerNombrePaciente(pago)}</div>
                  <div className="text-gray-700">{pago.concepto}</div>
                  <div className="text-gray-600 capitalize">{pago.metodo_pago.replace('_', ' ')}</div>
                  <div className="text-gray-500 text-xs">{pago.notas || '-'}</div>
                  <div className="text-right font-semibold text-green-600">
                    ${formatearNumero(parseFloat(pago.monto))}
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => editarPago(pago)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarPago(pago.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {egresos.map((egreso) => (
              <div key={`egreso-${egreso.id}`} className="px-6 py-4 hover:bg-gray-50">
                <div className="grid grid-cols-7 gap-4 items-center text-sm">
                  <div className="text-gray-600">{formatearHora(egreso.created_at)}</div>
                  <div className="font-medium text-gray-900">Gasto general</div>
                  <div className="text-gray-700">{egreso.concepto}</div>
                  <div className="text-gray-600 capitalize">{egreso.metodo_pago.replace('_', ' ')}</div>
                  <div className="text-gray-500 text-xs">{egreso.notas || '-'}</div>
                  <div className="text-right font-semibold text-red-600">
                    -${formatearNumero(parseFloat(egreso.monto))}
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => editarEgreso(egreso)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarEgreso(egreso.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {pagos.length === 0 && egresos.length === 0 && (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">No hay movimientos registrados para esta fecha</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModalIngreso && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {pagoEditando ? 'Editar Ingreso' : 'Registrar Ingreso'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Paciente (opcional)</label>
                  <select
                    value={formIngreso.paciente_id}
                    onChange={(e) => setFormIngreso({...formIngreso, paciente_id: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Cliente general</option>
                    {pacientes.map(paciente => (
                      <option key={paciente.id} value={paciente.id}>{paciente.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Cuota (opcional)</label>
                  <select
                    value={formIngreso.cuota_id}
                    onChange={(e) => {
                      const cuotaSeleccionada = cuotas.find(c => c.id === e.target.value)
                      setFormIngreso({
                        ...formIngreso, 
                        cuota_id: e.target.value,
                        monto: cuotaSeleccionada ? cuotaSeleccionada.saldo_pendiente.toString() : formIngreso.monto
                      })
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Sin cuota asociada</option>
                    {cuotasPendientes.map(cuota => (
                      <option key={cuota.id} value={cuota.id}>
                        Cuota #{cuota.numero_cuota} - ${formatearNumero(cuota.saldo_pendiente)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Concepto</label>
                  <select
                    value={formIngreso.concepto}
                    onChange={(e) => setFormIngreso({...formIngreso, concepto: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="Pago de cuota">Pago de cuota</option>
                    <option value="Consulta">Consulta</option>
                    <option value="Urgencia">Urgencia</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Blanqueamiento">Blanqueamiento</option>
                    <option value="Extracción">Extracción</option>
                    <option value="Endodoncia">Endodoncia</option>
                    <option value="Implante">Implante</option>
                    <option value="Prótesis">Prótesis</option>
                    <option value="Otro servicio">Otro servicio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Monto</label>
                  <input
                    type="number"
                    value={formIngreso.monto}
                    onChange={(e) => setFormIngreso({...formIngreso, monto: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Método de pago</label>
                  <select
                    value={formIngreso.metodo_pago}
                    onChange={(e) => setFormIngreso({...formIngreso, metodo_pago: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="galicia_pay">Galicia Pay</option>
                    <option value="tarjeta_credito">Tarjeta de crédito</option>
                    <option value="tarjeta_debito">Tarjeta de débito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Comentario (opcional)</label>
                  <textarea
                    value={formIngreso.notas}
                    onChange={(e) => setFormIngreso({...formIngreso, notas: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={2}
                    placeholder="Comentarios adicionales..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowModalIngreso(false)
                    resetFormIngreso()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarIngreso}
                  disabled={!formIngreso.monto}
                  className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
                >
                  {pagoEditando ? 'Actualizar Ingreso' : 'Registrar Ingreso'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModalEgreso && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {egresoEditando ? 'Editar Egreso' : 'Registrar Egreso'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Concepto</label>
                  <input
                    type="text"
                    value={formEgreso.concepto}
                    onChange={(e) => setFormEgreso({...formEgreso, concepto: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Descripción del gasto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Monto</label>
                  <input
                    type="number"
                    value={formEgreso.monto}
                    onChange={(e) => setFormEgreso({...formEgreso, monto: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Categoría</label>
                  <select
                    value={formEgreso.categoria}
                    onChange={(e) => setFormEgreso({...formEgreso, categoria: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="materiales">Materiales</option>
                    <option value="servicios">Servicios</option>
                    <option value="alquiler">Alquiler</option>
                    <option value="sueldos">Sueldos</option>
                    <option value="impuestos">Impuestos</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Método de pago</label>
                  <select
                    value={formEgreso.metodo_pago}
                    onChange={(e) => setFormEgreso({...formEgreso, metodo_pago: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta_credito">Tarjeta de crédito</option>
                    <option value="tarjeta_debito">Tarjeta de débito</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Comentario (opcional)</label>
                  <textarea
                    value={formEgreso.notas}
                    onChange={(e) => setFormEgreso({...formEgreso, notas: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={2}
                    placeholder="Comentarios adicionales..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowModalEgreso(false)
                    resetFormEgreso()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarEgreso}
                  disabled={!formEgreso.concepto || !formEgreso.monto}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {egresoEditando ? 'Actualizar Egreso' : 'Registrar Egreso'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}