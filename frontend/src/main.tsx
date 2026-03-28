import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AntdAppProvider } from './app/AntdAppProvider.tsx'
import { QueryProvider } from './app/QueryProvider.tsx'
import './index.css'
import App from './app/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <AntdAppProvider>
        <App />
      </AntdAppProvider>
    </QueryProvider>
  </StrictMode>,
)
