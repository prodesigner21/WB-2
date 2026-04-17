/**
 * app/layout.tsx
 * Root layout — fonts, global styles, providers.
 */
import type { Metadata } from 'next'
import { Syne, Outfit } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-outfit',
})

export const metadata: Metadata = {
  title: 'Wealth Building LLC — Member Platform',
  description: 'Private member-based financial coordination and wealth-building platform.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${outfit.variable}`}>
      <body className="bg-vault-950 text-white font-body antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0d1628',
              color: '#f9fafb',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#0d1628' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0d1628' } },
          }}
        />
      </body>
    </html>
  )
}
