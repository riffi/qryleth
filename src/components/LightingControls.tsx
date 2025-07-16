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
import type { LightingSettings } from '../types/scene'

interface LightingControlsProps {
    lighting?: LightingSettings
    onLightingChange?: (lighting: LightingSettings) => void
}

const LIGHTING_PRESETS = {
    'bright-day': {
        name: 'Яркий день',
        ambientColor: '#87CEEB',
        ambientIntensity: 0.6,
        directionalColor: '#FFD700',
        directionalIntensity: 1.0,
        backgroundColor: '#87CEEB'
    },
    'evening': {
        name: 'Вечер',
        ambientColor: '#FF6B35',
        ambientIntensity: 0.3,
        directionalColor: '#FF8C42',
        directionalIntensity: 0.6,
        backgroundColor: '#2C1810'
    },
    'night': {
        name: 'Ночь',
        ambientColor: '#1E1E3F',
        ambientIntensity: 0.2,
        directionalColor: '#4169E1',
        directionalIntensity: 0.3,
        backgroundColor: '#0C0C1E'
    },
    'moonlight': {
        name: 'Лунный свет',
        ambientColor: '#B0C4DE',
        ambientIntensity: 0.25,
        directionalColor: '#E6E6FA',
        directionalIntensity: 0.4,
        backgroundColor: '#191970'
    }
} as const

export const LightingControls: React.FC<LightingControlsProps> = ({
    lighting,
    onLightingChange
}) => {
    const [lightingExpanded, setLightingExpanded] = useState(false)
    const [selectedPreset, setSelectedPreset] = useState<string>('bright-day')

    const handleLightingChange = (key: keyof LightingSettings, value: any) => {
        if (onLightingChange && lighting) {
            onLightingChange({
                ...lighting,
                [key]: value
            })
        }
    }

    const handlePresetChange = (presetKey: string | null) => {
        if (presetKey && onLightingChange) {
            const preset = LIGHTING_PRESETS[presetKey as keyof typeof LIGHTING_PRESETS]
            if (preset) {
                setSelectedPreset(presetKey)
                onLightingChange({
                    ambientColor: preset.ambientColor,
                    ambientIntensity: preset.ambientIntensity,
                    directionalColor: preset.directionalColor,
                    directionalIntensity: preset.directionalIntensity,
                    backgroundColor: preset.backgroundColor
                })
            }
        }
    }

    // Определяем текущий пресет на основе настроек освещения
    useEffect(() => {
        if (lighting) {
            const currentPreset = Object.entries(LIGHTING_PRESETS).find(([key, preset]) => 
                preset.ambientColor === lighting.ambientColor &&
                preset.ambientIntensity === lighting.ambientIntensity &&
                preset.directionalColor === lighting.directionalColor &&
                preset.directionalIntensity === lighting.directionalIntensity &&
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
                                value={lighting.ambientColor || '#6b7280'}
                                onChange={(value) => handleLightingChange('ambientColor', value)}
                                withEyeDropper={false}
                                style={{ flex: 1 }}
                            />
                            <NumberInput
                                size="xs"
                                value={lighting.ambientIntensity || 0.4}
                                onChange={(value) => handleLightingChange('ambientIntensity', value)}
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
                                value={lighting.directionalColor || '#ffffff'}
                                onChange={(value) => handleLightingChange('directionalColor', value)}
                                withEyeDropper={false}
                                style={{ flex: 1 }}
                            />
                            <NumberInput
                                size="xs"
                                value={lighting.directionalIntensity || 0.8}
                                onChange={(value) => handleLightingChange('directionalIntensity', value)}
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
                            onChange={(value) => handleLightingChange('backgroundColor', value)}
                            withEyeDropper={false}
                        />
                    </Box>
                </Stack>
            </Collapse>

            <Divider />
        </>
    )
}