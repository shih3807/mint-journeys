import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Text,
  Container,
  Stack,
  Anchor,
  Box,
  Title,
  Image,
} from '@mantine/core';
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import icon from '../assets/icon.webp';

// 資料格式
type AuthFormValues = {
  name: string;
  email: string;
  password: string;
};

export function AuthPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  // 狀態切換
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('type');
  const [type, setType] = useState<string>(
    mode === 'login' ? 'login' : 'register'
  );
  const toggle = () => {
    setType((prev) => (prev === 'login' ? 'register' : 'login'));
  };

  // 表格設定
  const form = useForm<AuthFormValues>({
    initialValues: {
      email: 'test@test.com',
      name: '測試帳號',
      password: 'test123',
    },

    validate: {
      email: (email: string) => {
        if (!email.trim()) {
          return '請輸入電子信箱';
        }
        if (
          !/^\w+((-\w+)|(\.\w+))*@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z]+$/.test(
            email
          )
        ) {
          return '請輸入正確的信箱格式';
        }
        return null;
      },
      password: (password: string) => (!password.trim() ? '請輸入密碼' : null),
      name: (name: string) =>
        type === 'register' && !name.trim() ? '請輸入姓名' : null,
    },
  });

  // 送出表單
  const handleAuthSubmit = async (values: typeof form.values) => {
    setSubmitting(true);
    // 登入
    try {
      if (type === 'login') {
        const data = JSON.stringify({
          email: values.email,
          password: values.password,
        });
        try {
          const loginAPI = 'http://localhost:8000/api/auth/login';
          const res = await fetch(loginAPI, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data,
          });
          const result = await res.json();

          const success = 'primary.6';
          const fail = 'accent-red.5';

          if (result.error) {
            notifications.show({
              message: result.message,
              color: fail,
            });
          } else {
            localStorage.setItem('token', result.token);
            notifications.show({
              message: '登入成功，正在導向...',
              color: success,
            });
            setTimeout(() => {
              navigate('/home', { replace: true });
            }, 1500);
          }
        } catch (error) {
          notifications.show({
            message: '伺服器連線失敗，請稍後再試',
            color: 'accent-red.5',
          });
          console.log('loginError:', error);
        }
        // 註冊
      } else {
        const data = JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        });
        try {
          const registerAPI = 'http://localhost:8000/api/auth/register';
          const res = await fetch(registerAPI, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data,
          });
          const result = await res.json();

          const success = 'primary.6';
          const fail = 'accent-red.5';

          if (result.error) {
            notifications.show({
              message: result.message,
              color: fail,
            });
          } else {
            notifications.show({
              message: '註冊成功！請返回登入',
              color: success,
            });
            toggle();
          }
        } catch (error) {
          notifications.show({
            message: '伺服器連線失敗，請稍後再試',
            color: 'accent-red.5',
          });
          console.log('registerError:', error);
        }
      }
    } catch (error) {
      notifications.show({
        message: '伺服器連線失敗，請稍後再試',
        color: 'accent-red.5',
      });
      console.log('authError:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Container size={700}>
        <Paper w={400} p="xl" withBorder shadow="sm">
          <Stack align="center" mb="xl">
            <Image src={icon} w={60} />
            <Title order={2} c="primary.9">
              {type === 'login' ? '登入系統' : '建立新帳號'}
            </Title>
          </Stack>

          <form onSubmit={form.onSubmit((values) => handleAuthSubmit(values))}>
            <Stack>
              {type === 'register' && (
                <TextInput
                  label="姓名"
                  placeholder="您的姓名"
                  size="md"
                  {...form.getInputProps('name')}
                />
              )}

              <TextInput
                label="電子信箱"
                placeholder="測試帳號：test@test.com"
                size="md"
                {...form.getInputProps('email')}
              />

              <PasswordInput
                label="密碼"
                placeholder="測試密碼：test123"
                size="md"
                {...form.getInputProps('password')}
              />
            </Stack>

            <Button
              fullWidth
              size="md"
              mt="xl"
              color="primary"
              type="submit"
              loading={submitting}
            >
              {type === 'login' ? '登入' : '註冊'}
            </Button>
          </form>

          <Box ta="center" mt="xl">
            <Text size="md" c="dimmed" display="inline">
              {type === 'login' ? '還沒有帳號嗎？' : '已經有帳號了？'}
            </Text>
            <Anchor
              component="button"
              type="button"
              fw={700}
              c="secondary.6"
              ml={5}
              onClick={() => {
                toggle();
                form.reset();
              }}
            >
              {type === 'login' ? '立即註冊' : '返回登入'}
            </Anchor>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
