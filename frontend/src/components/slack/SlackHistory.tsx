import { useState, useEffect } from 'react';
import { Box, Paper, Text, Avatar, Group, ScrollArea, rem } from '@mantine/core';

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

// Define a set of colors for different users
const userColors = [
  'blue',
  'green',
  'orange',
  'grape',
  'pink',
  'teal',
  'yellow',
  'red',
  'indigo',
  'cyan',
];

interface SlackHistoryProps {
  searchQuery: string;
}

export function SlackHistory({ searchQuery }: SlackHistoryProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userColorMap, setUserColorMap] = useState<Map<string, string>>(new Map());

  const fetchMessages = async () => {
    try {
      const response = await fetch('http://localhost:8000/v1/conversations/slack/messages');
      const data: ApiResponse = await response.json();
      
      // Transform API messages to our format
      const transformedMessages = data.messages.map((msg): Message => ({
        id: msg.id,
        content: msg.content,
        user_id: msg.user_id,
        timestamp: new Date(msg.created_at),
      }));

      // Update user color mapping
      const uniqueUsers = new Set(transformedMessages.map(msg => msg.user_id));
      const newUserColorMap = new Map(userColorMap);
      
      uniqueUsers.forEach(userId => {
        if (userId === 'AI') return; // Skip AI as it has a fixed color
        if (!newUserColorMap.has(userId)) {
          // Assign a color from the pool
          const existingColors = new Set(newUserColorMap.values());
          const availableColors = userColors.filter(color => !existingColors.has(color));
          const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)] || userColors[0];
          newUserColorMap.set(userId, randomColor);
        }
      });

      setUserColorMap(newUserColorMap);
      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Set up polling for new messages every 60 seconds
    const interval = setInterval(fetchMessages, 60000);
    return () => clearInterval(interval);
  }, []);

  const getUserColor = (user_id: string) => {
    if (user_id === 'AI') return 'violet';
    return userColorMap.get(user_id) || 'gray';
  };

  const getUserInitial = (user_id: string) => {
    return user_id.charAt(0).toUpperCase();
  };

  const filteredMessages = messages.filter(message =>
    message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScrollArea
      style={{
        height: 'calc(100vh - 120px)',
        padding: rem(16),
      }}
      viewportRef={(viewport) => {
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }}
    >
      {filteredMessages.map((message) => (
        <Box
          key={message.id}
          style={{
            display: 'flex',
            gap: rem(8),
            marginBottom: rem(16),
            flexDirection: message.user_id === 'USER' ? 'row-reverse' : 'row',
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
              backgroundColor: message.user_id === 'AI' 
                ? 'var(--mantine-color-violet-light)' 
                : `var(--mantine-color-${getUserColor(message.user_id)}-light)`,
            }}
          >
            <Text size="sm">{message.content}</Text>
            <Group gap="xs" mt={4}>
              <Text size="xs" c="dimmed">
                {message.timestamp.toLocaleTimeString()}
              </Text>
              <Text 
                size="xs" 
                style={{ 
                  color: `var(--mantine-color-${getUserColor(message.user_id)}-filled)`,
                  fontWeight: 500
                }}
              >
                {message.user_id}
              </Text>
            </Group>
          </Paper>
        </Box>
      ))}
    </ScrollArea>
  );
} 