import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import App from '@/app/App'
import { BrowserRouter } from 'react-router-dom'
import { initializeMaterials } from '@/shared/lib/materials'
import { initializePalettes } from '@/shared/lib/palette'
import { initializeLeafTextures, initializeLandscapeTextures, initializeWoodTextures } from '@/shared/lib/textures'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: 'system-ui, sans-serif',
})

// Инициализируем глобальные материалы при старте приложения
initializeMaterials()
// Инициализируем глобальные палитры при старте приложения
initializePalettes()
// Инициализируем реестр текстур листвы при старте приложения
initializeLeafTextures()
// Инициализируем реестр текстур ландшафта при старте приложения
initializeLandscapeTextures()
// Инициализируем реестр текстур коры при старте приложения
initializeWoodTextures()

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <Notifications />
          <App />
        </MantineProvider>
      </BrowserRouter>
    </React.StrictMode>,
)
