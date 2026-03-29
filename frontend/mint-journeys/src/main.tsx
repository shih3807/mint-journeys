import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.tsx';

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';

import theme from './styles/theme.tsx';
import '@fontsource/merriweather';
import '@fontsource/noto-serif-tc';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

const rootElement = document.getElementById('root');

dayjs.extend(customParseFormat);


if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <MantineProvider defaultColorScheme="light" theme={theme}>
        <ModalsProvider>
          <Notifications position="top-center" zIndex={1000} />
          <App />
        </ModalsProvider>
      </MantineProvider>
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}