'use client'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Sistema Dental - Inicio
          </h1>
          <nav className="flex space-x-8">
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1"
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
              className="text-gray-600 hover:text-blue-600 font-medium border-b-2 border-transparent hover:border-blue-300 pb-1 transition-all"
            >
              Tratamientos
            </button>
            <button className="text-gray-400 font-medium border-b-2 border-transparent pb-1 cursor-not-allowed">
              Citas
            </button>
          </nav>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div 
            onClick={() => window.location.href = '/pacientes'}
            className="bg-white p-6 rounded-lg shadow-sm border cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="flex items-center mb-4">
              <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Pacientes</h3>
                <p className="text-sm text-gray-500">Total registrados</p>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-blue-600">2</p>
              <p className="text-sm text-blue-600 group-hover:text-blue-700 transition-colors">
                Gestionar →
              </p>
            </div>
          </div>

          <div 
            onClick={() => window.location.href = '/tratamientos'}
            className="bg-white p-6 rounded-lg shadow-sm border cursor-pointer hover:shadow-md hover:border-green-200 transition-all group"
          >
            <div className="flex items-center mb-4">
              <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Tratamientos</h3>
                <p className="text-sm text-gray-500">En curso</p>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-green-600">0</p>
              <p className="text-sm text-green-600 group-hover:text-green-700 transition-colors">
                Gestionar →
              </p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-orange-50 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 6v6m-4-6v6m8-6v6" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Citas Hoy</h3>
                <p className="text-sm text-gray-500">Programadas</p>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-orange-600">0</p>
              <p className="text-sm text-gray-400">
                Próximamente
              </p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Ingresos</h3>
                <p className="text-sm text-gray-500">Este mes</p>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-purple-600">$0</p>
              <p className="text-sm text-gray-400">
                Próximamente
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-50 rounded-lg mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Bienvenido al Sistema Dental
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Este es tu panel de control profesional. Desde aquí podrás gestionar pacientes, 
            crear tratamientos con planes de pago personalizados y administrar tu consultorio de forma eficiente y moderna.
          </p>
        </div>
      </main>
    </div>
  )
}