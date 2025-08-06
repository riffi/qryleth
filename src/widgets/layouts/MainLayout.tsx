import React, { useState } from 'react'
import {ActionIcon, AppShell, Button, Container, Group, Image, NavLink, Paper, Box, Divider} from '@mantine/core'
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

  return (
    <AppShell
      header={{ height: 50 }}
      padding="sm"
      styles={{
        main: {
          display: 'flex',
          flexDirection: 'column',
          height: '100vh'
        }
      }}
    >
      <AppShell.Header>
        <Container size="xl" h="100%" fluid>
          <Group h="100%" justify="space-between" px="lg">
            <Group gap="md" style={{ alignItems: 'center' }}>
              <Box style={{
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Image src="/logo.png" h={32} />
              </Box>
            </Group>

            <Group gap="sm" style={{height:'100%'}}>
              <Button
                variant="light"
                color="blue"
                size="sm"
                radius={0}
                leftSection={<IconLibrary size={18} />}
                onClick={() => navigate('/')}
                style={{
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  },
                  height: "100%",
                }}
              >
                Библиотека
              </Button>
              <Button
                variant="light"
                color="violet"
                size="sm"
                radius={0}
                leftSection={<IconSettings size={18} />}
                onClick={() => setSettingsOpened(true)}
                style={{
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                  },
                  height: "100%",
                }}
              >
                Настройки LLM
              </Button>
            </Group>

            <Group gap="sm" style={{ minWidth: '120px', justifyContent: 'flex-end' }}>
              {rightSection}
            </Group>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>{children}</AppShell.Main>
      <OpenAISettingsModal opened={settingsOpened} onClose={() => setSettingsOpened(false)} />
    </AppShell>
  )
}

export default MainLayout
