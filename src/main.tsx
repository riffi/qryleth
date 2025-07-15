import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import App from './App'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: 'system-ui, sans-serif',
})

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MantineProvider theme={theme}  defaultColorScheme="dark">
        <Notifications />
        <App />
      </MantineProvider>
    </React.StrictMode>,
)
