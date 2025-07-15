import React, { useState } from 'react'
import {
    Group,
    Text,
    ActionIcon,
    Collapse,
    Stack,
    Box,
    ColorInput,
    NumberInput,
    Divider
} from '@mantine/core'
import { IconBulb, IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import type { LightingSettings } from '../types/scene'

interface LightingControlsProps {
    lighting?: LightingSettings
    onLightingChange?: (lighting: LightingSettings) => void
}

export const LightingControls: React.FC<LightingControlsProps> = ({
    lighting,
    onLightingChange
}) => {
    const [lightingExpanded, setLightingExpanded] = useState(false)

    const handleLightingChange = (key: keyof LightingSettings, value: any) => {
        if (onLightingChange && lighting) {
            onLightingChange({
                ...lighting,
                [key]: value
            })
        }
    }

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