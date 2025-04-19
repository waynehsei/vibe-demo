import { useState, useEffect } from 'react';
import { Box, Paper, Text, Group, Table, Loader, rem, Grid, Badge, RingProgress, Select } from '@mantine/core';
import { LineChart } from '@mantine/charts';

interface Keyword {
  keyword: string;
  frequency: number;
}

interface HourlyCount {
  hour: string;
  count: number;
}

interface DailyKeyword {
  keyword: string;
  count: number;
}

interface DailyKeywords {
  date: string;
  keywords: DailyKeyword[];
}

interface DailyTopKeywords {
  days: number;
  daily_keywords: DailyKeywords[];
}

interface QueryTrend {
  days: number;
  trend: HourlyCount[];
}

interface TopUser {
  user_id: string;
  count: number;
}

interface TopUsers {
  days: number;
  users: TopUser[];
}

interface DailyUser {
  user_id: string;
  count: number;
}

interface DailyEngagement {
  date: string;
  users: DailyUser[];
}

interface UserEngagement {
  days: number;
  daily_engagement: DailyEngagement[];
}

interface DailyScore {
  date: string;
  avg_score: number;
}

interface DailyScores {
  days: number;
  scores: DailyScore[];
  overall_avg: number;
}

export function InsightLayout() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [queryTrend, setQueryTrend] = useState<QueryTrend | null>(null);
  const [dailyKeywords, setDailyKeywords] = useState<DailyTopKeywords | null>(null);
  const [topUsers, setTopUsers] = useState<TopUsers | null>(null);
  const [userEngagement, setUserEngagement] = useState<UserEngagement | null>(null);
  const [dailyScores, setDailyScores] = useState<DailyScores | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [keywordsResponse, trendResponse, dailyKeywordsResponse, topUsersResponse, userEngagementResponse, dailyScoresResponse] = await Promise.all([
        fetch('http://localhost:8000/v1/analytics/hot-keywords'),
        fetch('http://localhost:8000/v1/analytics/hourly-query-count'),
        fetch('http://localhost:8000/v1/analytics/daily-top-keywords'),
        fetch('http://localhost:8000/v1/analytics/top-users'),
        fetch('http://localhost:8000/v1/analytics/daily-user-engagement'),
        fetch('http://localhost:8000/v1/analytics/daily-scores')
      ]);

      if (!keywordsResponse.ok || !trendResponse.ok || !dailyKeywordsResponse.ok || 
          !topUsersResponse.ok || !userEngagementResponse.ok || !dailyScoresResponse.ok) {
        throw new Error('Failed to fetch insights');
      }

      const keywordsData = await keywordsResponse.json();
      const trendData = await trendResponse.json();
      const dailyKeywordsData = await dailyKeywordsResponse.json();
      const topUsersData = await topUsersResponse.json();
      const userEngagementData = await userEngagementResponse.json();
      const dailyScoresData = await dailyScoresResponse.json();

      setKeywords(keywordsData.keywords);
      setQueryTrend(trendData);
      setDailyKeywords(dailyKeywordsData);
      setTopUsers(topUsersData);
      setUserEngagement(userEngagementData);
      setDailyScores(dailyScoresData);

      // Set first user as default selected if none selected
      if (!selectedUser && userEngagementData.daily_engagement[0]?.users.length > 0) {
        setSelectedUser(userEngagementData.daily_engagement[0].users[0].user_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const maxFrequency = Math.max(...keywords.map(k => k.frequency));

  const formatHour = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC'
    });
  };

  const formatChartData = (trend: HourlyCount[]) => {
    return trend.map(item => ({
      ...item,
      formattedHour: formatHour(item.hour)
    })).sort((a, b) => new Date(a.hour).getTime() - new Date(b.hour).getTime());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  const formatEngagementData = (data: DailyEngagement[], userId: string) => {
    return data
      .map(day => ({
        date: day.date,
        formattedDate: formatDate(day.date),
        eventCount: day.users.find(user => user.user_id === userId)?.count || 0
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getUserOptions = () => {
    if (!userEngagement) return [];
    
    const userIds = new Set<string>();
    userEngagement.daily_engagement.forEach(day => {
      day.users.forEach(user => userIds.add(user.user_id));
    });
    
    return Array.from(userIds).map(id => ({
      value: id,
      label: `User ${id}`
    }));
  };

  const formatScoreData = (scores: DailyScore[]) => {
    return scores.map(score => ({
      date: score.date,
      formattedDate: formatDate(score.date),
      avgScore: Number(score.avg_score.toFixed(2))
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  return (
    <Box>
      <Grid gutter="md">
        {/* Top Keywords Section */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper p="lg" radius="sm" withBorder>
            <Text size="lg" fw={600} mb="xl">Top Keywords</Text>
            {isLoading ? (
              <Box style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader size="sm" />
              </Box>
            ) : error ? (
              <Text c="red" size="sm">{error}</Text>
            ) : (
              <Box>
                {keywords.map((keyword, index) => (
                  <Group key={keyword.keyword} mb="xs" justify="space-between">
                    <Group gap="xs">
                      <Text size="sm" fw={500} c="dimmed">#{index + 1}</Text>
                      <Badge 
                        variant="light"
                        size="lg"
                      >
                        {keyword.keyword}
                      </Badge>
                    </Group>
                    <RingProgress
                      size={32}
                      thickness={3}
                      sections={[
                        { 
                          value: (keyword.frequency / maxFrequency) * 100, 
                          color: 'blue' 
                        }
                      ]}
                      label={
                        <Text size="xs" ta="center">
                          {keyword.frequency}
                        </Text>
                      }
                    />
                  </Group>
                ))}
              </Box>
            )}
          </Paper>
        </Grid.Col>

        {/* Daily Top Keywords Section */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper p="lg" radius="sm" withBorder>
            <Text size="lg" fw={600} mb="xl">Top Keywords (Last 7 Days)</Text>
            {isLoading ? (
              <Box style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader size="sm" />
              </Box>
            ) : error ? (
              <Text c="red" size="sm">{error}</Text>
            ) : dailyKeywords && (
              <Table horizontalSpacing="lg" verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>
                      <Text size="sm" c="dimmed">Date</Text>
                    </Table.Th>
                    <Table.Th>
                      <Text size="sm" c="dimmed">Top Keywords</Text>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {dailyKeywords.daily_keywords.map((day) => (
                    <Table.Tr key={day.date}>
                      <Table.Td>
                        <Text size="sm">{formatDate(day.date)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" wrap="wrap">
                          {day.keywords.slice(0, 10).map((kw) => (
                            <Badge 
                              key={kw.keyword}
                              variant="light"
                              size="sm"
                            >
                              {kw.keyword}
                            </Badge>
                          ))}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Grid.Col>

        {/* Top Users Section */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper p="lg" radius="sm" withBorder>
            <Text size="lg" fw={600} mb="xl">Top Users</Text>
            {isLoading ? (
              <Box style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader size="sm" />
              </Box>
            ) : error ? (
              <Text c="red" size="sm">{error}</Text>
            ) : topUsers && (
              <Table horizontalSpacing="lg" verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>
                      <Text size="sm" c="dimmed">User ID</Text>
                    </Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>
                      <Text size="sm" c="dimmed">Queries</Text>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {topUsers.users.slice(0, 10).map((user) => (
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
            )}
          </Paper>
        </Grid.Col>

        {/* User Engagement Chart */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper p="lg" radius="sm" withBorder>
            <Group justify="space-between" mb="xl">
              <Text size="lg" fw={600}>User Daily Engagement (Last 7 Days)</Text>
              <Select
                size="sm"
                placeholder="Select user"
                data={getUserOptions()}
                value={selectedUser}
                onChange={setSelectedUser}
                style={{ width: '200px' }}
              />
            </Group>
            {isLoading ? (
              <Box style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader size="sm" />
              </Box>
            ) : error ? (
              <Text c="red" size="sm">{error}</Text>
            ) : userEngagement && selectedUser && (
              <Box>
                <LineChart
                  h={300}
                  data={formatEngagementData(userEngagement.daily_engagement, selectedUser)}
                  dataKey="formattedDate"
                  series={[
                    { name: 'eventCount', color: 'violet.6' }
                  ]}
                  curveType="monotone"
                  tickLine="y"
                  gridAxis="xy"
                  withLegend
                  withTooltip
                  tooltipAnimationDuration={200}
                  yAxisProps={{
                    tickCount: 5,
                    allowDecimals: false,
                    style: {
                      fontSize: '10px'
                    },
                    width: 50
                  }}
                  xAxisProps={{
                    rotate: -45,
                    tickMargin: 20,
                    label: 'Date (UTC)'
                  }}
                />
              </Box>
            )}
          </Paper>
        </Grid.Col>

        {/* Query Trend Section */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="lg" radius="sm" withBorder>
            <Text size="lg" fw={600} mb="xl">Total Query Count (Last 7 Days)</Text>
            {isLoading ? (
              <Box style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader size="sm" />
              </Box>
            ) : error ? (
              <Text c="red" size="sm">{error}</Text>
            ) : queryTrend && (
              <Box>
                <LineChart
                  h={300}
                  data={formatChartData(queryTrend.trend)}
                  dataKey="formattedHour"
                  series={[
                    { name: 'count', color: 'blue.6' }
                  ]}
                  curveType="monotone"
                  tickLine="y"
                  gridAxis="xy"
                  withLegend
                  withTooltip
                  tooltipAnimationDuration={200}
                  yAxisProps={{
                    tickCount: 5,
                    allowDecimals: false,
                    style: {
                      fontSize: '10px'
                    },
                    width: 50
                  }}
                  xAxisProps={{
                    rotate: -45,
                    tickMargin: 20,
                    label: 'Date (UTC)'
                  }}
                />
              </Box>
            )}
          </Paper>
        </Grid.Col>

        {/* Query Relevancy Scores */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="lg" radius="sm" withBorder>
            <Group justify="space-between" mb="xl">
              <Text size="lg" fw={600}>Query Relevancy Scores (Last 7 Days)</Text>
              {dailyScores && (
                <Text size="sm" c="dimmed">
                  Overall Average: {dailyScores.overall_avg.toFixed(2)}
                </Text>
              )}
            </Group>
            {isLoading ? (
              <Box style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader size="sm" />
              </Box>
            ) : error ? (
              <Text c="red" size="sm">{error}</Text>
            ) : dailyScores && (
              <Box>
                <LineChart
                  h={300}
                  data={formatScoreData(dailyScores.scores)}
                  dataKey="formattedDate"
                  series={[
                    { name: 'avgScore', color: 'cyan.6' }
                  ]}
                  curveType="monotone"
                  tickLine="y"
                  gridAxis="xy"
                  withLegend
                  withTooltip
                  tooltipAnimationDuration={200}
                  yAxisProps={{
                    tickCount: 5,
                    allowDecimals: true,
                    style: {
                      fontSize: '10px'
                    },
                    width: 50
                  }}
                  xAxisProps={{
                    rotate: -45,
                    tickMargin: 20,
                    label: 'Date (UTC)',
                    style: {
                      fontSize: '10px'
                    }
                  }}
                />
              </Box>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </Box>
  );
} 