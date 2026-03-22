import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        gutter={12}
        containerStyle={{
          top: 18,
          right: 18,
        }}
        position="top-right"
        toastOptions={{
          duration: 3200,
          style: {
            background: '#212121',
            color: '#FFFFFF',
            border: '1px solid rgba(201, 168, 76, 0.28)',
            borderRadius: '18px',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '13px',
            fontWeight: 500,
            padding: '14px 16px',
            boxShadow: '0 18px 40px rgba(0, 0, 0, 0.28)',
          },
          success: {
            iconTheme: { primary: '#C9A84C', secondary: '#1A1A1A' },
            style: {
              border: '1px solid rgba(201, 168, 76, 0.38)',
            },
          },
          error: {
            iconTheme: { primary: '#9E4D4D', secondary: '#FFFFFF' },
            style: {
              border: '1px solid rgba(158, 77, 77, 0.52)',
            },
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
)
