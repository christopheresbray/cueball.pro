import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './app'

const theme = createTheme({
  palette: {
    primary: {
      main: '#1e3a8a', // Deep blue
    },
    secondary: {
      main: '#10b981', // Emerald green
    },
    background: {
      default: '#f4f5f7', // Light background
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: {
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
          fontFamily: '"Inter", sans-serif',
        }
      }),
    },
  },
})

// Add the font link to the document head
const fontLink = document.createElement('link')
fontLink.rel = 'stylesheet'
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap'
document.head.appendChild(fontLink)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter future={{ 
        v7_startTransition: true,
        v7_relativeSplatPath: true 
      }}>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
)