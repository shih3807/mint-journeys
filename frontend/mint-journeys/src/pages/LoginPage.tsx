import {
  Button,
  Text,
  Container,
  Anchor,
  Box,
  Image
} from '@mantine/core';
import { useNavigate } from "react-router";
import title from "../assets/title.webp";


export function LoginPage() {
  const navigate = useNavigate();
  return (
    <Box
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}
    >
      <Container size={420}>
        <Image src={title} w={300} />

        <Button w="280" size="md" mt="xl" color="primary" onClick={()=>navigate("/auth?type=login")}>
          登入
        </Button>

        <Text ta="center" mt="md" size="sm" c="dimmed">
          還沒有帳號嗎？{' '}
          <Anchor component="button" fw={700} c="secondary.6" onClick={()=>navigate("/auth?type=register")}>
            立即註冊
          </Anchor>
        </Text>
      </Container>
    </Box>
  );
}
