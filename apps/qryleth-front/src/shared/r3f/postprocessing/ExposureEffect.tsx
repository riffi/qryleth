import React, { useEffect, useMemo } from 'react'
import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

/**
 * Компонент эффекта экспозиции для пайплайна постпроцессинга.
 *
 * Зачем нужен:
 * - В ToneMappingEffect из библиотеки postprocessing отсутствует явный параметр exposure
 *   (для режимов AGX/ACES экспозиция не применяется внутри эффекта).
 * - В стандартном рендерере three экспозиция применяется умножением цвета перед тонемаппингом.
 * - Данный эффект повторяет это поведение: масштабирует цвет входного буфера на коэффициент экспозиции,
 *   после чего уже применяется финальный тонемаппинг (ACES/AGX или другой), подключённый далее.
 */
class ExposureEffectImpl extends Effect {
  /**
   * Создаёт эффект экспозиции.
   * @param exposure — коэффициент экспозиции (>0). 1.0 — без изменений.
   */
  constructor(exposure: number = 1.0) {
    super(
      'ExposureEffect',
      // Простой фрагментный шейдер: умножаем входной цвет на экспозицию
      /* glsl */ `
        uniform float exposure;
        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          outputColor = vec4(inputColor.rgb * exposure, inputColor.a);
        }
      `,
      {
        blendFunction: BlendFunction.NORMAL,
        uniforms: new Map<string, Uniform>([
          ['exposure', new Uniform(exposure)],
        ]),
      },
    )
  }

  /**
   * Текущее значение экспозиции эффекта.
   */
  get exposure(): number {
    return (this.uniforms.get('exposure') as Uniform<number>).value as number
  }

  /**
   * Устанавливает значение экспозиции эффекта.
   */
  set exposure(v: number) {
    ;(this.uniforms.get('exposure') as Uniform<number>).value = v
  }
}

interface ExposureProps {
  /**
   * Значение экспозиции (>0). 1.0 — без изменений.
   */
  exposure: number
}

/**
 * React-обёртка для эффекта экспозиции. Создаёт и обновляет экземпляр эффекта.
 */
export const Exposure: React.FC<ExposureProps> = ({ exposure }) => {
  // Создаём эффект один раз на маунт
  const effect = useMemo(() => new ExposureEffectImpl(exposure ?? 1.0), [])

  // Обновляем значение экспозиции при изменениях
  useEffect(() => {
    effect.exposure = Math.max(0.0001, exposure ?? 1.0)
  }, [effect, exposure])

  // Возвращаем примитив эффекта для EffectComposer
  return <primitive object={effect} />
}

