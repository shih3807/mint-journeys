import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  BackgroundImage,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
  Select,
  Center,
  ActionIcon,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { useNavigate, useParams } from 'react-router';
import {
  IconCalendar,
  IconChartBar,
  IconCoins,
  IconNotebook,
  IconArrowNarrowLeft,
  IconPlus,
} from '@tabler/icons-react';
import background from '../assets/background.webp';
import { BarChart, DonutChart, LineChart } from '@mantine/charts';
import dayjs from 'dayjs';

// 資料格式
type TripMember = {
  user_id: number;
  name: string;
  avatar: string | null;
};

type TransactionItem = {
  id: number;
  name: string;
  amount: number;
  currency: string;
  description: string | null;
  transaction_date: string;
  category: string;
  user: string;
};

type TripDetailResponse = {
  ok: boolean;
  data: {
    trip: {
      id: number;
      name: string;
      base_currency_id?: number | null;
      base_currency?: string | null;
      image_filename: string | null;
      image_version: string | null;
      budget: number | null;
      start_date: string | null;
      end_date: string | null;
      created_by: string;
      members?: TripMember[];
    };
    transactions: TransactionItem[];
  };
  message?: string;
};

type AnalysisResponse = {
  ok: boolean;
  data: {
    summary: {
      total_amount: number;
      total_count: number;
      avg_amount: number;
      currency: string | null;
    };
    category_breakdown: {
      category: string;
      amount: number;
      count: number;
    }[];
    user_breakdown: {
      user: string;
      amount: number;
      count: number;
    }[];
    timeline: {
      date: string;
      amount: number;
    }[];
    filters: {
      users: string[];
      categories: string[];
    };
  };
  message?: string;
};

