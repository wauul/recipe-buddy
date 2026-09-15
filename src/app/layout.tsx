import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { SiteTools } from '@/components/site-tools';
export const metadata: Metadata = { title: { default: 'Recipe Buddy — Good food. Good mood.', template: '%s | Recipe Buddy' }, description: 'Your private recipe box, playful sous-chef, and shopping list buddy.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:`try{document.documentElement.dataset.theme=localStorage.getItem('rb-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{}`}} /></head><body><SiteTools />{children}<Analytics /><SpeedInsights /></body></html>; }
