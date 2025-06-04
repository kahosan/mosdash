import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import { Toaster } from './components/ui/sonner';

import './index.css';
import { ThemeProvider } from './components/theme-provider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark">
      <App />
      <Toaster position="top-right" />
    </ThemeProvider>
  </StrictMode>
);
