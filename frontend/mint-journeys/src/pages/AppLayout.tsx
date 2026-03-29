import {
  AppShell,
  Group,
  Container,
  Image,
  Button,
  Title,
} from '@mantine/core';
import { useNavigate, Outlet } from 'react-router-dom';
import icon from '../assets/icon.webp';

export function AppLayout() {
  const navigate = useNavigate();

  return (
    <AppShell header={{ height: 60 }} footer={{ height: 50 }} padding="md">
      <AppShell.Header>
        <Group
          h="100%"
          pl="xl"
          pr="xl"
          justify="space-between"
          style={{
            backgroundColor: '#9ab66594',
          }}
        >
          <Group
            h="100%"
            pl="xl"
            pr="xl"
            gap={16}
            align="center"
            onClick={() => navigate('/home')}
          >
            <Image src={icon} w={28} style={{ cursor: 'pointer' }} />
            <Title order={3} c="#0a3323" style={{ fontWeight: 900 }}>
              Mint Journeys
            </Title>
          </Group>
          <Button
            color='accent-red'
            onClick={() => {
              window.localStorage.removeItem('token');
              window.location.href = '/';
            }}
          >
            登出
          </Button>
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
