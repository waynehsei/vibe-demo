import { Box, Paper, Text, rem } from '@mantine/core';
import { Chat } from './Chat';

interface ChatLayoutProps {
  userId: string;
  conversationId: string;
  onLogout: () => void;
}

export function ChatLayout({ userId, conversationId, onLogout }: ChatLayoutProps) {
  return (
    <Box
      style={{
        display: 'flex',
        flex: 1,
        padding: rem(16),
      }}
    >
      <Paper shadow="xs" style={{ width: '100%', maxWidth: rem(800), margin: '0 auto' }}>
        <Box
          style={{
            borderBottom: '1px solid var(--mantine-color-gray-2)',
            padding: rem(16),
          }}
        >
          <Text size="xl" fw={700}>Chat Assistant</Text>
          <Text size="sm" c="dimmed">User: {userId}</Text>
        </Box>
        <Chat userId={userId} conversationId={conversationId} />
      </Paper>
    </Box>
  );
} 