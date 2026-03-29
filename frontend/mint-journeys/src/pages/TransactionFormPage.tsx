import { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Stack,
  TextInput,
  Select,
  NumberInput,
  Button,
  Group,
  Text,
  rem,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import {
  IconArrowNarrowLeft,
  IconUpload,
  IconFileBroken,
  IconPhoto,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import dayjs from 'dayjs';

type CategoryApiItem = {
  category_id: number;
  category_name: string;
};

type CategoryApiResponse = {
  ok: boolean;
  data: CategoryApiItem[];
};

type TransactionFormValues = {
  amount: number | null;
  name: string;
  category_id: string | null;
  description: string;
  transaction_date: Date | null;
};

export function TransactionFormPage() {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [categories, setCategories] = useState<
    { value: string; label: string }[]
  >([]);

  // 從 query string 取得旅程幣別
  const rawCurrency = searchParams.get('c');
  const baseCurrency =
    rawCurrency && rawCurrency !== 'null' ? rawCurrency : 'TWD';

  const rawCurrencyId = searchParams.get('i');
  const baseCurrencyId =
    rawCurrencyId && rawCurrencyId !== 'null' ? Number(rawCurrencyId) : 1;

  // 取得 token
  useEffect(() => {
    const storedToken = localStorage.getItem('token') || '';
    if (!storedToken) {
      navigate('/');
      return;
    }
    setToken(storedToken);
  }, [navigate]);

  // 取得分類
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/categories');
        const result: CategoryApiResponse = await res.json();

        if (!result.ok || !Array.isArray(result.data)) {
          throw new Error('分類資料格式錯誤');
        }

        const formatted = result.data.map((c) => ({
          value: String(c.category_id),
          label: c.category_name,
        }));

        setCategories(formatted);
      } catch (error) {
        console.error(error);
        notifications.show({
          message: '取得分類失敗',
          color: 'accent-red.5',
        });
      }
    };

    fetchCategories();
  }, []);

  // 上傳圖片
  const uploadTripImage = async (targetTripId: string | number) => {
    if (!file || !token) return true;

    const formData = new FormData();
    formData.append('file', file);

    const imgRes = await fetch(
      `http://localhost:8000/api/transaction/${targetTripId}/image`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const imgResult = await imgRes.json();

    if (imgResult.status === 403) {
      notifications.show({
        message: '登入已失效，請重新登入',
        color: 'accent-red.5',
      });
      setTimeout(() => navigate('/'), 1500);
      return false;
    }

    if (!imgResult.ok) {
      notifications.show({
        message: imgResult.message || '建立失敗，請稍後再試',
        color: 'accent-red.5',
      });
      return false;
    }
    return true;
  };

  const form = useForm<TransactionFormValues>({
    initialValues: {
      amount: null,
      name: '',
      category_id: null,
      description: '',
      transaction_date: new Date(),
    },
    validate: {
      amount: (value) => {
        if (value === null || value === undefined) return '請輸入消費金額';
        if (value <= 0) return '消費金額需大於 0';
        return null;
      },
      name: (value) => (!value.trim() ? '請輸入消費名稱' : null),
      category_id: (value) => (!value ? '請選擇分類' : null),
    },
  });

  const handleSubmit = async (values: TransactionFormValues) => {
    setSubmitting(true);

    try {
      if (!token) {
        notifications.show({
          message: '登入已失效，請重新登入',
          color: 'accent-red.5',
        });
        setTimeout(() => navigate('/'), 1500);
        return;
      }

      if (!tripId) {
        notifications.show({
          message: '找不到旅程資料',
          color: 'accent-red.5',
        });
        return;
      }

      const currency_number = baseCurrencyId ? Number(baseCurrencyId) : 1;

      const payload = {
        trip_id: Number(tripId),
        name: values.name.trim(),
        category_id: Number(values.category_id),
        amount: Number(values.amount),
        currency_id: currency_number,
        description: values.description.trim() || null,
        transaction_date: values.transaction_date
          ? dayjs(values.transaction_date).format('YYYY-MM-DD')
          : null,
      };

      const res = await fetch('http://localhost:8000/api/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.status === 403) {
        notifications.show({
          message: result.message || '登入已失效，請重新登入',
          color: 'accent-red.5',
        });
        setTimeout(() => navigate('/'), 1500);
        return;
      }

      if (!result.ok) {
        notifications.show({
          message: result.message || '新增失敗',
          color: 'accent-red.5',
        });
        return;
      }

      if (file && result.transaction_id) {
        const imageOk = await uploadTripImage(result.transaction_id);
        if (!imageOk) return;
      }

      notifications.show({
        message: '消費紀錄新增成功！',
        color: 'primary.6',
      });

      setTimeout(() => {
        navigate(`/trip/${tripId}`);
      }, 1000);
    } catch (error) {
      console.error(error);
      notifications.show({
        message: '新增失敗，請稍後再試',
        color: 'accent-red.5',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Group justify="flex-start" mb={8}>
        <Button
          type="button"
          variant="subtle"
          size="xs"
          leftSection={<IconArrowNarrowLeft size={14} />}
          mt="xs"
          color="primary"
          onClick={() => navigate(`/trip/${tripId}`)}
        >
          返回旅程
        </Button>
      </Group>

      <Paper p="xl" radius={5} withBorder shadow="sm">
        <Title order={2} c="primary.9" mb="lg">
          新增消費紀錄
        </Title>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <NumberInput
              label="消費金額 *"
              placeholder="0.00"
              size="lg"
              thousandSeparator=","
              decimalScale={2}
              fixedDecimalScale={false}
              styles={{
                input: {
                  minHeight: 56,
                  fontSize: '1.25rem',
                  fontWeight: 600,
                },
              }}
              {...form.getInputProps('amount')}
            />

            <TextInput
              label="消費名稱 *"
              placeholder="例如：晚餐、計程車、飯店住宿"
              size="md"
              {...form.getInputProps('name')}
            />

            <Group grow align="flex-start">
              <Select
                label="消費分類 *"
                placeholder="請選擇分類"
                data={categories}
                {...form.getInputProps('category_id')}
              />

              <TextInput label="旅程幣別" value={baseCurrency} readOnly />
            </Group>

            <Group grow align="flex-start">
              <DateInput
                label="消費日期"
                placeholder="YYYY/MM/DD"
                valueFormat="YYYY/MM/DD"
                {...form.getInputProps('transaction_date')}
              />
            </Group>

            <TextInput
              label="備註"
              placeholder="可補充店家、同行人、用途..."
              {...form.getInputProps('description')}
            />

            <Dropzone
              onDrop={(files) => setFile(files[0] || null)}
              onReject={() => {
                notifications.show({
                  message: '請確認上傳檔案格式',
                  color: 'accent-red.5',
                });
              }}
              maxSize={10 * 1024 ** 2}
              accept={[
                MIME_TYPES.png,
                MIME_TYPES.jpeg,
                MIME_TYPES.webp,
                MIME_TYPES.gif,
              ]}
              multiple={false}
            >
              <Group
                justify="center"
                gap="xl"
                mih={160}
                style={{
                  pointerEvents: 'none',
                  backgroundColor: '#afc58422',
                }}
              >
                <Dropzone.Accept>
                  <IconUpload
                    style={{ width: rem(52), height: rem(52) }}
                    stroke={1}
                  />
                </Dropzone.Accept>

                <Dropzone.Reject>
                  <IconFileBroken
                    style={{ width: rem(52), height: rem(52) }}
                    stroke={1}
                  />
                </Dropzone.Reject>

                <Dropzone.Idle>
                  <IconPhoto
                    style={{ width: rem(52), height: rem(52) }}
                    stroke={1}
                  />
                </Dropzone.Idle>

                <div>
                  <Text size="m" inline>
                    拖曳圖片到這裡，或點擊選擇檔案
                  </Text>
                  <Text size="sm" c="dimmed" inline mt={7}>
                    僅限圖片檔，單檔最大 10MB
                  </Text>
                  {file && (
                    <Text size="sm" mt="sm" c="primary.6">
                      已選擇：{file.name}
                    </Text>
                  )}
                </div>
              </Group>
            </Dropzone>

            <Button
              type="submit"
              fullWidth
              color="primary"
              size="md"
              mt="xl"
              loading={submitting}
            >
              新增消費
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
