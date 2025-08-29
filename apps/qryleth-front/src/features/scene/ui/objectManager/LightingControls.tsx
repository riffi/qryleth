import React, { useState, useEffect } from 'react'
import {
    Group,
    Text,
    ActionIcon,
    Collapse,
    Stack,
    Box,
    ColorInput,
    NumberInput,
    Divider,
    Select,
    Switch,
    SegmentedControl,
    Slider
} from '@mantine/core'
import { IconBulb, IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import type { LightingSettings, AmbientLightSettings, DirectionalLightSettings, FogSettings } from '@/entities/lighting'

interface LightingControlsProps {
    lighting?: LightingSettings
    onLightingChange?: (lighting: LightingSettings) => void
}

const LIGHTING_PRESETS = {
    'bright-day': {
        name: 'Яркий день',
        ambient: { color: '#87CEEB', intensity: 0.6 },
        directional: { color: '#FFD700', intensity: 1.0 },
        backgroundColor: '#87CEEB'
    },
    'evening': {
        name: 'Вечер',
        ambient: { color: '#FF6B35', intensity: 0.3 },
        directional: { color: '#FF8C42', intensity: 0.6 },
        backgroundColor: '#2C1810'
    },
    'night': {
        name: 'Ночь',
        ambient: { color: '#1E1E3F', intensity: 0.2 },
        directional: { color: '#4169E1', intensity: 0.3 },
        backgroundColor: '#0C0C1E'
    },
    'moonlight': {
        name: 'Лунный свет',
        ambient: { color: '#B0C4DE', intensity: 0.25 },
        directional: { color: '#E6E6FA', intensity: 0.4 },
        backgroundColor: '#191970'
    }
} as const

export const LightingControls: React.FC<LightingControlsProps> = ({
    lighting,
    onLightingChange
}) => {
    const [lightingExpanded, setLightingExpanded] = useState(false)
    const [selectedPreset, setSelectedPreset] = useState<string>('bright-day')

    /**
     * Изменяет параметр ambient света.
     * @param key поле ambient-настроек
     * @param value новое значение
     */
    const handleAmbientChange = (key: keyof AmbientLightSettings, value: string | number) => {
        if (onLightingChange && lighting) {
            onLightingChange({
                ...lighting,
                ambient: {
                    ...(lighting.ambient ?? { uuid: 'ambient-light' }),
                    [key]: value
                }
            })
        }
    }

    /**
     * Изменяет параметр directional света.
     * @param key поле настроек направленного света
     * @param value новое значение
     */
    const handleDirectionalChange = (key: keyof DirectionalLightSettings, value: string | number) => {
        if (onLightingChange && lighting) {
            onLightingChange({
                ...lighting,
                directional: {
                    ...(lighting.directional ?? {
                        uuid: 'directional-light',
                        position: [10, 10, 10],
                        castShadow: true
                    }),
                    [key]: value
                }
            })
        }
    }

    /**
     * Изменяет цвет фона сцены.
     */
    const handleBackgroundChange = (value: string) => {
        if (onLightingChange && lighting) {
            onLightingChange({
                ...lighting,
                backgroundColor: value
            })
        }
    }

    /**
     * Изменяет параметры тумана сцены.
     * @param key поле настроек тумана
     * @param value новое значение
     */
    const handleFogChange = (key: keyof FogSettings, value: string | number | boolean) => {
        if (onLightingChange && lighting) {
            onLightingChange({
                ...lighting,
                fog: {
                    ...(lighting.fog ?? {
                        enabled: false,
                        type: 'linear',
                        color: '#87CEEB',
                        near: 10,
                        far: 100,
                        density: 0.01
                    }),
                    [key]: value
                }
            })
        }
    }

    const handlePresetChange = (presetKey: string | null) => {
        if (presetKey && onLightingChange) {
            const preset = LIGHTING_PRESETS[presetKey as keyof typeof LIGHTING_PRESETS]
            if (preset) {
                setSelectedPreset(presetKey)
                onLightingChange({
                    ambient: {
                        ...(lighting?.ambient ?? { uuid: 'ambient-light' }),
                        ...preset.ambient
                    },
                    directional: {
                        ...(lighting?.directional ?? {
                            uuid: 'directional-light',
                            position: [10, 10, 10],
                            castShadow: true
                        }),
                        ...preset.directional
                    },
                    backgroundColor: preset.backgroundColor
                })
            }
        }
    }

    // Определяем текущий пресет на основе настроек освещения
    useEffect(() => {
        if (lighting) {
            const currentPreset = Object.entries(LIGHTING_PRESETS).find(([key, preset]) =>
                preset.ambient.color === lighting.ambient?.color &&
                preset.ambient.intensity === lighting.ambient?.intensity &&
                preset.directional.color === lighting.directional?.color &&
                preset.directional.intensity === lighting.directional?.intensity &&
                preset.backgroundColor === lighting.backgroundColor
            )
            if (currentPreset) {
                setSelectedPreset(currentPreset[0])
            } else {
                setSelectedPreset('') // Кастомные настройки
            }
        }
    }, [lighting])

    if (!lighting || !onLightingChange) return null

    return (
        <>
            <Group justify="space-between" align="center">
                <Group gap="sm">
                    <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="gray"
                        onClick={() => setLightingExpanded(prev => !prev)}
                    >
                        {lightingExpanded ? (
                            <IconChevronDown size={14} />
                        ) : (
                            <IconChevronRight size={14} />
                        )}
                    </ActionIcon>
                    <IconBulb size={16} color="var(--mantine-color-yellow-6)" />
                    <Text size="xs" fw={500} c="dimmed">
                        Освещение
                    </Text>
                </Group>
            </Group>

            <Collapse in={lightingExpanded}>
                <Stack gap="xs" ml="md">
                    <Box>
                        <Text size="xs" fw={500} mb="xs">Пресеты освещения</Text>
                        <Select
                            size="xs"
                            value={selectedPreset}
                            onChange={handlePresetChange}
                            data={Object.entries(LIGHTING_PRESETS).map(([key, preset]) => ({
                                value: key,
                                label: preset.name
                            }))}
                        />
                    </Box>
                    <Box>
                        <Text size="xs" fw={500} mb="xs">Фоновое освещение</Text>
                        <Group gap="xs">
                            <ColorInput
                                size="xs"
                                value={lighting.ambient?.color || '#6b7280'}
                                onChange={(value) => handleAmbientChange('color', value)}
                                withEyeDropper={false}
                                style={{ flex: 1 }}
                            />
                            <NumberInput
                                size="xs"
                                value={lighting.ambient?.intensity || 0.4}
                                onChange={(value) => handleAmbientChange('intensity', value)}
                                min={0}
                                max={1}
                                step={0.1}
                                style={{ width: 60 }}
                            />
                        </Group>
                    </Box>

                    <Box>
                        <Text size="xs" fw={500} mb="xs">Направленный свет</Text>
                        <Group gap="xs">
                            <ColorInput
                                size="xs"
                                value={lighting.directional?.color || '#ffffff'}
                                onChange={(value) => handleDirectionalChange('color', value)}
                                withEyeDropper={false}
                                style={{ flex: 1 }}
                            />
                            <NumberInput
                                size="xs"
                                value={lighting.directional?.intensity || 0.8}
                                onChange={(value) => handleDirectionalChange('intensity', value)}
                                min={0}
                                max={1}
                                step={0.1}
                                style={{ width: 60 }}
                            />
                        </Group>
                    </Box>

                    <Box>
                        <Text size="xs" fw={500} mb="xs">Фон сцены</Text>
                        <ColorInput
                            size="xs"
                            value={lighting.backgroundColor || '#1a1b1e'}
                            onChange={(value) => handleBackgroundChange(value)}
                            withEyeDropper={false}
                        />
                    </Box>

                    <Box>
                        <Group justify="space-between" align="center" mb="xs">
                            <Text size="xs" fw={500}>Туман</Text>
                            <Switch
                                size="xs"
                                checked={lighting.fog?.enabled || false}
                                onChange={(event) => handleFogChange('enabled', event.currentTarget.checked)}
                            />
                        </Group>
                        
                        {lighting.fog?.enabled && (
                            <Stack gap="xs">
                                <SegmentedControl
                                    size="xs"
                                    value={lighting.fog?.type || 'linear'}
                                    onChange={(value) => handleFogChange('type', value as 'linear' | 'exponential')}
                                    data={[
                                        { label: 'Линейный', value: 'linear' },
                                        { label: 'Экспоненциальный', value: 'exponential' }
                                    ]}
                                />
                                
                                <ColorInput
                                    size="xs"
                                    label="Цвет тумана"
                                    value={lighting.fog?.color || '#87CEEB'}
                                    onChange={(value) => handleFogChange('color', value)}
                                    withEyeDropper={false}
                                />

                                {lighting.fog?.type === 'linear' ? (
                                    <>
                                        <Box>
                                            <Text size="xs" mb="xs">Ближняя граница: {lighting.fog?.near || 10}</Text>
                                            <Slider
                                                size="xs"
                                                value={lighting.fog?.near || 10}
                                                onChange={(value) => handleFogChange('near', value)}
                                                min={1}
                                                max={200}
                                                step={1}
                                            />
                                        </Box>
                                        <Box>
                                            <Text size="xs" mb="xs">Дальняя граница: {lighting.fog?.far || 100}</Text>
                                            <Slider
                                                size="xs"
                                                value={lighting.fog?.far || 100}
                                                onChange={(value) => handleFogChange('far', value)}
                                                min={50}
                                                max={1000}
                                                step={10}
                                            />
                                        </Box>
                                    </>
                                ) : (
                                    <Box>
                                        <Text size="xs" mb="xs">Плотность: {lighting.fog?.density?.toFixed(3) || 0.010}</Text>
                                        <Slider
                                            size="xs"
                                            value={lighting.fog?.density || 0.01}
                                            onChange={(value) => handleFogChange('density', value)}
                                            min={0.0001}
                                            max={0.01}
                                            step={0.0001}
                                        />
                                    </Box>
                                )}
                            </Stack>
                        )}
                    </Box>
                </Stack>
            </Collapse>

            <Divider />
        </>
    )
}
