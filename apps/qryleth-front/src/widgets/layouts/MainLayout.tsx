import React, { useState, useEffect } from 'react'
import {AppShell, Container, Group, Image, NavLink, Box, Burger} from '@mantine/core'
import {IconLibrary, IconSettings} from "@tabler/icons-react";
import {useNavigate} from 'react-router-dom';
import { OpenAISettingsModal } from '@/widgets/OpenAISettingsModal'


interface MainLayoutProps {
  children: React.ReactNode
  rightSection?: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, rightSection }) => {
  const navigate = useNavigate()
  const [settingsOpened, setSettingsOpened] = useState(false)
  const [sidebarOpened, setSidebarOpened] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && sidebarOpened) {
        setSidebarOpened(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarOpened])

  const handleNavigation = (path: string) => {
    navigate(path)
    setSidebarOpened(false)
  }

  const handleSettingsOpen = () => {
    setSettingsOpened(true)
    setSidebarOpened(false)
  }

  return (
    <AppShell
      header={{ height: 49 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !sidebarOpened, desktop: !sidebarOpened }
      }}
      padding="sm"
      styles={{
        main: {
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh'
        }
      }}
    >
      <AppShell.Header
        style={{
          backdropFilter: 'blur(8px)',
          background: 'color-mix(in srgb, var(--mantine-color-dark-7) 85%, transparent)',
          borderBottom: '1px solid var(--mantine-color-dark-5)'
        }}
      >
        <Container size="xl" h="100%" fluid>
          <Group h="100%" justify="space-between" px="sm">
            <Group gap="md" style={{ alignItems: 'center' }}>
              <Burger
                opened={sidebarOpened}
                lineSize={1}
                onClick={() => setSidebarOpened(!sidebarOpened)}
                size="sm"
                color="white"
                aria-label={sidebarOpened ? 'Закрыть меню' : 'Открыть меню'}
              />
              <Box style={{
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Image src="/logo.png" h={32} alt="Qryleth" />
              </Box>
            </Group>

            <Group gap="sm" style={{ minWidth: '120px', justifyContent: 'flex-end' }}>
              {rightSection}
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ backgroundColor: 'var(--mantine-color-dark-7)', borderRight: '1px solid var(--mantine-color-dark-5)' }}>
        <Box style={{ flexGrow: 1 }}>
          <NavLink
            label="Библиотека"
            leftSection={<IconLibrary size={20} />}
            onClick={() => handleNavigation('/')}
            style={{
              borderRadius: '8px',
              marginBottom: '8px',
              transition: 'all 0.2s ease',
            }}
          />
          <NavLink
            label="Настройки LLM"
            leftSection={<IconSettings size={20} />}
            onClick={handleSettingsOpen}
            style={{
              borderRadius: '8px',
              marginBottom: '8px',
              transition: 'all 0.2s ease',
            }}
          />
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
      <OpenAISettingsModal opened={settingsOpened} onClose={() => setSettingsOpened(false)} />
    </AppShell>
  )
}

export default MainLayout
