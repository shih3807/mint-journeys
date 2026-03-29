import { useState, useEffect } from 'react';
import {
  TextInput,
  Button,
  Paper,
  Text,
  Container,
  Stack,
  Group,
  Title,
  Select,
  NumberInput,
  ActionIcon,
  Box,
  rem,
  Avatar,
  Image,
} from '@mantine/core';
import { useParams, useNavigate } from 'react-router';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import {
  IconPlus,
  IconTrash,
  IconCircleCheckFilled,
  IconAlertTriangleFilled,
  IconUpload,
  IconPhoto,
  IconFileBroken,
  IconArrowNarrowLeft,
} from '@tabler/icons-react';

// api回覆格式
type CurrencyApiItem = {
  currency_id: number;
  currency_name: string;
  currency_code: string;
};

type CurrencyApiResponse = {
  ok: boolean;
  data: CurrencyApiItem[];
};

type TripFormValues = {
  name: string;
  member_emails: string[];
  base_currency_id: string | null;
  budget: number | null;
  start_date: Date | null;
  end_date: Date | null;
};

type ExistingMember = {
  user_id: number;
  name: string;
  avatar: string | null;
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
      image_version: Date | null;
      budget: number | null;
      start_date: Date | null;
      end_date: Date | null;
      created_by: string;
      members?: ExistingMember[];
    };
    transactions: unknown[];
  };
  message?: string;
};

