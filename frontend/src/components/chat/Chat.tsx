import { useState, useEffect } from 'react';
import { Box, ScrollArea, TextInput, Paper, Text, Avatar, rem, Group, Loader, Alert } from '@mantine/core';
import { IconSend, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface ApiMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface ApiResponse {
  conversation_id: string;
  messages: ApiMessage[];
  total_messages: number;
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  timestamp: Date;
}

interface ChatProps {
  userId: string;
  conversationId: string;
}

export function Chat({ userId, conversationId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      setError(null);
      const response = await fetch(`http://localhost:8000/v1/conversations/${conversationId}/messages`);
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }
      const data: ApiResponse = await response.json();
      
      // Transform API messages to our format
      const transformedMessages = data.messages.map((msg): Message => ({
        id: msg.id,
        content: msg.content,
        user_id: msg.user_id,
        timestamp: new Date(msg.created_at),
      }));

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages. Please try again later.');
      notifications.show({
        color: 'red',
        title: 'Error',
        message: 'Failed to load messages. Please try again later.',
      });
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    try {
      setError(null);
      const response = await fetch(`http://localhost:8000/v1/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          content: input,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      setInput('');
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      notifications.show({
        color: 'red',
        title: 'Error',
        message: 'Failed to send message. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUserColor = (user_id: string) => {
    if (user_id === 'AI') return 'green';
    return user_id === userId ? 'blue' : 'gray';
  };

  const getUserInitial = (user_id: string) => {
    return user_id.charAt(0).toUpperCase();
  };

  if (isInitialLoading) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: rem(20) }}>
        <Loader size="lg" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p="md">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--mantine-color-gray-0)',
      }}
    >
      {/* Chat History */}
      <ScrollArea
        style={{
          flex: 1,
          padding: rem(16),
        }}
        viewportRef={(viewport) => {
          if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
          }
        }}
      >
        {messages.map((message) => (
          <Box
            key={message.id}
            style={{
              display: 'flex',
              gap: rem(8),
              marginBottom: rem(16),
              flexDirection: message.user_id === userId ? 'row-reverse' : 'row',
            }}
          >
            <Avatar
              size="md"
              src={message.user_id === 'AI' ? '/logo.svg' : null}
              color={getUserColor(message.user_id)}
            >
              {getUserInitial(message.user_id)}
            </Avatar>
            <Paper
              shadow="sm"
              p="md"
              style={{
                maxWidth: '70%',
                backgroundColor:
                  message.user_id === userId
                    ? 'var(--mantine-primary-color-light)'
                    : 'var(--mantine-color-white)',
              }}
            >
              <Text size="sm">{message.content}</Text>
              <Group gap="xs" mt={4}>
                <Text size="xs" c="dimmed">
                  {message.timestamp.toLocaleTimeString()}
                </Text>
                <Text size="xs" c="dimmed">
                  {message.user_id === userId ? 'You' : message.user_id}
                </Text>
              </Group>
            </Paper>
          </Box>
        ))}
      </ScrollArea>

      {/* Chat Input */}
      <Box
        style={{
          padding: rem(16),
          borderTop: '1px solid var(--mantine-color-gray-2)',
          backgroundColor: 'var(--mantine-color-white)',
        }}
      >
        <TextInput
          value={input}
          onChange={(event) => setInput(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type your message..."
          disabled={isLoading}
          rightSection={
            <IconSend
              style={{
                cursor: isLoading ? 'not-allowed' : 'pointer',
                color: input.trim() && !isLoading
                  ? 'var(--mantine-primary-color)'
                  : 'var(--mantine-color-gray-5)',
              }}
              onClick={handleSend}
            />
          }
        />
      </Box>
    </Box>
  );
} 