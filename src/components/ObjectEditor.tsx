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
    Paper,
    Select,
    Divider
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
    onSave: (objectIndex: number, instanceId: string | undefined, primitiveStates: {[key: number]: {position: [number, number, number], rotation: [number, number, number], dimensions: any}}) => void
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
    const [primitiveStates, setPrimitiveStates] = useState<{[key: number]: {position: [number, number, number], rotation: [number, number, number], dimensions: any}}>({})
    const [isModified, setIsModified] = useState(false)
    
    const { isInitialized, createSampleObject, createObjectFromData, updateObjectTransform, getObjectTransform, selectedPrimitive, selectedPrimitiveIndex, selectPrimitiveByIndex, getPrimitivesList, getCameraRelativeMovement, cloneSelectedPrimitive } = useObjectEditor(canvasRef, opened)

    // Helper functions for primitive states
    const getCurrentPrimitiveState = () => {
        if (!objectData?.primitives[selectedPrimitiveIndex]) {
            return { position: [0, 0, 0], rotation: [0, 0, 0], dimensions: {} }
        }
        
        const primitive = objectData.primitives[selectedPrimitiveIndex]
        const storedState = primitiveStates[selectedPrimitiveIndex]
        
        return storedState || { 
            position: [0, 0, 0], 
            rotation: [0, 0, 0], 
            dimensions: {
                width: primitive.width || 1,
                height: primitive.height || 1,
                depth: primitive.depth || 1,
                radius: primitive.radius || 1,
                baseSize: primitive.baseSize || 1
            }
        }
    }

    const updateCurrentPrimitiveState = (position: [number, number, number], rotation: [number, number, number], dimensions: any) => {
        setPrimitiveStates(prev => ({
            ...prev,
            [selectedPrimitiveIndex]: { position, rotation, dimensions }
        }))
    }

    useEffect(() => {
        if (opened && objectInfo) {
            if (instanceId && objectInfo.instances) {
                const instance = objectInfo.instances.find(inst => inst.id === instanceId)
                if (instance) {
                    // Initialize primitive states for instance editing
                    setPrimitiveStates(prev => ({
                        ...prev,
                        0: {
                            position: [...instance.position],
                            rotation: [...instance.rotation],
                            scale: [...instance.scale]
                        }
                    }))
                }
            } else {
                // Reset primitive states for new object editing
                setPrimitiveStates({})
            }
            setIsModified(false)
        } else if (!opened) {
            // Clear primitive states when editor closes
            setPrimitiveStates({})
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
    }, [opened, isInitialized, objectData, createObjectFromData, createSampleObject]) // Возвращаем, но теперь это стабильные функции

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

    // Update 3D object when primitive state changes
    useEffect(() => {
        if (isInitialized && selectedPrimitive) {
            const state = getCurrentPrimitiveState()
            updateObjectTransform(state.position, state.rotation, state.dimensions)
        }
    }, [primitiveStates, selectedPrimitiveIndex, isInitialized, selectedPrimitive])

    // Initialize primitive states when primitives are loaded
    useEffect(() => {
        if (isInitialized && objectData) {
            const primitivesList = getPrimitivesList()
            const newStates: {[key: number]: {position: [number, number, number], rotation: [number, number, number], dimensions: any}} = {}
            
            primitivesList.forEach((_, index) => {
                if (!primitiveStates[index]) {
                    const primitive = objectData.primitives[index]
                    if (primitive) {
                        newStates[index] = { 
                            position: [0, 0, 0], 
                            rotation: [0, 0, 0], 
                            dimensions: {
                                width: primitive.width || 1,
                                height: primitive.height || 1,
                                depth: primitive.depth || 1,
                                radius: primitive.radius || 1,
                                baseSize: primitive.baseSize || 1
                            }
                        }
                    } else {
                        newStates[index] = { 
                            position: [0, 0, 0], 
                            rotation: [0, 0, 0], 
                            dimensions: {
                                width: 1,
                                height: 1,
                                depth: 1,
                                radius: 1,
                                baseSize: 1
                            }
                        }
                    }
                }
            })
            
            if (Object.keys(newStates).length > 0) {
                setPrimitiveStates(prev => ({ ...prev, ...newStates }))
            }
        }
    }, [isInitialized, getPrimitivesList, objectData])

    useEffect(() => {
        if (!opened) return

        const handleKeyDown = (event: KeyboardEvent) => {
            const step = event.shiftKey ? 0.1 : 0.01
            const currentState = getCurrentPrimitiveState()
            let newState = { ...currentState }
            let hasChanged = false

            switch (editMode) {
                case 'move':
                    switch (event.key) {
                        case 'ArrowLeft':
                            event.preventDefault()
                            {
                                const [dx, dy, dz] = getCameraRelativeMovement('left', step)
                                newState.position = [currentState.position[0] + dx, currentState.position[1] + dy, currentState.position[2] + dz]
                                hasChanged = true
                            }
                            break
                        case 'ArrowRight':
                            event.preventDefault()
                            {
                                const [dx, dy, dz] = getCameraRelativeMovement('right', step)
                                newState.position = [currentState.position[0] + dx, currentState.position[1] + dy, currentState.position[2] + dz]
                                hasChanged = true
                            }
                            break
                        case 'ArrowUp':
                            event.preventDefault()
                            {
                                const [dx, dy, dz] = getCameraRelativeMovement('backward', step)
                                newState.position = [currentState.position[0] + dx, currentState.position[1] + dy, currentState.position[2] + dz]
                                hasChanged = true
                            }
                            break
                        case 'ArrowDown':
                            event.preventDefault()
                            {
                                const [dx, dy, dz] = getCameraRelativeMovement('forward', step)
                                newState.position = [currentState.position[0] + dx, currentState.position[1] + dy, currentState.position[2] + dz]
                                hasChanged = true
                            }
                            break
                        case 'Numpad8':
                        case '8':
                            if (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD || event.ctrlKey) {
                                event.preventDefault()
                                newState.position = [currentState.position[0], currentState.position[1] + step, currentState.position[2]]
                                hasChanged = true
                            }
                            break
                        case 'Numpad2':
                        case '2':
                            if (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD || event.ctrlKey) {
                                event.preventDefault()
                                newState.position = [currentState.position[0], currentState.position[1] - step, currentState.position[2]]
                                hasChanged = true
                            }
                            break
                    }
                    break

                case 'rotate':
                    switch (event.key) {
                        case 'ArrowLeft':
                            event.preventDefault()
                            newState.rotation = [currentState.rotation[0], currentState.rotation[1] - step, currentState.rotation[2]]
                            hasChanged = true
                            break
                        case 'ArrowRight':
                            event.preventDefault()
                            newState.rotation = [currentState.rotation[0], currentState.rotation[1] + step, currentState.rotation[2]]
                            hasChanged = true
                            break
                        case 'ArrowUp':
                            event.preventDefault()
                            newState.rotation = [currentState.rotation[0] - step, currentState.rotation[1], currentState.rotation[2]]
                            hasChanged = true
                            break
                        case 'ArrowDown':
                            event.preventDefault()
                            newState.rotation = [currentState.rotation[0] + step, currentState.rotation[1], currentState.rotation[2]]
                            hasChanged = true
                            break
                        case 'Numpad8':
                        case '8':
                            if (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD || event.ctrlKey) {
                                event.preventDefault()
                                newState.rotation = [currentState.rotation[0], currentState.rotation[1], currentState.rotation[2] + step]
                                hasChanged = true
                            }
                            break
                        case 'Numpad2':
                        case '2':
                            if (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD || event.ctrlKey) {
                                event.preventDefault()
                                newState.rotation = [currentState.rotation[0], currentState.rotation[1], currentState.rotation[2] - step]
                                hasChanged = true
                            }
                            break
                    }
                    break

                case 'scale':
                    if (!objectData?.primitives[selectedPrimitiveIndex]) break
                    
                    const primitive = objectData.primitives[selectedPrimitiveIndex]
                    const newDimensions = { ...currentState.dimensions }
                    
                    switch (event.key) {
                        case '=':
                        case '+':
                            event.preventDefault()
                            if (primitive.type === 'box') {
                                newDimensions.width = Math.max(0.01, newDimensions.width + step)
                                newDimensions.height = Math.max(0.01, newDimensions.height + step)
                                newDimensions.depth = Math.max(0.01, newDimensions.depth + step)
                            } else if (primitive.type === 'sphere') {
                                newDimensions.radius = Math.max(0.01, newDimensions.radius + step)
                            } else if (primitive.type === 'cylinder' || primitive.type === 'cone') {
                                newDimensions.radius = Math.max(0.01, newDimensions.radius + step)
                                newDimensions.height = Math.max(0.01, newDimensions.height + step)
                            } else if (primitive.type === 'pyramid') {
                                newDimensions.baseSize = Math.max(0.01, newDimensions.baseSize + step)
                                newDimensions.height = Math.max(0.01, newDimensions.height + step)
                            }
                            newState.dimensions = newDimensions
                            hasChanged = true
                            break
                        case '-':
                            event.preventDefault()
                            if (primitive.type === 'box') {
                                newDimensions.width = Math.max(0.01, newDimensions.width - step)
                                newDimensions.height = Math.max(0.01, newDimensions.height - step)
                                newDimensions.depth = Math.max(0.01, newDimensions.depth - step)
                            } else if (primitive.type === 'sphere') {
                                newDimensions.radius = Math.max(0.01, newDimensions.radius - step)
                            } else if (primitive.type === 'cylinder' || primitive.type === 'cone') {
                                newDimensions.radius = Math.max(0.01, newDimensions.radius - step)
                                newDimensions.height = Math.max(0.01, newDimensions.height - step)
                            } else if (primitive.type === 'pyramid') {
                                newDimensions.baseSize = Math.max(0.01, newDimensions.baseSize - step)
                                newDimensions.height = Math.max(0.01, newDimensions.height - step)
                            }
                            newState.dimensions = newDimensions
                            hasChanged = true
                            break
                        case 'ArrowLeft':
                            event.preventDefault()
                            if (primitive.type === 'box') {
                                newDimensions.width = Math.max(0.01, newDimensions.width - step)
                            } else if (primitive.type === 'sphere' || primitive.type === 'cylinder' || primitive.type === 'cone') {
                                newDimensions.radius = Math.max(0.01, newDimensions.radius - step)
                            } else if (primitive.type === 'pyramid') {
                                newDimensions.baseSize = Math.max(0.01, newDimensions.baseSize - step)
                            }
                            newState.dimensions = newDimensions
                            hasChanged = true
                            break
                        case 'ArrowRight':
                            event.preventDefault()
                            if (primitive.type === 'box') {
                                newDimensions.width = Math.max(0.01, newDimensions.width + step)
                            } else if (primitive.type === 'sphere' || primitive.type === 'cylinder' || primitive.type === 'cone') {
                                newDimensions.radius = Math.max(0.01, newDimensions.radius + step)
                            } else if (primitive.type === 'pyramid') {
                                newDimensions.baseSize = Math.max(0.01, newDimensions.baseSize + step)
                            }
                            newState.dimensions = newDimensions
                            hasChanged = true
                            break
                        case 'ArrowUp':
                            event.preventDefault()
                            if (primitive.type === 'box') {
                                newDimensions.height = Math.max(0.01, newDimensions.height + step)
                            } else if (primitive.type === 'cylinder' || primitive.type === 'cone' || primitive.type === 'pyramid') {
                                newDimensions.height = Math.max(0.01, newDimensions.height + step)
                            }
                            newState.dimensions = newDimensions
                            hasChanged = true
                            break
                        case 'ArrowDown':
                            event.preventDefault()
                            if (primitive.type === 'box') {
                                newDimensions.height = Math.max(0.01, newDimensions.height - step)
                            } else if (primitive.type === 'cylinder' || primitive.type === 'cone' || primitive.type === 'pyramid') {
                                newDimensions.height = Math.max(0.01, newDimensions.height - step)
                            }
                            newState.dimensions = newDimensions
                            hasChanged = true
                            break
                        case 'Numpad8':
                        case '8':
                            if (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD || event.ctrlKey) {
                                event.preventDefault()
                                if (primitive.type === 'box') {
                                    newDimensions.depth = Math.max(0.01, newDimensions.depth + step)
                                }
                                newState.dimensions = newDimensions
                                hasChanged = true
                            }
                            break
                        case 'Numpad2':
                        case '2':
                            if (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD || event.ctrlKey) {
                                event.preventDefault()
                                if (primitive.type === 'box') {
                                    newDimensions.depth = Math.max(0.01, newDimensions.depth - step)
                                }
                                newState.dimensions = newDimensions
                                hasChanged = true
                            }
                            break
                    }
                    break
            }

            if (hasChanged) {
                updateCurrentPrimitiveState(newState.position, newState.rotation, newState.dimensions)
                setIsModified(true)
            }

            if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
            }
            
            if (event.key === 'd' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                handleClonePrimitive()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [opened, editMode, onClose, selectedPrimitiveIndex, primitiveStates])

    const handleSave = () => {
        if (objectInfo) {
            // Pass all primitive states to the save function
            onSave(objectInfo.objectIndex, instanceId, primitiveStates)
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

    const handleClonePrimitive = () => {
        if (!selectedPrimitive) return
        
        const clonedData = cloneSelectedPrimitive()
        if (clonedData) {
            // Update object data to include the new primitive
            if (objectData) {
                objectData.primitives.push(clonedData)
            }
            
            // Initialize state for the new primitive
            const newIndex = getPrimitivesList().length - 1
            setPrimitiveStates(prev => ({
                ...prev,
                [newIndex]: {
                    position: [0, 0, 0],
                    rotation: [0, 0, 0],
                    dimensions: {
                        width: clonedData.width || 1,
                        height: clonedData.height || 1,
                        depth: clonedData.depth || 1,
                        radius: clonedData.radius || 1,
                        baseSize: clonedData.baseSize || 1
                    }
                }
            }))
            
            setIsModified(true)
        }
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
                        <Title order={4}>Выбор примитива</Title>
                        
                        <Select
                            value={selectedPrimitiveIndex.toString()}
                            onChange={(value) => {
                                if (value !== null) {
                                    selectPrimitiveByIndex(parseInt(value))
                                }
                            }}
                            data={getPrimitivesList().map((primitive, index) => ({
                                value: index.toString(),
                                label: `${primitive.name} ${index + 1}`
                            }))}
                            placeholder="Выберите примитив"
                            size="sm"
                        />
                        
                        <Text size="xs" c="dimmed">
                            Кликните на объект в сцене или выберите из списка
                        </Text>
                        
                        {selectedPrimitive && (
                            <Paper p="xs" bg="blue.0" radius="sm">
                                <Text size="sm" fw={500} c="blue.7">
                                    Выбран: {getPrimitivesList()[selectedPrimitiveIndex]?.name || 'Неизвестно'} {selectedPrimitiveIndex + 1}
                                </Text>
                            </Paper>
                        )}
                        
                        {selectedPrimitive && (
                            <Button
                                size="xs"
                                variant="light"
                                color="green"
                                onClick={handleClonePrimitive}
                                fullWidth
                            >
                                Клонировать примитив
                            </Button>
                        )}
                        
                        <Divider />
                        
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
                                <Text size="sm" fw={500}>{getCurrentPrimitiveState().position[0].toFixed(3)}</Text>
                            </Group>
                            <Group gap="xs" align="center">
                                <Text size="xs" c="dimmed" w={15}>Y:</Text>
                                <Text size="sm" fw={500}>{getCurrentPrimitiveState().position[1].toFixed(3)}</Text>
                            </Group>
                            <Group gap="xs" align="center">
                                <Text size="xs" c="dimmed" w={15}>Z:</Text>
                                <Text size="sm" fw={500}>{getCurrentPrimitiveState().position[2].toFixed(3)}</Text>
                            </Group>
                        </Stack>

                        {/* Rotation */}
                        <Stack gap="xs">
                            <Text fw={500}>Поворот (рад)</Text>
                            <Group gap="xs" align="center">
                                <Text size="xs" c="dimmed" w={15}>X:</Text>
                                <Text size="sm" fw={500}>{getCurrentPrimitiveState().rotation[0].toFixed(3)}</Text>
                            </Group>
                            <Group gap="xs" align="center">
                                <Text size="xs" c="dimmed" w={15}>Y:</Text>
                                <Text size="sm" fw={500}>{getCurrentPrimitiveState().rotation[1].toFixed(3)}</Text>
                            </Group>
                            <Group gap="xs" align="center">
                                <Text size="xs" c="dimmed" w={15}>Z:</Text>
                                <Text size="sm" fw={500}>{getCurrentPrimitiveState().rotation[2].toFixed(3)}</Text>
                            </Group>
                        </Stack>

                        {/* Dimensions */}
                        <Stack gap="xs">
                            <Text fw={500}>Размеры</Text>
                            {objectData?.primitives[selectedPrimitiveIndex] && (() => {
                                const primitive = objectData.primitives[selectedPrimitiveIndex]
                                const dimensions = getCurrentPrimitiveState().dimensions
                                
                                if (primitive.type === 'box') {
                                    return (
                                        <>
                                            <Group gap="xs" align="center">
                                                <Text size="xs" c="dimmed" w={40}>Ширина:</Text>
                                                <Text size="sm" fw={500}>{dimensions.width?.toFixed(3) || '1.000'}</Text>
                                            </Group>
                                            <Group gap="xs" align="center">
                                                <Text size="xs" c="dimmed" w={40}>Высота:</Text>
                                                <Text size="sm" fw={500}>{dimensions.height?.toFixed(3) || '1.000'}</Text>
                                            </Group>
                                            <Group gap="xs" align="center">
                                                <Text size="xs" c="dimmed" w={40}>Глубина:</Text>
                                                <Text size="sm" fw={500}>{dimensions.depth?.toFixed(3) || '1.000'}</Text>
                                            </Group>
                                        </>
                                    )
                                } else if (primitive.type === 'sphere') {
                                    return (
                                        <Group gap="xs" align="center">
                                            <Text size="xs" c="dimmed" w={40}>Радиус:</Text>
                                            <Text size="sm" fw={500}>{dimensions.radius?.toFixed(3) || '1.000'}</Text>
                                        </Group>
                                    )
                                } else if (primitive.type === 'cylinder' || primitive.type === 'cone') {
                                    return (
                                        <>
                                            <Group gap="xs" align="center">
                                                <Text size="xs" c="dimmed" w={40}>Радиус:</Text>
                                                <Text size="sm" fw={500}>{dimensions.radius?.toFixed(3) || '1.000'}</Text>
                                            </Group>
                                            <Group gap="xs" align="center">
                                                <Text size="xs" c="dimmed" w={40}>Высота:</Text>
                                                <Text size="sm" fw={500}>{dimensions.height?.toFixed(3) || '2.000'}</Text>
                                            </Group>
                                        </>
                                    )
                                } else if (primitive.type === 'pyramid') {
                                    return (
                                        <>
                                            <Group gap="xs" align="center">
                                                <Text size="xs" c="dimmed" w={40}>Основание:</Text>
                                                <Text size="sm" fw={500}>{dimensions.baseSize?.toFixed(3) || '1.000'}</Text>
                                            </Group>
                                            <Group gap="xs" align="center">
                                                <Text size="xs" c="dimmed" w={40}>Высота:</Text>
                                                <Text size="sm" fw={500}>{dimensions.height?.toFixed(3) || '2.000'}</Text>
                                            </Group>
                                        </>
                                    )
                                }
                                return null
                            })()}
                        </Stack>

                        {/* Controls Help */}
                        <Stack gap="xs" mt="md">
                            <Text fw={500} size="sm">Управление</Text>
                            {editMode === 'move' && (
                                <>
                                    <Text size="xs" c="dimmed">←→ - влево/вправо относительно камеры</Text>
                                    <Text size="xs" c="dimmed">↑↓ - назад/вперед относительно камеры</Text>
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
                                    <Text size="xs" c="dimmed">+/- - равномерное изменение размера</Text>
                                    <Text size="xs" c="dimmed">←→ - ширина/радиус</Text>
                                    <Text size="xs" c="dimmed">↑↓ - высота</Text>
                                    <Text size="xs" c="dimmed">Num8/Num2 - глубина (для box)</Text>
                                    <Text size="xs" c="dimmed">Shift - точное изменение</Text>
                                </>
                            )}
                            <Text size="xs" c="dimmed">Esc - закрыть редактор</Text>
                            <Text size="xs" c="dimmed">Ctrl+D - клонировать примитив</Text>
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
                            {selectedPrimitive && (
                                <Text size="xs" c="dimmed">
                                    Примитив: {getPrimitivesList()[selectedPrimitiveIndex]?.name || 'Неизвестно'} {selectedPrimitiveIndex + 1}
                                </Text>
                            )}
                        </Box>
                    )}
                </Box>
            </Box>
        </Modal>
    )
}