export function TripFormPage() {
  //  確認狀態：創立行程||編輯行程

  const { tripId } = useParams();
  const isEditMode = Boolean(tripId);

  // 1. 初始狀態

  const navigate = useNavigate();
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  //   貨幣
  const [currencies, setCurrencies] = useState<
    { value: string; label: string }[]
  >([]);

  //   圖片
  const [file, setFile] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  //   既有的成員
  const [existingMembers, setExistingMembers] = useState<ExistingMember[]>([]);

  //   token
  const [token, setToken] = useState<string>('');

  // 2. 初始化畫面

  //   取得token
  useEffect(() => {
    const storedToken = localStorage.getItem('token') || '';
    if (!storedToken) {
      navigate('/');
    }
    setToken(storedToken);
  }, [navigate]);

  //   取得幣值清單
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/currencies/');
        const result: CurrencyApiResponse = await res.json();

        if (!result.ok || !Array.isArray(result.data)) {
          throw new Error('幣別資料格式錯誤');
        }

        const formatted = result.data.map((c) => ({
          value: String(c.currency_id),
          label: `${c.currency_name} (${c.currency_code})`,
        }));

        setCurrencies(formatted);
      } catch (error) {
        console.error(error);
        notifications.show({
          message: '取得幣別清單失敗',
          color: 'accent-red.5',
        });
      }
    };

    fetchCurrencies();
  }, []);

  // 編輯模式取得後端資料
  useEffect(() => {
    if (!token || !isEditMode || !tripId) return;

    const fetchTripDetail = async () => {
      setLoadingTrip(true);
      try {
        const res = await fetch(`http://localhost:8000/api/trips/${tripId}`, {
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
          setTimeout(() => navigate('/'), 1500);
          return;
        }

        if (!result.ok) {
          notifications.show({
            message: result.message || '讀取旅程失敗',
            color: 'accent-red.5',
          });
          return;
        }

        const trip = result.data.trip;

        form.setValues({
          name: trip.name ?? '',
          member_emails: [''],
          base_currency_id:
            trip.base_currency_id !== undefined &&
            trip.base_currency_id !== null
              ? String(trip.base_currency_id)
              : null,
          budget: trip.budget ?? null,
          start_date: trip.start_date ? new Date(trip.start_date) : null,
          end_date: trip.end_date ? new Date(trip.end_date) : null,
        });

        setCurrentImageUrl(
          trip.image_filename
            ? `${trip.image_filename}?v=${trip.image_version}`
            : null
        );
        setExistingMembers(trip.members ?? []);
      } catch (error) {
        console.error(error);
        notifications.show({
          message: '讀取旅程失敗',
          color: 'accent-red.5',
        });
      } finally {
        setLoadingTrip(false);
      }
    };

    fetchTripDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isEditMode, tripId, navigate]);

  // 3. 函式

  //   (1) email檢查: 格式檢查 + 打 api 檢查成員是否存在
  type EmailStatus = 'idle' | 'loading' | 'valid' | 'invalid';
  const [emailStatus, setEmailStatus] = useState<Record<number, EmailStatus>>(
    {}
  );
  //   檢查成員是否存在
  const checkEmailExists = async (email: string) => {
    if (!email.trim()) return null;
    // 檢查是否登入
    if (!token) return null;

    try {
      const res = await fetch('http://localhost:8000/api/user/exists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.status === 403) {
        notifications.show({
          message: data.message || '登入已失效，請重新登入',
          color: 'accent-red.5',
        });
        setTimeout(() => navigate('/'), 1500);
        return false;
      }

      return Boolean(data.ok);
    } catch (error) {
      console.error(error);
      return false;
    }
  };
  //   email檢查
  const validateSingleEmail = async (email: string, index: number) => {
    const trimmedEmail = email.trim();
    const fieldPath = `member_emails.${index}` as const;

    form.setFieldValue(fieldPath, trimmedEmail);

    if (!trimmedEmail) {
      form.clearFieldError(fieldPath);
      setEmailStatus((prev) => ({
        ...prev,
        [index]: 'idle',
      }));
      return true;
    }

    if (
      !/^\w+((-\w+)|(\.\w+))*@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z]+$/.test(
        trimmedEmail
      )
    ) {
      form.setFieldError(fieldPath, 'Email 格式錯誤');
      setEmailStatus((prev) => ({
        ...prev,
        [index]: 'invalid',
      }));
      return false;
    }

    setEmailStatus((prev) => ({
      ...prev,
      [index]: 'loading',
    }));

    const exists = await checkEmailExists(trimmedEmail);

    if (!exists) {
      form.setFieldError(fieldPath, '查無此用戶');
      setEmailStatus((prev) => ({
        ...prev,
        [index]: 'invalid',
      }));
      return false;
    }

    form.clearFieldError(fieldPath);
    setEmailStatus((prev) => ({
      ...prev,
      [index]: 'valid',
    }));

    return true;
  };

  //  (2) 上傳圖片
  const uploadTripImage = async (targetTripId: string | number) => {
    if (!file || !token) return true;

    const formData = new FormData();
    formData.append('file', file);

    const imgRes = await fetch(
      `http://localhost:8000/api/trips/${targetTripId}/image`,
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

  // (3)刪除圖片
  const handleDeleteImage = async () => {
    if (!token || !tripId) return;

    try {
      const res = await fetch(
        `http://localhost:8000/api/trips/${tripId}/image`,
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
          message: result.message || '刪除圖片失敗',
          color: 'accent-red.5',
        });
        return;
      }

      setCurrentImageUrl(null);
      setFile(null);

      notifications.show({
        message: '已刪除封面圖片',
        color: 'primary.6',
      });
    } catch (error) {
      console.error(error);
      notifications.show({
        message: '刪除圖片失敗',
        color: 'accent-red.5',
      });
    }
  };

  // (4)新增成員
  const addTripMembers = async (
    targetTripId: string | number,
    memberEmails: string[] | null
  ) => {
    if (!memberEmails || memberEmails.length === 0 || !token) return true;

    const res = await fetch(
      `http://localhost:8000/api/trips/${targetTripId}/members`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ member_emails: memberEmails }),
      }
    );

    const result = await res.json();

    if (!result.ok) {
      notifications.show({
        message: result.message || '新增成員失敗',
        color: 'accent-red.5',
      });
      return false;
    }

    return true;
  };

  // (5)離開旅程
  const handleLeaveTrip = async () => {
    if (!token || !tripId) return;

    try {
      const res = await fetch(`http://localhost:8000/api/trips/${tripId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();

      if (!result.ok) {
        notifications.show({
          message: result.message || '退出行程失敗',
          color: 'accent-red.5',
        });
        return;
      }

      notifications.show({
        message: result.message || '成功退出行程！',
        color: 'primary.6',
      });

      setTimeout(() => navigate('/home'), 1500);
    } catch (error) {
      console.error(error);
      notifications.show({
        message: '退出行程失敗，請稍後再試',
        color: 'accent-red.5',
      });
    }
  };
  const openLeaveConfirm = () => {
    modals.openConfirmModal({
      title: '確認退出行程',
      centered: true,
      children: <Text size="sm">退出後將無法再存取此行程，確定要退出嗎？</Text>,
      labels: { confirm: '確定退出', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: handleLeaveTrip, // 👉 按確認才執行
    });
  };

  //  4. 表格設定

  const form = useForm<TripFormValues>({
    initialValues: {
      name: '',
      member_emails: [''],
      base_currency_id: null,
      budget: null,
      start_date: null,
      end_date: null,
    },
    validate: {
      name: (name: string) => (name.trim() ? null : '請輸入行程名稱'),
      end_date: (end_date: Date | null, values) => {
        if (values.start_date && end_date && end_date < values.start_date) {
          return '結束日期不可早於開始日期';
        }
        return null;
      },
      budget: (budget: number | null) =>
        budget !== null && budget < 0 ? '預算不能小於 0' : null,
    },
  });

  //  5. 送出表單

  const handleSubmit = async (values: TripFormValues) => {
    setSubmitting(true);

    // 驗證信箱是否存在
    for (let i = 0; i < values.member_emails.length; i++) {
      const email = values.member_emails[i];
      const status = emailStatus[i] || 'idle';

      if (!email) continue;

      if (status === 'valid') continue;

      if (status === 'loading') {
        notifications.show({
          message: '共同編輯者 Email 尚在驗證中，請稍候',
          color: 'secondary.3',
        });
        return;
      }

      const ok = await validateSingleEmail(email, i);

      if (!ok) {
        notifications.show({
          message: '請先修正共同編輯者 Email',
          color: 'accent-red.5',
        });
        return;
      }
    }

    // 將空值濾掉
    const cleanedEmails = values.member_emails
      .map((email) => email.trim())
      .filter((email) => email);

    // ['']=null
    const finalEmails = cleanedEmails.length ? cleanedEmails : null;

    try {
      // 確認是否登入
      if (!token) {
        notifications.show({
          message: '登入已失效，請重新登入',
          color: 'accent-red.5',
        });
        setTimeout(() => navigate('/'), 1500);
        return;
      }

      // 編輯模式
      if (isEditMode && tripId) {
        const payload = {
          name: values.name.trim(),
          base_currency_id: values.base_currency_id
            ? Number(values.base_currency_id)
            : null,
          budget: values.budget !== null ? Number(values.budget) : null,
          start_date: values.start_date,
          end_date: values.end_date,
        };

        const patchRes = await fetch(
          `http://localhost:8000/api/trips/${tripId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );

        const patchResult = await patchRes.json();

        if (!patchResult.ok) {
          notifications.show({
            message: patchResult.message || '更新失敗，請稍後再試',
            color: 'accent-red.5',
          });
          return;
        }

        const memberOk = await addTripMembers(tripId, finalEmails);
        if (!memberOk) return;

        const imageOk = await uploadTripImage(tripId);
        if (!imageOk) return;

        notifications.show({
          message: '旅程更新成功！',
          color: 'primary.6',
        });

        setTimeout(() => navigate('/home'), 1500);
        return;
      }

      // 建立模式
      const payload = {
        ...values,
        member_emails: finalEmails,
        base_currency_id: values.base_currency_id
          ? Number(values.base_currency_id)
          : (values.base_currency_id = null),
        budget: values.budget ? Number(values.budget) : (values.budget = null),
      };

      const res = await fetch('http://localhost:8000/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const tripResult = await res.json();

      if (res.status === 403) {
        notifications.show({
          message: '登入已失效，請重新登入',
          color: 'accent-red.5',
        });
        setTimeout(() => navigate('/'), 1500);
        return;
      }

      if (!tripResult.ok) {
        notifications.show({
          message: tripResult.message || '建立失敗，請稍後再試',
          color: 'accent-red.5',
        });
        return;
      }

      if (file && tripResult.trip_id) {
        const imageOk = await uploadTripImage(tripResult.trip_id);
        if (!imageOk) return;
      }

      notifications.show({
        message: '行程建立成功！',
        color: 'primary.6',
      });

      setTimeout(() => {
        navigate('/home');
      }, 1500);
    } catch (error) {
      console.log('handleSubmitError: ', error);
      notifications.show({
        message: '建立失敗，請稍後再試',
        color: 'accent-red.5',
      });
    }finally {
    setSubmitting(false);
  }
  };

  // 6. 元件

  //   email表格
  const emailFields = form.values.member_emails.map((_, index) => {
    const fieldPath = `member_emails.${index}` as const;
    const emailState = emailStatus[index] || 'idle';

    return (
      <Group key={index} mt="xs">
        <TextInput
          placeholder="friend@example.com"
          style={{ flex: 1 }}
          {...form.getInputProps(fieldPath)}
          //   每格進行型別檢查
          onBlur={(e) => validateSingleEmail(e.currentTarget.value, index)}
          onChange={(e) => {
            const value = e.currentTarget.value;
            form.setFieldValue(fieldPath, value);

            setEmailStatus((prev) => ({
              ...prev,
              [index]: 'idle',
            }));
          }}
          //   不同狀態顯示不同畫面
          rightSection={
            emailState === 'loading' ? (
              <Text size="xs" c="dimmed">
                檢查中，請稍候
              </Text>
            ) : emailState === 'valid' ? (
              <IconCircleCheckFilled size={20} color="#6a7c47" />
            ) : emailState === 'invalid' ? (
              <IconAlertTriangleFilled size={20} color="#ba847b" />
            ) : null
          }
          rightSectionWidth={90}
        />
        {/* 只有最後一個格子有刪除鍵 */}
        {index !== 0 && index === form.values.member_emails.length - 1 ? (
          <ActionIcon
            type="button"
            variant="subtle"
            color="accent-red"
            onClick={() => {
              form.removeListItem('member_emails', index);

              setEmailStatus((prev) => {
                const next = { ...prev };
                delete next[index];
                return next;
              });
            }}
            disabled={form.values.member_emails.length === 1}
          >
            <IconTrash size={18} />
          </ActionIcon>
        ) : (
          <Box w={29} />
        )}
      </Group>
    );
  });

  // 7. return

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
          onClick={() => navigate('/home')}
        >
          返回首頁
        </Button>
      </Group>
      <Paper p="xl" radius={5} withBorder shadow="sm">
        <Title order={2} c="primary.9" mb="lg">
          {isEditMode ? '編輯旅程' : '新增旅程'}
        </Title>
        {loadingTrip ? (
          <Text c="dimmed">載入旅程資料中...</Text>
        ) : (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label="行程名稱 *"
                placeholder="例如：芬蘭極光之旅🇫🇮"
                {...form.getInputProps('name')}
              />
              {isEditMode && existingMembers.length > 0 && (
                <Box>
                  <Text size="sm" fw={500} mb={6}>
                    目前成員
                  </Text>

                  <Stack gap="xs">
                    {existingMembers.map((member) => (
                      <Group key={member.user_id}>
                        <Avatar src={member.avatar} radius="xl" size="sm" />
                        <Text size="sm">{member.name}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Box>
              )}
              <Box>
                <Text size="sm" fw={400} mb={4}>
                  {isEditMode
                    ? '新增共同編輯者 Email（多選）'
                    : '共同編輯者 Email（多選）'}
                </Text>

                {emailFields}

                <Button
                  type="button"
                  variant="subtle"
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  mt="xs"
                  color="primary"
                  onClick={() => form.insertListItem('member_emails', '')}
                >
                  新增欄位
                </Button>
              </Box>

              <Group grow align="flex-start">
                <Select
                  label="預算幣別"
                  data={currencies}
                  placeholder="請選擇幣別"
                  {...form.getInputProps('base_currency_id')}
                />

                <NumberInput
                  label="預算金額"
                  placeholder="0.00"
                  {...form.getInputProps('budget')}
                />
              </Group>

              <Group grow align="flex-start">
                <DateInput
                  label="開始日期"
                  placeholder="YYYY/MM/DD"
                  valueFormat="YYYY/MM/DD"
                  {...form.getInputProps('start_date')}
                />

                <DateInput
                  label="結束日期"
                  placeholder="YYYY/MM/DD"
                  valueFormat="YYYY/MM/DD"
                  {...form.getInputProps('end_date')}
                />
              </Group>

              <Box>
                <Text size="sm" fw={400} mb={8}>
                  {isEditMode && currentImageUrl && !file
                    ? '編輯封面圖片'
                    : '上傳封面圖片'}
                </Text>
                {isEditMode && currentImageUrl && !file && (
                  <Group mb="sm" align="center" justify="center">
                    <Image
                      src={currentImageUrl}
                      alt="目前封面"
                      radius="md"
                      h={180}
                      w={570}
                      fit="cover"
                    />

                    <ActionIcon
                      type="button"
                      variant="light"
                      color="red"
                      size="lg"
                      onClick={handleDeleteImage}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                )}

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
              </Box>

              <Button
                type="submit"
                fullWidth
                color="primary"
                size="md"
                mt="xl"
                loading={submitting}
              >
                {isEditMode ? '儲存變更' : '建立行程'}
              </Button>
              {isEditMode && (
                <Button
                  type="button"
                  fullWidth
                  variant="light"
                  color="accent-red"
                  onClick={openLeaveConfirm}
                >
                  退出行程
                </Button>
              )}
            </Stack>
          </form>
        )}
      </Paper>
    </Container>
  );
}
