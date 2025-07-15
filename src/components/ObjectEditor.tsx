import React, { useState, useRef, useEffect } from 'react'
import {
    Modal,
    Group,
    Button,
    Title,
    Box,
    Stack,
    Text,
    Badge,
    ActionIcon,
    Tooltip,
    Paper
} from '@mantine/core'
import { IconX, IconCheck, IconArrowRightBar, IconRotate, IconResize } from '@tabler/icons-react'
import type {ObjectInfo, ObjectInstance} from './ObjectManager'
import { useObjectEditor } from '../hooks/useObjectEditor'

interface ObjectEditorProps {
    opened: boolean
    onClose: () => void
    objectInfo?: ObjectInfo
    instanceId?: string
    objectData?: any // SceneObject data from the main scene
    onSave: (objectIndex: number, instanceId: string | undefined, position: [number, number, number], rotation: [number, number, number], scale: [number, number, number]) => void
}

export const ObjectEditor: React.FC<ObjectEditorProps> = ({
    opened,
    onClose,
    objectInfo,
    instanceId,
    objectData,
    onSave
}) => {
    const canvasRef = useRef<HTMLDivElement>(null)
    const [editMode, setEditMode] = useState<'move' | 'rotate' | 'scale'>('move')
    const [position, setPosition] = useState<[number, number, number]>([0, 0, 0])
    const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0])
    const [scale, setScale] = useState<[number, number, number]>([1, 1, 1])
    const [isModified, setIsModified] = useState(false)
    
    const { isInitialized, createSampleObject, createObjectFromData, updateObjectTransform, getObjectTransform } = useObjectEditor(canvasRef, opened)

    useEffect(() => {
        if (opened && objectInfo) {
            if (instanceId && objectInfo.instances) {
                const instance = objectInfo.instances.find(inst => inst.id === instanceId)
                if (instance) {
                    setPosition([...instance.position])
                    setRotation([...instance.rotation])
                    setScale([...instance.scale])
                }
            } else {
                setPosition([0, 0, 0])
                setRotation([0, 0, 0])
                setScale([1, 1, 1])
            }
            setIsModified(false)
        }
    }, [opened, objectInfo, instanceId])

    // Initialize 3D object when editor opens
    useEffect(() => {
        if (opened && isInitialized) {
            console.log('Creating object in editor', objectData)
            if (objectData) {
                createObjectFromData(objectData)
            } else {
                createSampleObject()
            }
        }
    }, [opened, isInitialized, createSampleObject, createObjectFromData, objectData])

    // Force re-check when modal opens
    useEffect(() => {
        if (opened && canvasRef.current) {
            console.log('Editor opened, container:', canvasRef.current.clientWidth, 'x', canvasRef.current.clientHeight)
            // Add a small delay to ensure modal is fully rendered
            const timeout = setTimeout(() => {
                if (canvasRef.current && !isInitialized) {
                    console.log('Forcing re-initialization after modal open')
                    // Force a re-render by updating a dependency
                    const event = new Event('resize')
                    window.dispatchEvent(event)
                }
            }, 200)
            return () => clearTimeout(timeout)
        }
    }, [opened, isInitialized])

    // Update 3D object when transform values change
    useEffect(() => {
        if (isInitialized) {
            updateObjectTransform(position, rotation, scale)
        }
    }, [position, rotation, scale, isInitialized, updateObjectTransform])

    useEffect(() => {
        if (!opened) return

        const handleKeyDown = (event: KeyboardEvent) => {
            const step = event.shiftKey ? 0.1 : 0.01

            switch (editMode) {
                case 'move':
                    switch (event.key) {
                        case 'ArrowLeft':
                            event.preventDefault()
                            setPosition(prev => {
                                const newPos: [number, number, number] = [prev[0] - step, prev[1], prev[2]]
                                setIsModified(true)
                                return newPos
                            })
                            break
                        case 'ArrowRight':
                            event.preventDefault()
                            setPosition(prev => {
                                const newPos: [number, number, number] = [prev[0] + step, prev[1], prev[2]]
                                setIsModified(true)
                                return newPos
                            })
                            break
                        case 'ArrowUp':
                            event.preventDefault()
                            setPosition(prev => {
                                const newPos: [number, number, number] = [prev[0], prev[1], prev[2] - step]
                                setIsModified(true)
                                return newPos
                            })
                            break
                        case 'ArrowDown':
                            event.preventDefault()
                            setPosition(prev => {
                                const newPos: [number, number, number] = [prev[0], prev[1], prev[2] + step]
                                setIsModified(true)
                                return newPos
                            })
                            break
                        case 'Numpad8':
                        case '8':
                            if (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD || event.ctrlKey) {
                                event.preventDefault()
                                setPosition(prev => {
                                    const newPos: [number, number, number] = [prev[0], prev[1] + step, prev[2]]
                                    setIsModified(true)
                                    return newPos
                                })
                            }
                            break
                        case 'Numpad2':
                        case '2':
                            if (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD || event.ctrlKey) {
                                event.preventDefault()
                                setPosition(prev => {
                                    const newPos: [number, number, number] = [prev[0], prev[1] - step, prev[2]]
                                    setIsModified(true)
                                    return newPos
                                })
                            }
                            break
                    }
                    break

                case 'rotate':
                    switch (event.key) {
                        case 'ArrowLeft':
                            event.preventDefault()
                            setRotation(prev => {
                                const newRot: [number, number, number] = [prev[0], prev[1] - step, prev[2]]
                                setIsModified(true)
                                return newRot
                            })
                            break
                        case 'ArrowRight':
                            event.preventDefault()
                            setRotation(prev => {
                                const newRot: [number, number, number] = [prev[0], prev[1] + step, prev[2]]
                                setIsModified(true)
                                return newRot
                            })
                            break
                        case 'ArrowUp':
                            event.preventDefault()
                            setRotation(prev => {
                                const newRot: [number, number, number] = [prev[0] - step, prev[1], prev[2]]
                                setIsModified(true)
                                return newRot
                            })
                            break
                        case 'ArrowDown':
                            event.preventDefault()
                            setRotation(prev => {
                                const newRot: [number, number, number] = [prev[0] + step, prev[1], prev[2]]
                                setIsModified(true)
                                return newRot
                            })
                            break
                        case 'Numpad8':
                        case '8':
                            if (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD || event.ctrlKey) {
                                event.preventDefault()
                                setRotation(prev => {
                                    const newRot: [number, number, number] = [prev[0], prev[1], prev[2] + step]
                                    setIsModified(true)
                                    return newRot
                                })
                            }
                            break
                        case 'Numpad2':
                        case '2':
                            if (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD || event.ctrlKey) {
                                event.preventDefault()
                                setRotation(prev => {
                                    const newRot: [number, number, number] = [prev[0], prev[1], prev[2] - step]
                                    setIsModified(true)
                                    return newRot
                                })
                            }
                            break
                    }
                    break

                case 'scale':
                    switch (event.key) {
                        case '=':
                        case '+':
                            event.preventDefault()
                            setScale(prev => {
                                const newScale: [number, number, number] = [prev[0] + step, prev[1] + step, prev[2] + step]
                                setIsModified(true)
                                return newScale
                            })
                            break
                        case '-':
                            event.preventDefault()
                            setScale(prev => {
                                const factor = Math.max(0.01, prev[0] - step)
                                const newScale: [number, number, number] = [factor, factor, factor]
                                setIsModified(true)
                                return newScale
                            })
                            break
                        case 'ArrowLeft':
                            event.preventDefault()
                            setScale(prev => {
                                const newScale: [number, number, number] = [Math.max(0.01, prev[0] - step), prev[1], prev[2]]
                                setIsModified(true)
                                return newScale
                            })
                            break
                        case 'ArrowRight':
                            event.preventDefault()
                            setScale(prev => {
                                const newScale: [number, number, number] = [prev[0] + step, prev[1], prev[2]]
                                setIsModified(true)
                                return newScale
                            })
                            break
                        case 'ArrowUp':
                            event.preventDefault()
                            setScale(prev => {
                                const newScale: [number, number, number] = [prev[0], prev[1] + step, prev[2]]
                                setIsModified(true)
                                return newScale
                            })
                            break
                        case 'ArrowDown':
                            event.preventDefault()
                            setScale(prev => {
                                const newScale: [number, number, number] = [prev[0], Math.max(0.01, prev[1] - step), prev[2]]
                                setIsModified(true)
                                return newScale
                            })
                            break
                        case 'Numpad8':
                        case '8':
                            if (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD || event.ctrlKey) {
                                event.preventDefault()
                                setScale(prev => {
                                    const newScale: [number, number, number] = [prev[0], prev[1], prev[2] + step]
                                    setIsModified(true)
                                    return newScale
                                })
                            }
                            break
                        case 'Numpad2':
                        case '2':
                            if (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD || event.ctrlKey) {
                                event.preventDefault()
                                setScale(prev => {
                                    const newScale: [number, number, number] = [prev[0], prev[1], Math.max(0.01, prev[2] - step)]
                                    setIsModified(true)
                                    return newScale
                                })
                            }
                            break
                    }
                    break
            }

            if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [opened, editMode, onClose])

    const handleSave = () => {
        if (objectInfo) {
            onSave(objectInfo.objectIndex, instanceId, position, rotation, scale)
            onClose()
        }
    }

    const handleClose = () => {
        if (isModified) {
            const confirmed = window.confirm('У вас есть несохраненные изменения. Вы уверены, что хотите закрыть редактор?')
            if (!confirmed) return
        }
        onClose()
    }

    if (!objectInfo) return null

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            fullScreen
            title={
                <Group gap="sm">
                    <Title order={3}>
                        Редактор объекта: {objectInfo.name}
                        {instanceId && ` (Экземпляр ${instanceId})`}
                    </Title>
                    {isModified && (
                        <Badge color="orange" variant="light">
                            Есть изменения
                        </Badge>
                    )}
                </Group>
            }
            styles={{
                body: { height: 'calc(100vh - 120px)', padding: 0 },
                content: { height: '100vh' },
                header: { padding: '1rem' }
            }}
        >
            <Box style={{ height: '100%', display: 'flex' }}>
                {/* Left Sidebar - Controls */}
                <Paper 
                    shadow="sm" 
                    p="md" 
                    style={{ 
                        width: 300, 
                        height: '100%',
                        borderRadius: 0,
                        borderRight: '1px solid var(--mantine-color-gray-3)'
                    }}
                >
                    <Stack gap="md">
                        <Title order={4}>Режим редактирования</Title>
                        
                        <Group gap="xs">
                            <Tooltip label="Перемещение">
                                <ActionIcon
                                    size="lg"
                                    variant={editMode === 'move' ? 'filled' : 'light'}
                                    color="blue"
                                    onClick={() => setEditMode('move')}
                                >
                                    <IconArrowRightBar size={20} />
                                </ActionIcon>
                            </Tooltip>
                            
                            <Tooltip label="Поворот">
                                <ActionIcon
                                    size="lg"
                                    variant={editMode === 'rotate' ? 'filled' : 'light'}
                                    color="green"
                                    onClick={() => setEditMode('rotate')}
                                >
                                    <IconRotate size={20} />
                                </ActionIcon>
                            </Tooltip>
                            
                            <Tooltip label="Масштаб">
                                <ActionIcon
                                    size="lg"
                                    variant={editMode === 'scale' ? 'filled' : 'light'}
                                    color="orange"
                                    onClick={() => setEditMode('scale')}
                                >
                                    <IconResize size={20} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>

                        {/* Position */}
                        <Stack gap="xs">
                            <Text fw={500}>Позиция</Text>
                            <Group gap="xs" align="center">
                                <Text size="xs" c="dimmed" w={15}>X:</Text>
                                <Text size="sm" fw={500}>{position[0].toFixed(3)}</Text>
                            </Group>
                            <Group gap="xs" align="center">
                                <Text size="xs" c="dimmed" w={15}>Y:</Text>
                                <Text size="sm" fw={500}>{position[1].toFixed(3)}</Text>
                            </Group>
                            <Group gap="xs" align="center">
                                <Text size="xs" c="dimmed" w={15}>Z:</Text>
                                <Text size="sm" fw={500}>{position[2].toFixed(3)}</Text>
                            </Group>
                        </Stack>

                        {/* Rotation */}
                        <Stack gap="xs">
                            <Text fw={500}>Поворот (рад)</Text>
                            <Group gap="xs" align="center">
                                <Text size="xs" c="dimmed" w={15}>X:</Text>
                                <Text size="sm" fw={500}>{rotation[0].toFixed(3)}</Text>
                            </Group>
                            <Group gap="xs" align="center">
                                <Text size="xs" c="dimmed" w={15}>Y:</Text>
                                <Text size="sm" fw={500}>{rotation[1].toFixed(3)}</Text>
                            </Group>
                            <Group gap="xs" align="center">
                                <Text size="xs" c="dimmed" w={15}>Z:</Text>
                                <Text size="sm" fw={500}>{rotation[2].toFixed(3)}</Text>
                            </Group>
                        </Stack>

                        {/* Scale */}
                        <Stack gap="xs">
                            <Text fw={500}>Масштаб</Text>
                            <Group gap="xs" align="center">
                                <Text size="xs" c="dimmed" w={15}>X:</Text>
                                <Text size="sm" fw={500}>{scale[0].toFixed(3)}</Text>
                            </Group>
                            <Group gap="xs" align="center">
                                <Text size="xs" c="dimmed" w={15}>Y:</Text>
                                <Text size="sm" fw={500}>{scale[1].toFixed(3)}</Text>
                            </Group>
                            <Group gap="xs" align="center">
                                <Text size="xs" c="dimmed" w={15}>Z:</Text>
                                <Text size="sm" fw={500}>{scale[2].toFixed(3)}</Text>
                            </Group>
                        </Stack>

                        {/* Controls Help */}
                        <Stack gap="xs" mt="md">
                            <Text fw={500} size="sm">Управление</Text>
                            {editMode === 'move' && (
                                <>
                                    <Text size="xs" c="dimmed">←→↑↓ - перемещение по XZ</Text>
                                    <Text size="xs" c="dimmed">Num8/Num2 или Ctrl+8/2 - по Y</Text>
                                    <Text size="xs" c="dimmed">Shift - точное движение</Text>
                                </>
                            )}
                            {editMode === 'rotate' && (
                                <>
                                    <Text size="xs" c="dimmed">←→ - поворот по Y</Text>
                                    <Text size="xs" c="dimmed">↑↓ - поворот по X</Text>
                                    <Text size="xs" c="dimmed">Num8/Num2 - поворот по Z</Text>
                                    <Text size="xs" c="dimmed">Shift - точный поворот</Text>
                                </>
                            )}
                            {editMode === 'scale' && (
                                <>
                                    <Text size="xs" c="dimmed">+/- - равномерный масштаб</Text>
                                    <Text size="xs" c="dimmed">←→ - масштаб по X</Text>
                                    <Text size="xs" c="dimmed">↑↓ - масштаб по Y</Text>
                                    <Text size="xs" c="dimmed">Num8/Num2 - масштаб по Z</Text>
                                    <Text size="xs" c="dimmed">Shift - точное изменение</Text>
                                </>
                            )}
                            <Text size="xs" c="dimmed">Esc - закрыть редактор</Text>
                        </Stack>

                        {/* Action Buttons */}
                        <Group gap="xs" mt="auto">
                            <Button
                                variant="light"
                                color="gray"
                                onClick={handleClose}
                                leftSection={<IconX size={16} />}
                                style={{ flex: 1 }}
                            >
                                Отмена
                            </Button>
                            <Button
                                onClick={handleSave}
                                leftSection={<IconCheck size={16} />}
                                style={{ flex: 1 }}
                                disabled={!isModified}
                            >
                                Сохранить
                            </Button>
                        </Group>
                    </Stack>
                </Paper>

                {/* Main Editor Area */}
                <Box
                    ref={canvasRef}
                    style={{
                        flex: 1,
                        backgroundColor: 'var(--mantine-color-gray-1)',
                        position: 'relative'
                    }}
                >
                    {!isInitialized && (
                        <Box
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center'
                            }}
                        >
                            <Text size="lg" c="dimmed">
                                Загрузка 3D редактора...
                            </Text>
                        </Box>
                    )}
                    
                    {/* Mode indicator */}
                    {isInitialized && (
                        <Box
                            style={{
                                position: 'absolute',
                                top: 16,
                                left: 16,
                                zIndex: 10,
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                borderRadius: 'var(--mantine-radius-sm)',
                                padding: '8px 12px',
                                border: '1px solid var(--mantine-color-gray-3)'
                            }}
                        >
                            <Text size="sm" fw={500}>
                                Режим: {editMode === 'move' ? 'Перемещение' : editMode === 'rotate' ? 'Поворот' : 'Масштаб'}
                            </Text>
                        </Box>
                    )}
                </Box>
            </Box>
        </Modal>
    )
}