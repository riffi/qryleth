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
import type { LightingSettings, AmbientLightSettings, DirectionalLightSettings, FogSettings, SkySettings } from '@/entities/lighting'

interface LightingControlsProps {
    lighting?: LightingSettings
    onLightingChange?: (lighting: LightingSettings) => void
}

const LIGHTING_PRESETS = {
    'bright-day': {
        name: 'Яркий день',
        ambient: { color: '#87CEEB', intensity: 1 },
        directional: { color: '#FFD700', intensity: 1.0, position: [50, 100, 50] },
        backgroundColor: '#87CEEB',
        sky: {
            distance: 450000,
            turbidity: 0.5,
            rayleigh: 1.0,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.8,
            elevation: 1.2,
            azimuth: 0.25,
            exposure: 1.3
        }
    },
    'evening': {
        name: 'Вечер',
        ambient: { color: '#ff9770', intensity: 0.4 },
        directional: { color: '#fb9653', intensity: 0.8, position: [30, 20, 30] },
        backgroundColor: '#512d1e',
        sky: {
            distance: 450000,
            turbidity: 3.0,
            rayleigh: 0.5,
            mieCoefficient: 0.04,
            mieDirectionalG: 0.9,
            elevation: 0.1,
            azimuth: 2,
            exposure: 0.9
        }
    },
    'night': {
        name: 'Ночь',
        ambient: { color: '#5f5f88', intensity: 0.8 },
        directional: { color: '#7f96da', intensity: 0.8, position: [20, 10, 20] },
        backgroundColor: '#0C0C1E',
        sky: {
            distance: 450000,
            turbidity: 0.1,
            rayleigh: 0.2,
            mieCoefficient: 0.001,
            mieDirectionalG: 0.7,
            elevation: -0.3,
            azimuth: 0.1,
            exposure: 0.2
        }
    },
    'moonlight': {
        name: 'Лунный свет',
        ambient: { color: '#B0C4DE', intensity: 0.25 },
        directional: { color: '#E6E6FA', intensity: 0.4, position: [20, 60, 20] },
        backgroundColor: '#191970',
        sky: {
            distance: 450000,
            turbidity: 0.3,
            rayleigh: 0.8,
            mieCoefficient: 0.002,
            mieDirectionalG: 0.75,
            elevation: 0.8,
            azimuth: 1.5,
            exposure: 0.6
        }
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

    /**
     * Изменяет параметры неба сцены.
     * @param key поле настроек неба
     * @param value новое значение
     */
    const handleSkyChange = (key: keyof SkySettings, value: string | number) => {
        if (onLightingChange && lighting) {
            onLightingChange({
                ...lighting,
                sky: {
                    ...(lighting.sky ?? {
                        distance: 450000,
                        turbidity: 0.1,
                        rayleigh: 1.0,
                        mieCoefficient: 0.005,
                        mieDirectionalG: 0.8,
                        elevation: 1.2,
                        azimuth: 0.25,
                        exposure: 0.5
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
                    sky: {
                        ...(lighting?.sky ?? {
                            distance: 450000,
                            turbidity: 0.1,
                            rayleigh: 1.0,
                            mieCoefficient: 0.005,
                            mieDirectionalG: 0.8,
                            elevation: 1.2,
                            azimuth: 0.25,
                            exposure: 0.5
                        }),
                        ...preset.sky
                    },
                    backgroundColor: preset.backgroundColor
                })
            }
        }
    }

    // Определяем текущий пресет на основе настроек освещения
    useEffect(() => {
        if (lighting) {
            const currentPreset = Object.entries(LIGHTING_PRESETS).find(([key, preset]) => {
                const ambientMatch = preset.ambient.color === lighting.ambient?.color &&
                    preset.ambient.intensity === lighting.ambient?.intensity
                const directionalMatch = preset.directional.color === lighting.directional?.color &&
                    preset.directional.intensity === lighting.directional?.intensity &&
                    JSON.stringify(preset.directional.position) === JSON.stringify(lighting.directional?.position)
                const backgroundMatch = preset.backgroundColor === lighting.backgroundColor
                const skyMatch = lighting.sky && preset.sky &&
                    preset.sky.turbidity === lighting.sky.turbidity &&
                    preset.sky.elevation === lighting.sky.elevation &&
                    preset.sky.azimuth === lighting.sky.azimuth &&
                    preset.sky.rayleigh === lighting.sky.rayleigh &&
                    preset.sky.mieCoefficient === lighting.sky.mieCoefficient &&
                    preset.sky.mieDirectionalG === lighting.sky.mieDirectionalG &&
                    preset.sky.exposure === lighting.sky.exposure

                return ambientMatch && directionalMatch && backgroundMatch && skyMatch
            })
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
