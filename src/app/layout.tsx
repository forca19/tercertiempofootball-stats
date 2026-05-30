import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tercer Tiempo Football Stats',
  description: 'Panel de estadísticas de equipos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={dmSans.className}>{children}</body>
    </html>
  )
}
