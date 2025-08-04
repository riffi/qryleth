import React from 'react'
import {ActionIcon, AppShell, Button, Container, Group, Image, NavLink} from '@mantine/core'
import {IconLibrary} from "@tabler/icons-react";
import {useNavigate} from 'react-router-dom';


interface MainLayoutProps {
  children: React.ReactNode
  rightSection?: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, rightSection }) => {
  const navigate = useNavigate()

  return (
    <AppShell
      header={{ height: 60 }}
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
          <Group h="100%" justify="space-between">
            <Group gap="sm" pl={"sm"}>
              <Image src="/logo.png" h={35} />
            </Group>

            <Group gap="md">
              <Button
                  variant="subtle"
                  leftSection={<IconLibrary size={16} />}
                  onClick={() => navigate('/')}
              >
                Библиотека
              </Button>
            </Group>

            <Group gap="xs">{rightSection}</Group>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}

export default MainLayout
