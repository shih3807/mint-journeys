import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.tsx';
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import theme from './styles/theme.tsx';
import '@fontsource/merriweather';
import '@fontsource/noto-serif-tc';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <MantineProvider defaultColorScheme="light" theme={theme}>
        <Notifications position="top-center" zIndex={1000} />
        <App />
      </MantineProvider>
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}
