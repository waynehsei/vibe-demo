import { useState } from 'react';
import { Box, Tabs, TextInput, rem } from '@mantine/core';
import { IconSearch, IconHistory, IconChartBar } from '@tabler/icons-react';
import { SlackHistory } from './SlackHistory';
import { SlackSummary } from './SlackSummary';

export function SlackLayout() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        padding: rem(16),
        gap: rem(16),
      }}
    >
      <TextInput
        placeholder="Search messages..."
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.currentTarget.value)}
      />

      <Tabs defaultValue="history">
        <Tabs.List>
          <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
            Chat History
          </Tabs.Tab>
          <Tabs.Tab value="summary" leftSection={<IconChartBar size={16} />}>
            Summary
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="history">
          <SlackHistory searchQuery={searchQuery} />
        </Tabs.Panel>

        <Tabs.Panel value="summary">
          <SlackSummary />
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
} 