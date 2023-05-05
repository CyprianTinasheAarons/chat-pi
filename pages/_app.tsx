import '@/styles/base.css';
import type { AppProps } from 'next/app';
import { Inter , Playfair_Display } from 'next/font/google';
import Head from 'next/head';
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Chat UI</title>
        </Head>
      <main className={playfair.variable}>
        <Component {...pageProps} />
      </main>
    </>
  );
}

export default MyApp;
