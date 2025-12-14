import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Xenco Blog CMS',
  description: 'Multi-tenant blog management system powered by Payload CMS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
