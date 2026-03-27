import { ThemeProvider } from '@/components/theme-provider'
import { ReactQueryProvider } from './react-query-provider'
import { WalletProvider } from '../contexts/WalletContext'
import React from 'react'

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ReactQueryProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <WalletProvider>{children}</WalletProvider>
      </ThemeProvider>
    </ReactQueryProvider>
  )
}
