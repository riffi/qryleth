import React from 'react'
import {AppShell, Container, Group, Image} from '@mantine/core'


interface MainLayoutProps {
  children: React.ReactNode
  rightSection?: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, rightSection }) => {
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
              {/*<IconBrain size={24} color="var(--mantine-color-gray-6)" />*/}
              {/*<Title order={3} c="gray.5">*/}
              {/*  Qryleth 3D*/}
              {/*</Title>*/}
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
