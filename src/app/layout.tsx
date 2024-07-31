import 'highlight.js/styles/github-dark.css'
import type {Metadata} from 'next'

import Root from '@/components/Root'

import './globals.css'
import './chat.css'

export const metadata: Metadata = {
  title: 'Poker Chatbot',
  description: 'Poker Chatbot',
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <Root>{children}</Root>
}
