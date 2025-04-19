import { useState, useEffect } from 'react';
import { Box, Paper, Text, Group, Table, Loader, rem, Button, FileButton, Notification, ActionIcon } from '@mantine/core';
import { IconFile, IconQuote, IconUpload, IconX, IconCheck, IconPlus } from '@tabler/icons-react';

interface Material {
  file_id: string;
  file_name: string;
}

interface Citation {
  citation: string;
  count: number;
}

interface MaterialWithCitation extends Material {
  citation_count: number;
}

export function MaterialLayout() {
  const [materials, setMaterials] = useState<MaterialWithCitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ success?: string; error?: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchMaterialsAndCitations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch materials and citations in parallel
      const [materialsResponse, citationsResponse] = await Promise.all([
        fetch('http://localhost:8000/v1/materials'),
        fetch('http://localhost:8000/v1/analytics/citation-counts')
      ]);

      if (!materialsResponse.ok || !citationsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const materialsData = await materialsResponse.json();
      const citationsData = await citationsResponse.json();

      console.log(materialsData);
      console.log(citationsData);

      // Create a map of citation counts
      const citationMap = new Map<string, number>();
      citationsData.citations.forEach((citation: Citation) => {
        citationMap.set(citation.citation, citation.count);
      });

      // Combine materials with their citation counts
      const materialsWithCitations: MaterialWithCitation[] = materialsData.materials.map(
        (material: Material) => ({
          ...material,
          citation_count: citationMap.get(material.file_id) || 0,
        })
      );

      // Sort by citation count (highest first)
      materialsWithCitations.sort((a, b) => b.citation_count - a.citation_count);

      setMaterials(materialsWithCitations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/v1/files', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload file');
      }

      setUploadStatus({ success: `Successfully uploaded ${result.filename}` });
      // Refresh materials list after successful upload
      fetchMaterialsAndCitations();
    } catch (err) {
      setUploadStatus({ error: err instanceof Error ? err.message : 'Failed to upload file' });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    fetchMaterialsAndCitations();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchMaterialsAndCitations, 30000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <Paper p="md" style={{ textAlign: 'center', color: 'var(--mantine-color-red-6)' }}>
        <Text>Error: {error}</Text>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper p="lg" radius="sm" withBorder>
        <Group justify="space-between" mb="xl">
          <Text size="lg" fw={600}>Materials</Text>
        </Group>

        {uploadStatus && (
          <Notification
            mb="md"
            withCloseButton
            onClose={() => setUploadStatus(null)}
            color={uploadStatus.error ? 'red' : 'green'}
            icon={uploadStatus.error ? <IconX size={rem(16)} /> : <IconCheck size={rem(16)} />}
          >
            {uploadStatus.error || uploadStatus.success}
          </Notification>
        )}

        <Table horizontalSpacing="lg" verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>
                <Text size="sm" c="dimmed">File ID</Text>
              </Table.Th>
              <Table.Th>
                <Text size="sm" c="dimmed">File Name</Text>
              </Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>
                <Text size="sm" c="dimmed">Citations</Text>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {materials.map((material) => (
              <Table.Tr key={material.file_id}>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {material.file_id}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" style={{ wordBreak: 'break-word' }}>
                    {material.file_name}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text 
                    size="xl"
                    fw={500}
                    style={{ 
                      color: material.citation_count > 0 
                        ? 'var(--mantine-color-gray-6)' 
                        : 'var(--mantine-color-gray-5)',
                      fontFamily: "'SF Mono', monospace"
                    }}
                  >
                    {material.citation_count}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
            {materials.length === 0 && !isLoading && (
              <Table.Tr>
                <Table.Td colSpan={3} style={{ textAlign: 'center' }}>
                  <Text c="dimmed" size="sm">No materials found</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
        {isLoading && (
          <Box style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <Loader size="sm" />
          </Box>
        )}

        <Group justify="center" mt="xl">
          <FileButton onChange={handleFileUpload} accept="application/pdf,text/csv,text/plain">
            {(props) => (
              <ActionIcon
                {...props}
                variant="filled"
                size="xl"
                radius="xl"
                loading={isUploading}
                style={{ backgroundColor: 'var(--mantine-color-blue-6)' }}
              >
                <IconPlus size={rem(24)} />
              </ActionIcon>
            )}
          </FileButton>
        </Group>
      </Paper>
    </Box>
  );
} 