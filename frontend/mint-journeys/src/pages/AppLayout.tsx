import { AppShell, Group, Container, Image } from '@mantine/core';
import { useNavigate, Outlet } from 'react-router-dom';
import title from '../assets/title.webp';

export function AppLayout() {
  const navigate = useNavigate();

  return (
    <AppShell header={{ height: 60 }} footer={{ height: 50 }} padding="md">
      <AppShell.Header>
        <Group
          h="100%"
          px="md"
          pl="xl"
          justify="space-between"
          style={{
            backgroundColor: '#9ab66594',
          }}
        >
          <Image
            src={title}
            w={80}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/home')}
          />
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="md">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
