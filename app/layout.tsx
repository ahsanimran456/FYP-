import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: 'TalentHub - AI-Powered Recruitment Platform',
    template: '%s | TalentHub',
  },
  description: 'TalentHub is an AI-powered recruitment platform that connects talented professionals with amazing opportunities. Streamline your hiring process with smart matching, one-click applications, and intelligent candidate screening.',
  keywords: [
    'recruitment',
    'job search',
    'hiring platform',
    'AI recruitment',
    'job matching',
    'talent acquisition',
    'HR technology',
    'career opportunities',
    'job portal',
    'applicant tracking',
    'resume screening',
    'interview scheduling',
    'UAE jobs',
    'Dubai jobs',
    'remote jobs',
  ],
  authors: [{ name: 'TalentHub Team' }],
  creator: 'TalentHub',
  publisher: 'TalentHub',
  applicationName: 'TalentHub',
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  metadataBase: new URL('https://talentedhubcom.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://talentedhubcom.vercel.app',
    siteName: 'TalentHub',
    title: 'TalentHub - AI-Powered Recruitment Platform',
    description: 'Connect with top talent and amazing job opportunities. AI-powered matching, smart screening, and seamless hiring experience.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TalentHub - AI-Powered Recruitment Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TalentHub - AI-Powered Recruitment Platform',
    description: 'Connect with top talent and amazing job opportunities. AI-powered matching and seamless hiring.',
    images: ['/og-image.png'],
    creator: '@talenthub',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
  category: 'technology',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
