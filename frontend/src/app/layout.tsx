import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { OnboardingTour } from '@/components/onboarding-tour'
import { PasswordGate } from '@/components/password-gate'
import './globals.css'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Scolastica - Contenuti educativi con AI',
  description: 'Genera presentazioni, quiz, sottotitoli e molto altro a partire da qualsiasi documento',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body className={inter.variable}>
        <PasswordGate>
          <TooltipProvider>
            <OnboardingTour>
              {children}
            </OnboardingTour>
          </TooltipProvider>
        </PasswordGate>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
