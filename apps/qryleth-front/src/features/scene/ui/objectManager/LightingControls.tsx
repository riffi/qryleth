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
    Select
} from '@mantine/core'
import { IconBulb, IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import type { LightingSettings, AmbientLightSettings, DirectionalLightSettings } from '@/entities/lighting'

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
                </Stack>
            </Collapse>

            <Divider />
        </>
    )
}