export function TripDetailPage() {
  // 1. 初始狀態

  const { tripId } = useParams();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<TripDetailResponse['data']['trip'] | null>(
    null
  );
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  const [activeTab, setActiveTab] = useState<string | null>('records');

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse['data'] | null>(
    null
  );

  //   分析格式
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  // 2. 初始化畫面

  useEffect(() => {
    const storedToken = localStorage.getItem('token') || '';
    if (!storedToken) {
      navigate('/');
      return;
    }
    setToken(storedToken);
  }, [navigate]);

  useEffect(() => {
    if (!token || !tripId) return;

    const fetchTripDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/trips/${tripId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result: TripDetailResponse = await res.json();

        if (res.status === 403) {
          notifications.show({
            message: result.message || '登入已失效，請重新登入',
            color: 'accent-red.5',
          });
          navigate('/');
          return;
        }

        if (!result.ok) {
          notifications.show({
            message: result.message || '讀取旅程失敗',
            color: 'accent-red.5',
          });
          return;
        }

        setTrip(result.data.trip);
        setTransactions(result.data.transactions);
      } catch (error) {
        console.error(error);
        notifications.show({
          message: '讀取旅程失敗',
          color: 'accent-red.5',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTripDetail();
  }, [token, tripId, navigate]);

  const fetchAnalysis = async () => {
    if (!token || !tripId) return;

    setAnalysisLoading(true);
    try {
      const params = new URLSearchParams();

      if (selectedUser) params.append('user', selectedUser);
      if (selectedCategory) params.append('category', selectedCategory);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await fetch(
        `/api/trips/${tripId}/analytics?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result: AnalysisResponse = await res.json();

      if (!result.ok) {
        notifications.show({
          message: result.message || '讀取消費分析失敗',
          color: 'accent-red.5',
        });
        return;
      }

      setAnalysis(result.data);
    } catch (error) {
      console.error(error);
      notifications.show({
        message: '讀取消費分析失敗',
        color: 'accent-red.5',
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analysis' && !analysis && token && tripId) {
      fetchAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token, tripId]);

  const coverImage = useMemo(() => {
    if (!trip?.image_filename) {
      return background;
    }
    return `${trip.image_filename}?v=${trip.image_version ?? ''}`;
  }, [trip]);

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Group mb="md">
          <Button
            type="button"
            variant="subtle"
            size="xs"
            leftSection={<IconArrowNarrowLeft size={14} />}
            mt="xs"
            color="primary"
            onClick={() => navigate('/home')}
          >
            返回首頁
          </Button>
        </Group>
        <Paper p="xl" withBorder radius="5px" bg={'primary.0'}>
          <Group justify="center">
            <Loader color="primary.9" />
          </Group>
        </Paper>
      </Container>
    );
  }

  if (!trip) {
    return (
      <Center h="100vh" bg="accent-red.5">
        <Stack align="center" gap={40}>
          <Title order={1} c="#f8f8f8" style={{ fontWeight: 900 }}>
            錯誤頁面
          </Title>

          <Text c="#f8f8f8">找不到行程資料</Text>

          <Button color="secondary" onClick={() => navigate('/')}>
            回首頁
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
      }}
    >
      <Container size="lg" py="xl">
        <Group mb="md">
          <Button
            type="button"
            variant="subtle"
            size="xs"
            leftSection={<IconArrowNarrowLeft size={14} />}
            mt="xs"
            color="primary"
            onClick={() => navigate('/home')}
          >
            返回首頁
          </Button>
        </Group>

        <Paper
          radius="5px"
          withBorder
          style={{
            overflow: 'hidden',
            background: '#fdf2ea',
            borderColor: '#6a7c47',
          }}
        >
          <BackgroundImage
            src={coverImage}
            h={280}
            radius="5px"
            style={{
              position: 'relative',
              borderBottom: `1px solid #6a7c47`,
            }}
          >
            <Box
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                gap: 12,
                padding: 28,
                background: '#88a0a021',
              }}
            >
              <Title
                order={1}
                style={{
                  color: 'white',
                  letterSpacing: '0.02em',
                  fontWeight: 700,
                }}
              >
                {trip.name}
              </Title>

              <Group gap="sm">
                <Badge
                  variant="white"
                  color="gray"
                  leftSection={<IconCoins size={14} />}
                >
                  幣別：{trip.base_currency || '-'}
                </Badge>

                <Badge
                  variant="white"
                  color="gray"
                  leftSection={<IconCalendar size={14} />}
                >
                  {trip.start_date
                    ? dayjs(trip.start_date).format('YYYY/MM/DD')
                    : '-'}
                  {' ～ '}
                  {trip.end_date
                    ? dayjs(trip.end_date).format('YYYY/MM/DD')
                    : '-'}
                </Badge>
              </Group>
            </Box>
          </BackgroundImage>

          <Box p="xl">
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mb="xl">
              <Card
                radius="5px"
                withBorder
                style={{
                  borderColor: '#afc584',
                }}
              >
                <Stack gap={6}>
                  <Text size="sm" c="dimmed">
                    預算
                  </Text>
                  <Text fw={600}>
                    {trip.budget !== null
                      ? `${trip.budget} ${trip.base_currency || ''}`
                      : '未設定'}
                  </Text>
                </Stack>
              </Card>

              <Card
                radius="5px"
                withBorder
                style={{
                  borderColor: '#afc584',
                }}
              >
                <Stack gap={6}>
                  <Text size="sm" c="dimmed">
                    成員
                  </Text>
                  <Group gap="xs">
                    {(trip.members && trip.members.length > 0
                      ? trip.members
                      : []
                    ).map((member) => (
                      <Avatar
                        key={member.user_id}
                        src={member.avatar}
                        radius="xl"
                        size="sm"
                        name={member.name}
                      />
                    ))}
                    {(!trip.members || trip.members.length === 0) && (
                      <Text fw={600}>個人旅程</Text>
                    )}
                  </Group>
                </Stack>
              </Card>
            </SimpleGrid>

            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              styles={{
                list: {
                  gap: 8,
                  paddingBottom: 0,
                },
                panel: {
                  background: '#f8f8f8',
                },
              }}
            >
              <Tabs.List grow>
                <Tabs.Tab
                  value="records"
                  leftSection={<IconNotebook size={16} />}
                  style={{
                    background: activeTab === 'records' ? '#f8f8f8' : '#afc584',
                    color: activeTab === 'records' ? '#afc584' : '#f8f8f8',
                    borderRadius: '12px 12px 0 0',
                    padding: '12px 18px',
                    fontWeight: 600,
                    position: 'relative',
                    top: 1,
                    zIndex: activeTab === 'records' ? 2 : 1,
                  }}
                >
                  所有消費紀錄
                </Tabs.Tab>

                <Tabs.Tab
                  value="analysis"
                  leftSection={<IconChartBar size={16} />}
                  style={{
                    background:
                      activeTab === 'analysis' ? '#f8f8f8' : '#afc584',
                    color: activeTab === 'analysis' ? '#afc584' : '#f8f8f8',
                    borderRadius: '12px 12px 0 0',
                    padding: '12px 18px',
                    fontWeight: 600,
                    position: 'relative',
                    top: 1,
                    zIndex: activeTab === 'analysis' ? 2 : 1,
                  }}
                >
                  消費分析
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="records" pt="xl">
                <Stack gap="md">
                  {transactions.length === 0 ? (
                    <Center h={100}>
                      <Text c="dimmed">目前還沒有消費紀錄</Text>
                    </Center>
                  ) : (
                    transactions.map((item) => (
                      <Paper
                        key={item.id}
                        radius="5px"
                        p="lg"
                        mr="10px"
                        ml="10px"
                        style={{
                          background: '#cbd7d7',
                          cursor: 'pointer',
                        }}
                        onClick={() => navigate(`/transaction/${item.id}`)}
                      >
                        <Group justify="space-between" align="flex-start">
                          <Stack gap={4}>
                            <Text fw={600} size="lg" c="#6b7e7e">
                              {item.name || '未命名的消費'}
                            </Text>

                            <Group gap="xs">
                              <Badge variant="light" color="#839958">
                                {item.category}
                              </Badge>
                              <Badge variant="light" color="#839958">
                                {item.user}
                              </Badge>
                              <Text size="sm" c="dimmed">
                                {item.transaction_date
                                  ? dayjs(item.transaction_date).format(
                                      'YYYY/MM/DD'
                                    )
                                  : '未提供日期'}
                              </Text>
                            </Group>
                          </Stack>

                          <Text fw={700} size="lg" style={{ color: '#839958' }}>
                            {item.amount} {item.currency}
                          </Text>
                        </Group>
                      </Paper>
                    ))
                  )}
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="analysis" pt="xl" pr="sm" pl="sm">
                <Paper p="lg" mb={20}>
                  <Stack gap="md">
                    <Title order={4}>篩選條件</Title>

                    <SimpleGrid cols={{ base: 1, md: 4 }}>
                      <Select
                        label="消費對象"
                        placeholder="全部"
                        data={analysis?.filters.users ?? []}
                        value={selectedUser}
                        onChange={setSelectedUser}
                        clearable
                      />

                      <Select
                        label="消費類別"
                        placeholder="全部"
                        data={analysis?.filters.categories ?? []}
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        clearable
                      />

                      <DateInput
                        label="開始日期"
                        placeholder="YYYY/MM/DD"
                        value={startDate}
                        onChange={setStartDate}
                        valueFormat="YYYY/MM/DD"
                        clearable
                      />

                      <DateInput
                        label="結束日期"
                        placeholder="YYYY/MM/DD"
                        value={endDate}
                        onChange={setEndDate}
                        valueFormat="YYYY/MM/DD"
                        clearable
                      />
                    </SimpleGrid>

                    <Group justify="flex-end">
                      <Button
                        variant="light"
                        color="primary"
                        onClick={() => {
                          setSelectedUser(null);
                          setSelectedCategory(null);
                          setStartDate(null);
                          setEndDate(null);
                        }}
                      >
                        清除條件
                      </Button>
                      <Button
                        color="primary"
                        onClick={fetchAnalysis}
                        loading={analysisLoading}
                      >
                        套用查詢
                      </Button>
                    </Group>
                  </Stack>
                </Paper>

                {analysisLoading ? (
                  <Group justify="center" py="xl">
                    <Loader color="#839958" />
                  </Group>
                ) : analysis ? (
                  <Stack gap="lg">
                    <SimpleGrid cols={{ base: 1, md: 3 }}>
                      <Card
                        radius="lg"
                        style={{
                          background: '#cbd7d7',
                        }}
                      >
                        <Text size="sm" c="dimmed">
                          總消費金額
                        </Text>
                        <Text fw={700} size="1.6rem" c="#839958">
                          {analysis.summary.total_amount}{' '}
                          {analysis.summary.currency || ''}
                        </Text>
                      </Card>

                      <Card
                        radius="lg"
                        style={{
                          background: '#cbd7d7',
                        }}
                      >
                        <Text size="sm" c="dimmed">
                          總筆數
                        </Text>
                        <Text fw={700} size="1.6rem" c={'#839958'}>
                          {analysis.summary.total_count}
                        </Text>
                      </Card>

                      <Card
                        radius="lg"
                        style={{
                          background: '#cbd7d7',
                        }}
                      >
                        <Text size="sm" c="dimmed">
                          平均每筆
                        </Text>
                        <Text fw={700} size="1.6rem" c={'#839958'}>
                          {analysis.summary.avg_amount}{' '}
                          {analysis.summary.currency || ''}
                        </Text>
                      </Card>
                    </SimpleGrid>

                    <SimpleGrid cols={{ base: 1, md: 2 }}>
                      <Paper
                        radius="lg"
                        p="lg"
                        style={{
                          background: '#cbd7d7',
                        }}
                      >
                        <Title order={4} mb="md">
                          依類別分析
                        </Title>
                        <BarChart
                          h={320}
                          data={analysis.category_breakdown}
                          dataKey="category"
                          series={[
                            {
                              name: 'amount',
                              label: '金額',
                              color: 'primary.6',
                            },
                          ]}
                          tickLine="y"
                          gridAxis="xy"
                        />
                      </Paper>

                      <Paper
                        radius="lg"
                        p="lg"
                        style={{
                          background: '#cbd7d7',
                        }}
                      >
                        <Title order={4} mb="md">
                          依對象分析
                        </Title>
                        <DonutChart
                          size={260}
                          thickness={26}
                          data={analysis.user_breakdown.map((item, index) => ({
                            name: item.user,
                            value: item.amount,
                            color: [
                              'primary.6',
                              'secondary.6',
                              'accent-blue.6',
                              'accent-red.9',
                              'accent-grey.6',
                            ][index % 5],
                          }))}
                          mx="auto"
                        />
                      </Paper>
                    </SimpleGrid>

                    <Paper
                      radius="lg"
                      p="lg"
                      style={{
                        background: '#cbd7d7',
                      }}
                    >
                      <Title order={4} mb="md">
                        時間趨勢
                      </Title>
                      <LineChart
                        h={320}
                        data={analysis.timeline}
                        dataKey="date"
                        series={[
                          { name: 'amount', label: '金額', color: 'primary.6' },
                        ]}
                        curveType="linear"
                        tickLine="xy"
                        gridAxis="xy"
                      />
                    </Paper>
                  </Stack>
                ) : (
                  <Center h={100}>
                    <Text c="dimmed">尚無分析資料</Text>
                  </Center>
                )}
              </Tabs.Panel>
            </Tabs>
          </Box>
        </Paper>
      </Container>
      <ActionIcon
        size={58}
        radius="xl"
        color="primary"
        variant="filled"
        onClick={() =>
          navigate(
            `/transaction/${tripId}/new?c=${trip.base_currency}&i=${trip.base_currency_id}`
          )
        }
        style={{
          position: 'fixed',
          right: 40,
          bottom: 40,
          boxShadow: '0 8px 20px rgba(10, 51, 35, 0.2)',
          zIndex: 100,
        }}
        aria-label="新增消費"
      >
        <IconPlus size={28} />
      </ActionIcon>
    </Box>
  );
}
