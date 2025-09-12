// src/app/layout.tsx - Layout personalizado con branding dinámico
'use client'

import { Inter } from 'next/font/google'
import './globals.css'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const inter = Inter({ subsets: ['latin'] })

interface ConfiguracionBranding {
  nombre_empresa: string
  logo_url: string
  color_primario: string
  color_secundario: string
  favicon_url: string
  meta_description: string
  meta_keywords: string
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [branding, setBranding] = useState<ConfiguracionBranding | null>(null)

  useEffect(() => {
    cargarBranding()
  }, [])

  const cargarBranding = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('configuracion_empresa')
        .select('nombre_empresa, logo_url, color_primario, color_secundario, favicon_url, meta_description, meta_keywords')
        .single()

      if (data) {
        setBranding(data)
        aplicarBrandingDinamico(data)
      }
    } catch (error) {
      console.log('Usando configuración por defecto')
    }
  }

  const aplicarBrandingDinamico = (config: ConfiguracionBranding) => {
    // Aplicar colores CSS personalizados
    const root = document.documentElement
    root.style.setProperty('--color-primary', config.color_primario)
    root.style.setProperty('--color-secondary', config.color_secundario)
    
    // Cambiar título de la página
    document.title = config.nombre_empresa || 'Sistema Dental'
    
    // Cambiar favicon dinámicamente
    if (config.favicon_url) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
      if (favicon) {
        favicon.href = config.favicon_url
      } else {
        const newFavicon = document.createElement('link')
        newFavicon.rel = 'icon'
        newFavicon.href = config.favicon_url
        document.head.appendChild(newFavicon)
      }
    }

    // Meta tags dinámicos
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', config.meta_description || 'Sistema de gestión dental profesional')
    }

    const metaKeywords = document.querySelector('meta[name="keywords"]')
    if (metaKeywords) {
      metaKeywords.setAttribute('content', config.meta_keywords || 'dental, consultorio, gestión, pacientes')
    }
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={branding?.meta_description || 'Sistema de gestión dental profesional'} />
        <meta name="keywords" content={branding?.meta_keywords || 'dental, consultorio, gestión, pacientes'} />
        <title>{branding?.nombre_empresa || 'Sistema Dental'}</title>
        {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}
        
        {/* CSS Variables dinámicas */}
        <style jsx global>{`
          :root {
            --color-primary: ${branding?.color_primario || '#3B82F6'};
            --color-secondary: ${branding?.color_secundario || '#10B981'};
            --color-primary-hover: ${adjustColorBrightness(branding?.color_primario || '#3B82F6', -20)};
            --color-secondary-hover: ${adjustColorBrightness(branding?.color_secundario || '#10B981', -20)};
          }
          
          /* Aplicar colores personalizados */
          .bg-blue-600 { background-color: var(--color-primary) !important; }
          .bg-blue-700 { background-color: var(--color-primary-hover) !important; }
          .text-blue-600 { color: var(--color-primary) !important; }
          .border-blue-500 { border-color: var(--color-primary) !important; }
          .ring-blue-500 { --tw-ring-color: var(--color-primary) !important; }
          .focus\\:ring-blue-500:focus { --tw-ring-color: var(--color-primary) !important; }
          .focus\\:border-blue-500:focus { border-color: var(--color-primary) !important; }
          .hover\\:bg-blue-700:hover { background-color: var(--color-primary-hover) !important; }
          .hover\\:text-blue-600:hover { color: var(--color-primary) !important; }
          
          .bg-green-500 { background-color: var(--color-secondary) !important; }
          .bg-green-600 { background-color: var(--color-secondary) !important; }
          .text-green-600 { color: var(--color-secondary) !important; }
          .border-green-500 { border-color: var(--color-secondary) !important; }
        `}</style>
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}

// Función para ajustar brillo de colores
function adjustColorBrightness(color: string, percent: number): string {
  const hex = color.replace('#', '')
  const num = parseInt(hex, 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) + amt
  const G = (num >> 8 & 0x00FF) + amt
  const B = (num & 0x0000FF) + amt
  
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1)
}