import { useState, useEffect } from 'react';
import { Box, Paper, Text, Group, Loader, Badge, Table, SimpleGrid } from '@mantine/core';

interface TopUser {
  user_id: string;
  count: number;
}

interface HotKeyword {
  keyword: string;
  frequency: number;
}

interface HotKeywordsResponse {
  keywords: HotKeyword[];
}

interface ConversationSummary {
  conversation_id: string;
  summary: string;
  message_count: number;
}

interface MessageSummaryProps {
  isLoading: boolean;
  error: string | null;
  summary: ConversationSummary | null;
}

function MessageSummary({ isLoading, error, summary }: MessageSummaryProps) {
  if (isLoading) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
        <Loader size="md" />
      </Box>
    );
  }

  if (error) {
    return (
      <Text c="red" size="sm" ta="center">
        {error}
      </Text>
    );
  }

  return (
    <Paper shadow="xs" p="md" style={{ gridColumn: '1 / -1' }}>
      <Group justify="space-between" mb="md">
        <Text size="lg" fw={500}>Channel Summary</Text>
        {summary && (
          <Badge size="lg" variant="light">
            {summary.message_count} Total Messages
          </Badge>
        )}
      </Group>
      {summary && (
        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
          {summary.summary}
        </Text>
      )}
    </Paper>
  );
}

export function SlackSummary() {
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [hotKeywords, setHotKeywords] = useState<HotKeyword[]>([]);
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [usersResponse, keywordsResponse, summaryResponse] = await Promise.all([
          fetch('http://localhost:8000/v1/analytics/top-users?conversation_id=slack'),
          fetch('http://localhost:8000/v1/analytics/hot-keywords?conversation_id=slack'),
          fetch('http://localhost:8000/v1/conversations/slack/summary')
        ]);

        if (!usersResponse.ok || !keywordsResponse.ok || !summaryResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const usersData = await usersResponse.json();
        const keywordsData: HotKeywordsResponse = await keywordsResponse.json();
        const summaryData = await summaryResponse.json();

        setTopUsers(usersData.users);
        setHotKeywords(keywordsData.keywords);
        setSummary(summaryData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
        <Loader size="md" />
      </Box>
    );
  }

  if (error) {
    return (
      <Text c="red" size="sm" ta="center">
        {error}
      </Text>
    );
  }

  return (
    <Box mt="md">
      <SimpleGrid cols={2} spacing="md">
        <MessageSummary isLoading={isLoading} error={error} summary={summary} />

        {/* Top Users */}
        <Paper shadow="xs" p="md">
          <Text size="lg" fw={500} mb="md">Top Contributors</Text>
          <Table horizontalSpacing="lg" verticalSpacing="xs" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User ID</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Messages</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {topUsers.slice(0, 5).map((user) => (
                <Table.Tr key={user.user_id}>
                  <Table.Td>
                    <Text size="sm">{user.user_id}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="sm" fw={500}>{user.count}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>

        {/* Hot Keywords */}
        <Paper shadow="xs" p="md">
          <Text size="lg" fw={500} mb="md">Hot Keywords</Text>
          {hotKeywords.length > 0 && (
            <Table horizontalSpacing="lg" verticalSpacing="xs" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Keyword</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Frequency</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {hotKeywords.slice(0, 5).map((kw) => (
                  <Table.Tr key={kw.keyword}>
                    <Table.Td>
                      <Text size="sm">{kw.keyword}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm" fw={500}>{kw.frequency}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </SimpleGrid>
    </Box>
  );
} 