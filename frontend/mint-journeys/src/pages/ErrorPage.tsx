// ErrorPage.tsx
import { Button, Center, Stack, Text, Title } from '@mantine/core';
import { useRouteError, useNavigate } from 'react-router-dom';

export function ErrorPage() {
  const error = useRouteError() as unknown;
  const navigate = useNavigate();

  let message = '發生未知錯誤';

  if (error instanceof Error) {
    message = error.message;
  }

  return (
    <Center h="100vh" bg="accent-red.5">
      <Stack align="center" gap={40}>
        <Title order={1} c="#f8f8f8" style={{ fontWeight: 900 }}>錯誤頁面</Title>

        <Text c="#f8f8f8">
          {message}
        </Text>

        <Button color="secondary" onClick={() => navigate('/')}>回首頁</Button>
      </Stack>
    </Center>
  );
}
