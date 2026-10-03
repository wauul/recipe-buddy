import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { LanguageProvider } from '@/components/language-provider';
import { getTranslation } from '@/lib/i18n-server';
import { SiteTools } from '@/components/site-tools';
import localFont from 'next/font/local';
const display = localFont({
  src: '../../public/fonts/bricolage-grotesque.woff2',
  variable: '--font-display',
  weight: '400 700',
  display: 'swap',
});
const body = localFont({
  src: '../../public/fonts/source-sans-3.woff2',
  variable: '--font-body',
  weight: '400 700',
  display: 'swap',
});
export const metadata: Metadata = {
  title: {
    default: 'Recipe Buddy | Your recipe box',
    template: '%s | Recipe Buddy',
  },
  description: 'Save your recipes, build a shopping list, and share favorites with friends.',
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getTranslation();
  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('rb-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}`,
          }}
        />
      </head>
      <body>
        <LanguageProvider initialLocale={locale}>
          <SiteTools />
          {children}
          <Analytics />
          <SpeedInsights />
        </LanguageProvider>
      </body>
    </html>
  );
}
