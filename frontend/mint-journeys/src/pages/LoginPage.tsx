import {
  Button,
  Text,
  Container,
  Box,
  Image,
  Title,
  SimpleGrid,
  Paper,
  Group,
  Stack,
  ThemeIcon,
  Divider,
  Badge,
} from '@mantine/core';
import {
  IconBrandGithub,
  IconArrowRight,
  IconUserCircle,
  IconRoute,
  IconMailShare,
  IconNotebook,
  IconChartDonut3,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import title from '../assets/title.webp';
import background from '../assets/background.webp';
import login from '../assets/login.mp4';
import analyza from '../assets/analyze.mp4';
import notification from '../assets/notification.mp4';
import photo_upload from '../assets/photo_upload.mp4';
import verify from '../assets/verify.mp4';

const featureSlides = [
  {
    video: notification,
    title: '多人協作記帳',
    subtitle: '每次登入帳號，都可能收到來自他人邀請共同記帳的通知',
  },
  {
    video: verify,
    title: '透過電子信箱邀請協作',
    subtitle: '錯誤的格式或非用戶的信箱都會提前進行驗證',
  },
  {
    video: photo_upload,
    title: '圖片上傳功能',
    subtitle: '每筆消費都可以透過圖片與文字留下美好回憶',
  },
  {
    video: analyza,
    title: '消費分析圖表',
    subtitle: '用視覺化方式快速理解整趟旅程的支出分布',
  },
];
const steps = [
  {
    icon: IconUserCircle,
    title: '註冊 / 登入帳號',
    description: '快速建立帳號，或使用測試帳號，開始規劃屬於自己的旅程。',
  },
  {
    icon: IconRoute,
    title: '建立旅程',
    description: '新增行程名稱、時間與幣別，為每一次旅行建立清楚的記帳空間。',
  },
  {
    icon: IconMailShare,
    title: '邀請旅伴加入',
    description: '透過電子信箱邀請朋友協作，共同記帳一起留下旅遊回憶。',
  },
  {
    icon: IconNotebook,
    title: '記錄花費與回憶',
    description:
      '每一筆支出都能加入金額、分類、圖片與文字筆記，讓記帳更有溫度。',
  },
  {
    icon: IconChartDonut3,
    title: '查看分析圖表',
    description: '透過圖表快速掌握花費比例，回顧整趟旅程的消費分布。',
  },
];

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <Box
      bg="primary.0"
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at top left, rgba(175,197,132,0.18), transparent 23%),
            radial-gradient(circle at top right, rgba(211,150,140,0.12), transparent 28%),
            radial-gradient(circle at bottom right, rgba(16,86,102,0.10), transparent 26%)
          `,
          pointerEvents: 'none',
        }}
      />
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(10, 51, 35, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(10, 51, 35, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
          maskImage:
            'linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.1))',
          pointerEvents: 'none',
        }}
      />

      <Container size="lg" py={60} style={{ position: 'relative', zIndex: 1 }}>
        <SimpleGrid
          cols={{ base: 1, md: 2 }}
          spacing={50}
          verticalSpacing={50}
          pt={70}
          pb={70}
        >
          <Stack justify="center" align="start" gap="lg">
            <Image src={title} w={300} fit="contain" mb={16} />

            <Stack gap="xs" justify="center">
              <Title order={3} fw={900} c="accent-blue.8" lh={1} maw={620}>
                一個專為為旅遊而生的記帳網站
              </Title>

              <Text size="md" c="accent-grey.8" maw={580} lh={1.9}>
                支援圖片、文字與多人協作記帳。
              </Text>
            </Stack>

            <Group gap="md" mt="sm">
              <Button
                size="md"
                radius="5px"
                color="accent-blue"
                rightSection={<IconArrowRight size={18} />}
                onClick={() => navigate('/auth?type=login')}
              >
                立即登入
              </Button>

              <Button
                size="md"
                radius="5px"
                variant="default"
                onClick={() => {
                  window.open(
                    'https://github.com/shih3807/mint-journeys',
                    '_blank'
                  );
                }}
                leftSection={<IconBrandGithub size={18} />}
              >
                GitHub
              </Button>
            </Group>

            <Text size="sm" c="dimmed">
              有測試帳號可體驗，歡迎先往下閱覽功能介紹與使用流程
            </Text>
          </Stack>

          {/* 首圖 */}
          {login ? (
            <video
              src={login}
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: '100%',
                borderRadius: '12px',
              }}
            />
          ) : (
            <Image src={background} />
          )}
        </SimpleGrid>

        <Divider my={80} color="primary.6" />
        {/* 使用流程 */}
        <Stack gap="xs" mb="xl">
          <Text c="secondary.6" fw={700} tt="uppercase" size="sm">
            Workflow
          </Text>
          <Title order={2} c="accent-blue.8">
            流程簡單，輕鬆上手
          </Title>
        </Stack>

        <Stack gap="md">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <Paper
                key={step.title}
                p="lg"
                radius="5px"
                withBorder
                style={{
                  background: 'rgba(255,255,255,0.78)',
                  borderColor: 'rgba(16, 86, 102, 0.12)',
                }}
              >
                <Group align="flex-start" wrap="nowrap" gap="md">
                  <ThemeIcon size={50} radius="5px" variant="light">
                    <Icon size={24} />
                  </ThemeIcon>

                  <Box style={{ flex: 1 }}>
                    <Group gap="sm" mb={6}>
                      <Badge color="secondary" variant="light" radius="5px">
                        Step {index + 1}
                      </Badge>
                      <Text fw={700} c="accent-blue.8">
                        {step.title}
                      </Text>
                    </Group>

                    <Text size="sm" c="accent-grey.8" lh={1.8}>
                      {step.description}
                    </Text>
                  </Box>
                </Group>
              </Paper>
            );
          })}
        </Stack>

        <Divider my={80} color="primary.6" />

        {/* 功能介紹 */}
        <Stack gap="xs" mb="xl">
          <Text c="secondary.6" fw={700} tt="uppercase" size="sm">
            Features
          </Text>
          <Title order={2} c="accent-blue.8">
            特色功能，保留回憶
          </Title>
        </Stack>

        <Stack gap={40}>
          {featureSlides.map((feature, index) => {
            const isReversed = index % 2 === 1;

            return (
              <Paper
                key={feature.title}
                radius="5px"
                p={{ base: 'md', sm: 'xl' }}
                withBorder
                shadow="xs"
                style={{
                  background: 'rgba(255,255,255,0.82)',
                  borderColor: 'rgba(111,79,73,0.10)',
                }}
              >
                <SimpleGrid
                  cols={{ base: 1, md: 2 }}
                  spacing={{ base: 'lg', md: 40 }}
                  verticalSpacing="lg"
                >
                  {/* 圖片區 */}
                  <Box style={{ order: isReversed ? 2 : 1 }}>
                    {feature.video ? (
                      <video
                        src={feature.video}
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{
                          width: '100%',
                          borderRadius: '12px',
                        }}
                      />
                    ) : (
                      <Image src={background} />
                    )}
                  </Box>

                  {/* 文字區 */}
                  <Stack
                    justify="center"
                    gap="md"
                    style={{ order: isReversed ? 1 : 2 }}
                    pl={50}
                  >
                    <Badge
                      variant="light"
                      color="secondary"
                      radius="5px"
                      w="fit-content"
                    >
                      Feature {index + 1}
                    </Badge>

                    <Box>
                      <Title order={3} c="accent-blue.8" mb={8}>
                        {feature.title}
                      </Title>
                      <Text fw={600} c="secondary.7" mb="sm">
                        {feature.subtitle}
                      </Text>
                    </Box>
                  </Stack>
                </SimpleGrid>
              </Paper>
            );
          })}
        </Stack>

        <Divider my={80} color="primary.6" />

        {/* 結尾 CTA */}
        <Box p={{ base: 'xl', md: '2rem' }}>
          <Stack align="center" gap="md">
            <Title order={3} ta="center" c="accent-blue.8">
              一起為旅程留下美好回憶吧
            </Title>

            <Group mt="sm">
              <Button
                radius="5px"
                color="accent-blue"
                onClick={() => navigate('/auth?type=login')}
              >
                前往登入
              </Button>

              <Button
                radius="5px"
                variant="default"
                onClick={() => navigate('/auth?type=register')}
              >
                建立帳號
              </Button>
            </Group>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
