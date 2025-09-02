import React, { useEffect, useMemo, useState } from 'react'
import {
  Modal,
  Stack,
  TextInput,
  Grid,
  Card,
  Text,
  Group,
  Button,
  ScrollArea,
  Badge,
  Image,
  Loader,
  Box
} from '@mantine/core'
import { IconSearch, IconCalendar, IconPhoto, IconCheck } from '@tabler/icons-react'
import { createTerrainAssetPreviewUrl, getAllTerrainAssetsSummary, revokeTerrainAssetPreviewUrl } from '@/features/editor/scene/lib/terrain/HeightmapUtils'

interface TerrainAssetPickerModalProps {
  opened: boolean
  onClose: () => void
  /**
   * Колбэк выбора ассета из коллекции
   * Возвращает идентификатор ассета и его размеры (масштабированные ≤200×200)
   */
  onSelect: (payload: { assetId: string; width: number; height: number; fileName: string }) => void
}

/**
 * Модальное окно выбора PNG heightmap из коллекции ассетов в IndexedDB (Dexie).
 * 
 * Компонент отображает сетку карточек с превью изображений, именем файла,
 * размерами и датой обновления. Пользователь может выбрать одну запись и подтвердить
 * выбор кнопкой «Выбрать». Превью создаются через `URL.createObjectURL(blob)` при помощи
 * `createTerrainAssetPreviewUrl` и корректно освобождаются через `revokeTerrainAssetPreviewUrl`.
 */
export const TerrainAssetPickerModal: React.FC<TerrainAssetPickerModalProps> = ({ opened, onClose, onSelect }) => {
  /**
   * Состояние списка ассетов и загрузки.
   */
  const [assets, setAssets] = useState<Array<{ assetId: string; fileName: string; width: number; height: number; fileSize: number; createdAt: Date; updatedAt: Date }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  /** Кэш превью-URL для освобождения по закрытии */
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})

  /**
   * Загружает список ассетов из Dexie с основной информацией.
   * Используется при каждом открытии модального окна.
   */
  const loadAssets = async () => {
    setIsLoading(true)
    try {
      const list = await getAllTerrainAssetsSummary()
      setAssets(list)
      // Предзагрузка превью URL'ов (лениво создаём только для текущей страницы/набора)
      const urls: Record<string, string> = {}
      for (const a of list) {
        try {
          urls[a.assetId] = await createTerrainAssetPreviewUrl(a.assetId)
        } catch (e) {
          // если blob отсутствует/ошибка — пропускаем
          // eslint-disable-next-line no-console
          console.warn('Не удалось создать превью для ассета', a.assetId, e)
        }
      }
      setPreviewUrls(urls)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (opened) {
      // При открытии всегда перезагружаем список
      void loadAssets()
    } else {
      // При закрытии очищаем выбор и освобождаем URL'ы
      setSelectedId(null)
      Object.values(previewUrls).forEach((url) => revokeTerrainAssetPreviewUrl(url))
      setPreviewUrls({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened])

  /**
   * Возвращает отфильтрованный по поисковому запросу список ассетов.
   */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return assets
    return assets.filter(a => a.fileName.toLowerCase().includes(q))
  }, [assets, searchQuery])

  /**
   * Форматирует дату для отображения в карточке.
   */
  const formatDate = (date: Date) => new Date(date).toLocaleString('ru-RU', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })

  /**
   * Обработчик подтверждения выбора ассета. Передаёт assetId и размеры в вызывающий код
   * и закрывает окно.
   */
  const handleConfirm = () => {
    if (!selectedId) return
    const a = assets.find(x => x.assetId === selectedId)
    if (!a) return
    onSelect({ assetId: a.assetId, width: a.width, height: a.height, fileName: a.fileName })
    onClose()
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Выбрать карту высот из коллекции" size="xl" styles={{ body: { maxHeight: '70vh', overflow: 'hidden' } }}>
      <Stack gap="md">
        <TextInput
          placeholder="Поиск по имени файла..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
        />

        {/**
         * Отключаем горизонтальную прокрутку viewport и добавляем горизонтальные отступы
         * вокруг Grid, чтобы нивелировать отрицательные внешние отступы сетки.
         */}
        <ScrollArea style={{ height: 'calc(70vh - 120px)' }} styles={{ viewport: { overflowX: 'hidden' } }}>
          {isLoading ? (
            <Group justify="center" py="xl">
              <Loader size="sm" />
            </Group>
          ) : filtered.length === 0 ? (
            <Group justify="center" py="xl">
              <Text c="dimmed">Нет загруженных карт высот</Text>
            </Group>
          ) : (
            <Box px="sm">
              <Grid>
              {filtered.map((a) => (
                <Grid.Col key={a.assetId} span={{ base: 12, sm: 6, md: 4 }}>
                  <Card withBorder padding="sm" radius="md" shadow={selectedId === a.assetId ? 'sm' : 'xs'} style={{ borderColor: selectedId === a.assetId ? 'var(--mantine-color-blue-6)' : undefined }}>
                    <Stack gap="xs">
                      <Group gap="xs" justify="space-between" align="flex-start">
                        <Text fw={600} lineClamp={1} style={{ flex: 1 }}>{a.fileName}</Text>
                        {selectedId === a.assetId && <IconCheck size={16} color="var(--mantine-color-blue-6)" />}
                      </Group>
                      <Image src={previewUrls[a.assetId]} alt={a.fileName} height={120} fit="contain" radius="sm" withPlaceholder placeholder={<Group justify="center" h={120}><IconPhoto size={24} /></Group>} />
                      <Group gap="xs" wrap="wrap">
                        <Badge variant="light">{a.width}×{a.height}px</Badge>
                        <Badge variant="light" color="gray">{(a.fileSize / 1024).toFixed(1)} KB</Badge>
                        <Badge variant="light" leftSection={<IconCalendar size={12} />}>{formatDate(a.updatedAt)}</Badge>
                      </Group>
                      <Group gap="xs">
                        <Button size="xs" variant={selectedId === a.assetId ? 'filled' : 'light'} onClick={() => setSelectedId(a.assetId)} fullWidth>
                          {selectedId === a.assetId ? 'Выбрано' : 'Выбрать'}
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
              </Grid>
            </Box>
          )}
        </ScrollArea>

        <Group justify="space-between">
          <Group gap="xs">
            <Badge variant="light" leftSection={<IconPhoto size={12} />}>{assets.length}</Badge>
            <Text size="sm" c="dimmed">элементов</Text>
          </Group>
          <Group gap="sm">
            <Button variant="default" onClick={onClose}>Отмена</Button>
            <Button onClick={handleConfirm} disabled={!selectedId}>Выбрать</Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  )
}
