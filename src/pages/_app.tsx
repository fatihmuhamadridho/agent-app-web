import '@styles/globals.css';
import '@mantine/core/styles.css';

import type { AppProps } from 'next/app';
import { createTheme, MantineProvider } from '@mantine/core';
import React from 'react';
import Head from 'next/head';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from '@contexts/user.context';

const theme = createTheme({});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 1000 * 60 * 20,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: 'always',
      retry: false,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <React.Fragment>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <UserProvider>
            <Component {...pageProps} />
          </UserProvider>
        </MantineProvider>
      </QueryClientProvider>
    </React.Fragment>
  );
}
