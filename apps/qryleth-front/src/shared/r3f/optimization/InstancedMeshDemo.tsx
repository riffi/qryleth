import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { TestInstancedMesh } from './InstancedObjects'

/**
 * Демонстрационный компонент для показа работы Instanced Mesh
 * с составными объектами (столы с ножками)
 */
export const InstancedMeshDemo: React.FC = () => {
  const [showInfo, setShowInfo] = useState(true)

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Информационная панель */}
      {showInfo && (
        <div style={{
          position: 'absolute',
          top: 20,
          left: 20,
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          zIndex: 1000,
          maxWidth: '400px'
        }}>
          <h3>Instanced Mesh Demo</h3>
          <p>Демонстрация работы оптимизированного рендеринга составных объектов:</p>
          <ul>
            <li>8 экземпляров стола</li>
            <li>Каждый стол состоит из 5 примитивов (столешница + 4 ножки)</li>
            <li>Всего: 40 примитивов рендерятся как 5 InstancedMesh</li>
            <li>Значительное улучшение производительности</li>
          </ul>
          <button 
            onClick={() => setShowInfo(false)}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Закрыть
          </button>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [20, 10, 20], fov: 60 }}
        style={{ background: '#87CEEB' }}
      >
        {/* Освещение */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 10, 10]}
          intensity={1}
          castShadow
        />

        {/* Сетка */}
        <Grid
          args={[50, 50]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#6f6f6f"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#9d4b4b"
          fadeDistance={25}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={true}
        />

        {/* Управление камерой */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
        />

        {/* Тестовые instanced объекты */}
        <TestInstancedMesh />
      </Canvas>

      {/* Кнопка для показа информации */}
      {!showInfo && (
        <button
          onClick={() => setShowInfo(true)}
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: 1000
          }}
        >
          Показать информацию
        </button>
      )}
    </div>
  )
}

