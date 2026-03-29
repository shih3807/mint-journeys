import { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Image,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { useNavigate, useParams } from 'react-router';
import dayjs from 'dayjs';

type TransactionDetailResponse = {
  ok: boolean;
  data?: {
    id: number;
    name: string;
    trip_id: number;
    create_by: number;
    category_id: number;
    category:string;
    amount: number;
    currency_id: number;
    currency:string;
    description: string | null;
    create_at: string | null;
    image_filename: string | null;
  };
  message?: string;
};

export function TransactionDetailPage() {
  const navigate = useNavigate();
  const { transactionId } = useParams();

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const [transaction, setTransaction] =
    useState<TransactionDetailResponse['data']>(undefined);

  // 取得 token
  useEffect(() => {
    const storedToken = localStorage.getItem('token') || '';
    if (!storedToken) {
      navigate('/');
      return;
    }
    setToken(storedToken);
  }, [navigate]);

  // 讀取消費詳情
  useEffect(() => {
    if (!token || !transactionId) return;

    const fetchTransactionDetail = async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `http://localhost:8000/api/transaction/${transactionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result: TransactionDetailResponse = await res.json();

        if (res.status === 403) {
          notifications.show({
            message: result.message || '登入已失效，請重新登入',
            color: 'accent-red.5',
          });
          setTimeout(() => navigate('/'), 1500);
          return;
        }

        if (!result.ok || !result.data) {
          notifications.show({
            message: result.message || '讀取消費紀錄失敗',
            color: 'accent-red.5',
          });
          return;
        }

        setTransaction(result.data);
      } catch (error) {
        console.error(error);
        notifications.show({
          message: '讀取消費紀錄失敗',
          color: 'accent-red.5',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionDetail();
  }, [token, transactionId, navigate]);

  const handleDelete = async () => {
    if (!token || !transactionId || !transaction) return;

    setDeleting(true);

    try {
      const res = await fetch(
        `http://localhost:8000/api/transaction/${transactionId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await res.json();

      if (!result.ok) {
        notifications.show({
          message: result.message || '刪除失敗',
          color: 'accent-red.5',
        });
        return;
      }

      notifications.show({
        message: result.message || '消費紀錄已刪除',
        color: 'primary.6',
      });

      setTimeout(() => {
        navigate(`/trip/${transaction.trip_id}`);
      }, 1000);
    } catch (error) {
      console.error(error);
      notifications.show({
        message: '刪除失敗，請稍後再試',
        color: 'accent-red.5',
      });
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteConfirm = () => {
    modals.openConfirmModal({
      title: '確認刪除消費紀錄',
      centered: true,
      children: (
        <Text size="sm">刪除後將無法復原，確定要刪除這筆消費紀錄嗎？</Text>
      ),
      labels: { confirm: '確定刪除', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: handleDelete,
    });
  };

  return (
    <Container size="sm" py="xl">
      <Group justify="flex-start" mb={8}>
        <Button
          type="button"
          variant="subtle"
          size="xs"
          color="primary"
          onClick={() => navigate(-1)}
        >
          返回上一頁
        </Button>
      </Group>

      <Paper p="xl" radius={5} withBorder shadow="sm">
        <Title order={2} c="primary.9" mb="lg">
          消費紀錄詳情
        </Title>

        {loading ? (
          <Text c="dimmed">載入資料中...</Text>
        ) : !transaction ? (
          <Text c="dimmed">找不到消費紀錄</Text>
        ) : (
          <Stack gap="md">
            <Paper
              p="md"
              radius="md"
              style={{ backgroundColor: '#afc58422' }}
              withBorder
            >
              <Text size="sm" c="dimmed" mb={4}>
                消費金額
              </Text>
              <Text fw={700} size="2rem" c="primary.8">
                {transaction.amount}
              </Text>
            </Paper>

            <div>
              <Text size="sm" c="dimmed" mb={4}>
                消費名稱
              </Text>
              <Text fw={600} size="lg">
                {transaction.name || '未命名的消費'}
              </Text>
            </div>

            <Group grow align="flex-start">
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  分類
                </Text>
                <Badge variant="light" color="green">
                  {transaction.category}
                </Badge>
              </div>

              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  幣別
                </Text>
                <Badge variant="light" color="blue">
                  {transaction.currency}
                </Badge>
              </div>
            </Group>

            <Group grow align="flex-start">
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  消費日期
                </Text>
                <Text>
                  {transaction.create_at
                    ? dayjs(transaction.create_at).format('YYYY/MM/DD')
                    : '未提供'}
                </Text>
              </div>

              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  建立者
                </Text>
                <Text>{transaction.create_by}</Text>
              </div>
            </Group>

            <div>
              <Text size="sm" c="dimmed" mb={4}>
                備註
              </Text>
              <Text>{transaction.description || '無'}</Text>
            </div>

            {transaction.image_filename && (
              <div>
                <Text size="sm" c="dimmed" mb={8}>
                  附加圖片
                </Text>
                <Image
                  src={transaction.image_filename}
                  alt={transaction.name}
                  radius="md"
                />
              </div>
            )}

            <Button
              type="button"
              fullWidth
              variant="light"
              color="accent-red"
              mt="xl"
              onClick={openDeleteConfirm}
              loading={deleting}
            >
              刪除消費紀錄
            </Button>
          </Stack>
        )}
      </Paper>
    </Container>
  );
}