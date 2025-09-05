import React, { useEffect, useState } from 'react'
import { Modal, Stack, Select, NumberInput, Group, Button, ColorInput, FileInput, Image, Text, Slider, Alert, TextInput } from '@mantine/core'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import type { GfxLandscape } from '@/entities/terrain'
import { generateUUID } from '@/shared/lib/uuid'
import type { GfxTerrainConfig, GfxHeightmapParams } from '@/entities/terrain'
import { TerrainAssetPickerModal } from './TerrainAssetPickerModal'
import {
  uploadTerrainAsset,
  validatePngFile,
  createTerrainAssetPreviewUrl,
  revokeTerrainAssetPreviewUrl,
  getTerrainAssetInfo
} from '@/features/editor/scene/lib/terrain/HeightmapUtils'

export interface LandscapeItemModalProps {
  opened: boolean
  mode: 'create' | 'edit'
  initial?: Partial<GfxLandscape>
  onClose: () => void
}

/**
 * Окно создания/редактирования GfxLandscape.
 * Перенесены базовые параметры ландшафта из старых модалок: форма (plane/terrain), размеры,
 * центр, упрощённый материал (color). Для terrain-площадки допускается оставить terrain пустым
 * — источники и операции настраиваются отдельными инструментами.
 */
export const LandscapeItemModal: React.FC<LandscapeItemModalProps> = ({ opened, mode, initial, onClose }) => {
  const addLandscapeItem = useSceneStore(state => state.addLandscapeItem)
  const updateLandscapeItem = useSceneStore(state => state.updateLandscapeItem)

  const [shape, setShape] = useState<'plane' | 'terrain'>(initial?.shape ?? 'terrain')
  const [width, setWidth] = useState<number>((initial as any)?.size?.width ?? 200)
  const [depth, setDepth] = useState<number>((initial as any)?.size?.depth ?? 200)
  const [centerX, setCenterX] = useState<number>(initial?.center?.[0] ?? 0)
  const [centerZ, setCenterZ] = useState<number>(initial?.center?.[1] ?? 0)
  const [color, setColor] = useState<string>(initial?.material?.color ?? '#4a7c59')
  const [name, setName] = useState<string>(initial?.name ?? '')

  // Источник террейна и параметры heightmap
  const [terrainSource, setTerrainSource] = useState<'perlin' | 'heightmap'>(initial?.terrain?.source?.kind === 'heightmap' ? 'heightmap' : 'perlin')
  const [heightmapFile, setHeightmapFile] = useState<File | null>(null)
  const [heightmapPreviewUrl, setHeightmapPreviewUrl] = useState<string | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<{ assetId: string; width: number; height: number; fileName: string } | null>(null)
  const [selectedAssetPreviewUrl, setSelectedAssetPreviewUrl] = useState<string | null>(null)
  const [assetPickerOpened, setAssetPickerOpened] = useState(false)
  const [heightmapParams, setHeightmapParams] = useState<Partial<GfxHeightmapParams>>({ min: 0, max: 10, wrap: 'clamp' })
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (opened) {
      setShape(initial?.shape ?? 'terrain')
      setWidth((initial as any)?.size?.width ?? 200)
      setDepth((initial as any)?.size?.depth ?? 200)
      setCenterX(initial?.center?.[0] ?? 0)
      setCenterZ(initial?.center?.[1] ?? 0)
      setColor(initial?.material?.color ?? '#4a7c59')
      setName(initial?.name ?? '')
      if (initial?.terrain?.source?.kind === 'heightmap') {
        setTerrainSource('heightmap')
        const p = (initial.terrain.source as any).params as GfxHeightmapParams
        setHeightmapParams({ min: p.min, max: p.max, wrap: p.wrap ?? 'clamp', imgWidth: p.imgWidth, imgHeight: p.imgHeight })
        // Подгружаем превью ассета, если удастся
        ;(async () => {
          try {
            const info = await getTerrainAssetInfo(p.assetId)
            const url = await createTerrainAssetPreviewUrl(p.assetId)
            setSelectedAsset(info ? { assetId: p.assetId, width: info.width, height: info.height, fileName: info.fileName } : { assetId: p.assetId, width: p.imgWidth, height: p.imgHeight, fileName: 'heightmap.png' })
            setSelectedAssetPreviewUrl(url)
          } catch {
            // ignore preview errors
          }
        })()
      } else {
        setTerrainSource('perlin')
      }
    }
  }, [opened])

  const buildTerrainConfig = async (): Promise<GfxTerrainConfig | undefined> => {
    if (shape !== 'terrain') return undefined
    const worldWidth = Math.max(1, width)
    const worldDepth = Math.max(1, depth)
    if (terrainSource === 'perlin') {
      const gridW = worldWidth > 200 ? 200 : worldWidth
      const gridH = worldDepth > 200 ? 200 : worldDepth
      return {
        worldWidth,
        worldDepth,
        center: [centerX || 0, centerZ || 0],
        edgeFade: 0.15,
        source: {
          kind: 'perlin',
          params: {
            seed: 1234,
            octaveCount: 4,
            amplitude: 0.1,
            persistence: 0.5,
            width: gridW,
            height: gridH,
            heightOffset: 0,
          }
        }
      }
    } else {
      // heightmap: использовать загруженный файл или выбранный ассет
      let assetId: string | undefined
      let imgWidth: number | undefined
      let imgHeight: number | undefined
      if (heightmapFile) {
        const validation = await validatePngFile(heightmapFile)
        if (!validation.valid) {
          setUploadError(validation.error || 'Некорректный PNG')
          return undefined
        }
        const up = await uploadTerrainAsset(heightmapFile)
        assetId = up.assetId
        imgWidth = up.width
        imgHeight = up.height
      } else if (selectedAsset) {
        assetId = selectedAsset.assetId
        imgWidth = selectedAsset.width
        imgHeight = selectedAsset.height
      } else {
        setUploadError('Не выбран файл или ассет heightmap')
        return undefined
      }
      return {
        worldWidth,
        worldDepth,
        center: [centerX || 0, centerZ || 0],
        edgeFade: 0,
        source: {
          kind: 'heightmap',
          params: {
            assetId,
            imgWidth: imgWidth!,
            imgHeight: imgHeight!,
            min: heightmapParams.min ?? 0,
            max: heightmapParams.max ?? 10,
            wrap: (heightmapParams.wrap as any) || 'clamp'
          }
        }
      }
    }
  }

  const onCreate = async () => {
    const terrain = await buildTerrainConfig()
    if (shape === 'terrain' && !terrain) return
    const item: GfxLandscape = {
      id: generateUUID(),
      name: (name || '').trim() || undefined,
      shape,
      size: { width: Math.max(1, width), depth: Math.max(1, depth) },
      center: [centerX || 0, centerZ || 0],
      material: { color },
      terrain,
    }
    addLandscapeItem(item)
    onClose()
  }

  const onUpdate = async () => {
    if (!initial?.id) return
    const terrain = await buildTerrainConfig()
    if (shape === 'terrain' && !terrain) return
    updateLandscapeItem(initial.id, {
      name: (name || '').trim() || undefined,
      shape,
      size: { width: Math.max(1, width), depth: Math.max(1, depth) },
      center: [centerX || 0, centerZ || 0],
      material: { color },
      terrain,
    })
    onClose()
  }

  return (
    <>
    <Modal opened={opened} onClose={onClose} title={mode === 'create' ? 'Добавить площадку ландшафта' : 'Редактировать площадку ландшафта'}>
      <Stack>
        <Select label="Форма" data={[{ value: 'terrain', label: 'Terrain' }, { value: 'plane', label: 'Plane' }]} value={shape} onChange={(v) => setShape((v as any) || 'terrain')} withinPortal />
        <TextInput label="Название" placeholder="Например: Центральное плато" value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <Group grow mt="xs">
          <NumberInput label="Ширина (X)" value={width} onChange={(v) => setWidth(Number(v) || 1)} min={1} />
          <NumberInput label="Глубина (Z)" value={depth} onChange={(v) => setDepth(Number(v) || 1)} min={1} />
        </Group>
        <Group grow>
          <NumberInput label="Центр X" value={centerX} onChange={(v) => setCenterX(Number(v) || 0)} />
          <NumberInput label="Центр Z" value={centerZ} onChange={(v) => setCenterZ(Number(v) || 0)} />
        </Group>
        <ColorInput label="Цвет" value={color} onChange={setColor} format="hex" disallowInput />

        {shape === 'terrain' && (
          <>
            <Select
              label="Источник данных террейна"
              data={[{ value: 'perlin', label: 'Perlin Noise (генерация)' }, { value: 'heightmap', label: 'Heightmap (PNG)' }]}
              value={terrainSource}
              onChange={(v) => { if (v) { setTerrainSource(v as any); setUploadError(null) } }}
            />

            {terrainSource === 'heightmap' && (
              <Stack gap="sm">
                <Group align="end" gap="sm">
                  <FileInput
                    label="Загрузить PNG heightmap"
                    placeholder="Выберите PNG файл..."
                    accept="image/png"
                    value={heightmapFile}
                    onChange={async (file) => {
                      if (!file) { setHeightmapFile(null); return }
                      try {
                        setIsUploading(true)
                        setUploadError(null)
                        const validation = await validatePngFile(file)
                        if (!validation.valid) { setUploadError(validation.error || 'Ошибка валидации'); setIsUploading(false); return }
                        setHeightmapFile(file)
                        const url = URL.createObjectURL(file)
                        setHeightmapPreviewUrl(url)
                        if (selectedAssetPreviewUrl) { revokeTerrainAssetPreviewUrl(selectedAssetPreviewUrl); setSelectedAssetPreviewUrl(null) }
                        setSelectedAsset(null)
                        if (validation.dimensions) setHeightmapParams(prev => ({ ...prev, imgWidth: validation.dimensions.width, imgHeight: validation.dimensions.height }))
                      } finally { setIsUploading(false) }
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button variant="light" onClick={() => setAssetPickerOpened(true)} disabled={isUploading}>Выбрать из коллекции</Button>
                </Group>

                {uploadError && (<Alert color="red" variant="light">{uploadError}</Alert>)}

                {selectedAsset && (
                  <Stack gap="xs">
                    <Group justify="space-between" align="center">
                      <Text size="sm" fw={500}>Выбранный ассет:</Text>
                      <Button variant="subtle" size="xs" onClick={() => { setSelectedAsset(null); if (selectedAssetPreviewUrl) { revokeTerrainAssetPreviewUrl(selectedAssetPreviewUrl); setSelectedAssetPreviewUrl(null) } }}>Сбросить</Button>
                    </Group>
                    <Image src={selectedAssetPreviewUrl || ''} alt={selectedAsset.fileName} width={200} height={150} fit="contain" style={{ border: '1px solid #e0e0e0', borderRadius: 4 }} />
                    <Text size="sm" c="dimmed">{selectedAsset.fileName} — {selectedAsset.width}×{selectedAsset.height}px</Text>
                  </Stack>
                )}

                {!selectedAsset && heightmapPreviewUrl && (
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Превью heightmap:</Text>
                    <Image src={heightmapPreviewUrl} alt="Heightmap preview" width={200} height={150} fit="contain" style={{ border: '1px solid #e0e0e0', borderRadius: 4 }} />
                  </Stack>
                )}

                <Stack gap="xs">
                  <Group gap="lg">
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text size="sm">Минимальная высота: {heightmapParams.min}</Text>
                      <Slider value={heightmapParams.min || 0} onChange={(val) => setHeightmapParams(prev => ({ ...prev, min: val }))} min={-50} max={50} step={0.1} size="sm" />
                    </Stack>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text size="sm">Максимальная высота: {heightmapParams.max}</Text>
                      <Slider value={heightmapParams.max || 10} onChange={(val) => setHeightmapParams(prev => ({ ...prev, max: val }))} min={-50} max={100} step={0.1} size="sm" />
                    </Stack>
                  </Group>
                  <Select label="Режим обработки краёв" data={[{ value: 'clamp', label: 'Ограничение (clamp)' }, { value: 'repeat', label: 'Повтор (repeat)' }]} value={heightmapParams.wrap || 'clamp'} onChange={(v) => setHeightmapParams(prev => ({ ...prev, wrap: v as any }))} />
                </Stack>
              </Stack>
            )}
          </>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Отмена</Button>
          {mode === 'create' ? (
            <Button onClick={onCreate}>Добавить</Button>
          ) : (
            <Button onClick={onUpdate}>Сохранить</Button>
          )}
        </Group>
      </Stack>
    </Modal>

    {/* Модал выбора heightmap ассета из коллекции */}
    <TerrainAssetPickerModal
      opened={assetPickerOpened}
      onClose={() => setAssetPickerOpened(false)}
      onSelect={async ({ assetId, width, height, fileName }) => {
        // Сбрасываем файл и его превью, если были
        if (heightmapPreviewUrl) { revokeTerrainAssetPreviewUrl(heightmapPreviewUrl); setHeightmapPreviewUrl(null) }
        setHeightmapFile(null)
        setSelectedAsset({ assetId, width, height, fileName })
        try { const url = await createTerrainAssetPreviewUrl(assetId); setSelectedAssetPreviewUrl(url) } catch {}
        setHeightmapParams(prev => ({ ...prev, imgWidth: width, imgHeight: height }))
        setAssetPickerOpened(false)
      }}
    />
    </>
  )
}
