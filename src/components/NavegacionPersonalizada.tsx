import Link from 'next/link'

interface NavegacionPersonalizadaProps {
  paginaActual: string
}

export default function NavegacionPersonalizada({ paginaActual }: NavegacionPersonalizadaProps) {
  const enlaces = [
    { href: '/', label: 'Inicio', icono: '🏠', pagina: 'inicio' },
    { href: '/pacientes', label: 'Pacientes', icono: '👥', pagina: 'pacientes' },
    { href: '/tratamientos', label: 'Tratamientos', icono: '🦷', pagina: 'tratamientos' },
    { href: '/citas', label: 'Citas', icono: '📅', pagina: 'citas' },
    { href: '/pagos', label: 'Pagos', icono: '💰', pagina: 'pagos' },
    { href: '/recordatorios-whatsapp', label: 'WhatsApp', icono: '📱', pagina: 'recordatorios-whatsapp' },
    { href: '/analytics', label: 'Analytics', icono: '📊', pagina: 'analytics' },
    { href: '/analytics-metodo-pago', label: 'Analytics Métodos', icono: '💳', pagina: 'analytics-metodo-pago' }
  ]

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex space-x-8">
            {enlaces.map((enlace) => (
              <Link
                key={enlace.pagina}
                href={enlace.href}
                className={`flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                  paginaActual === enlace.pagina
                    ? 'text-blue-200 border-b-2 border-blue-200'
                    : 'text-white hover:text-blue-200'
                }`}
              >
                <span className="mr-2">{enlace.icono}</span>
                {enlace.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center">
            <div className="text-white text-sm">
              <span className="font-medium">Dr. Sistema Dental</span>
              <span className="ml-2 text-blue-200">Odontólogo</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
