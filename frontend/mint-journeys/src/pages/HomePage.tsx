import { useEffect, useState } from 'react';
import {
  Card,
  Image,
  Text,
  Group,
  Container,
  Title,
  SimpleGrid,
  Avatar,
  ActionIcon,
  Menu,
  Stack,
  Box,
  Loader,
  Divider,
  Center,
} from '@mantine/core';
import {
  IconDotsVertical,
  IconCalendar,
  IconEdit,
  IconInfoCircle,
  IconPlus,
  IconPlaneFilled,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import background from '../assets/background.png';

// api回覆格式
type Trip = {
  id: number;
  name: string;
  start_date: Date | null;
  end_date: Date | null;
  currency: string | null;
  budget: number | null;
  image_filename: string | null;
  image_version: Date | null;
  members?: { user_id: number; name: string; avatar: string | null }[];
};

export function HomePage() {
  const [data, setData] = useState<{
    trips: Trip[];
    shareTrips: Trip[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 渲染畫面
  useEffect(() => {
    // 先確定有沒有登入
    const storedToken = localStorage.getItem('token') || '';
    if (!storedToken) {
      window.location.href = '/';
    }

    // 取得行程資料
    const fetchTrips = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/trips', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        const result = await res.json();

        if (res.status === 403) {
          notifications.show({
            message: result.message || '登入已失效，請重新登入',
            color: 'accent-red.5',
          });
          setTimeout(() => (window.location.href = '/'), 1500);
          return;
        }

        if (result.ok) {
          setData(result.data);
        }
      } catch (error) {
        notifications.show({
          message: '無法讀取旅程資料',
          color: 'accent-red.5',
        });
        console.log('fetchTripError:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  // 取得通知
  useEffect(() => {
    const storedToken = localStorage.getItem('token');

    if (!storedToken) {
      window.location.href = '/';
      return;
    }

    const fetchNotifications = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/notifications', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        const result = await res.json();

        if (res.status === 403) {
          notifications.show({
            message: result.message || '登入已失效，請重新登入',
            color: 'accent-red.5',
          });

          setTimeout(() => (window.location.href = '/'), 1500);
          return;
        }

        if (result.ok && result.notification.length > 0) {
          result.notification.forEach((msg: string) => {
            notifications.show({
              message: msg,
              color: 'accent-blue.5',
              autoClose: false,
            });
          });
        }
      } catch (error) {
        console.log('fetchNotifications error:', error);
      }
    };

    fetchNotifications();
  }, []);

  // 行程卡片
  const TripCard = ({ trip, isShared }: { trip: Trip; isShared: boolean }) => (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
      onClick={() => navigate(`/trip/${trip.id}`)}
      onMouseEnter={(e) =>
        (e.currentTarget.style.transform = 'translateY(-4px)')
      }
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <Card.Section>
        <Image
          src={
            trip.image_filename
              ? `${trip.image_filename}?v=${trip.image_version}`
              : background
          }
          height={160}
          alt={trip.name}
          fallbackSrc="https://placehold.co/400x160?font=playfair-display&text=Mint+Journey"
        />
      </Card.Section>

      <Stack gap="xs" mt="md">
        <Group justify="space-between" align="flex-start">
          <Text fw={700} size="lg" c="primary.9" lineClamp={1}>
            {trip.name}
          </Text>

          <Menu shadow="md" width={200} withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={(e) => e.stopPropagation()}
              >
                <IconDotsVertical size={20} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
              <Menu.Label>旅程資訊</Menu.Label>
              <Menu.Item leftSection={<IconInfoCircle size={14} />}>
                預算: {trip.budget || 0} {trip.currency}
              </Menu.Item>
              <Divider />
              <Menu.Item
                leftSection={<IconEdit size={14} />}
                onClick={() => navigate(`/trip/${trip.id}/edit`)}
              >
                編輯旅程
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        <Group gap={5} c="dimmed">
          <IconCalendar size={14} />
          <Text size="xs">
            {trip.start_date
              ? `${trip.start_date} ~ ${trip.end_date || ''}`
              : '尚未設定日期'}
          </Text>
        </Group>

        {isShared && trip.members && (
          <Avatar.Group mt="sm">
            {trip.members.map((member) => (
              <Avatar
                key={member.user_id}
                src={member.avatar}
                alt={member.name}
                radius="xl"
                size="sm"
              />
            ))}
          </Avatar.Group>
        )}
      </Stack>
    </Card>
  );

  // 無行程畫面
  const EmptyTrips = () => (
    <Center p={0} style={{ minHeight: 220 }}>
      <Text size="sm" c="primary.6">
        目前還沒有行程，開始規劃一個吧！
      </Text>
    </Center>
  );

  // 載入畫面
  if (loading)
    return (
      <Center style={{ height: '100vh' }}>
        <Loader color="primary" />
      </Center>
    );

  return (
    <Box style={{ minHeight: '100vh', position: 'relative' }} pb="xl">
      <Container size="lg" py="xl">
        <Stack gap="xl">
          <section>
            <Group gap={10} mb="md" align="center">
              <IconPlaneFilled size={20} color="#6a7c47" />
              <Title order={3} c="primary.8">
                我的行程
              </Title>
            </Group>

            {data?.trips && data.trips.length > 0 ? (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                {data.trips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} isShared={false} />
                ))}
              </SimpleGrid>
            ) : (
              <EmptyTrips />
            )}
          </section>

          <Divider my="xs" />

          <section>
            <Group gap={10} mb="md" align="center">
              <IconPlaneFilled size={20} color="#6a7c47" />
              <Title order={3} c="primary.8">
                與我共享的行程
              </Title>
            </Group>

            {data?.shareTrips && data.shareTrips.length > 0 ? (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                {data.shareTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} isShared />
                ))}
              </SimpleGrid>
            ) : (
              <EmptyTrips />
            )}
          </section>
        </Stack>
      </Container>

      <ActionIcon
        size={58}
        radius="xl"
        color="primary"
        variant="filled"
        onClick={() => navigate('/trip/new')}
        style={{
          position: 'fixed',
          right: 40,
          bottom: 40,
          boxShadow: '0 8px 20px rgba(10, 51, 35, 0.2)',
          zIndex: 100,
        }}
        aria-label="新增行程"
      >
        <IconPlus size={28} />
      </ActionIcon>
    </Box>
  );
}
