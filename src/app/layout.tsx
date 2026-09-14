import type { Metadata } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
export const metadata: Metadata = { title: { default: 'Recipe Buddy — Good food. Good mood.', template: '%s | Recipe Buddy' }, description: 'Your private recipe box, playful sous-chef, and shopping list buddy.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}<SpeedInsights /></body></html>; }
