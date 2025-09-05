import * as THREE from 'three'
import { forwardRef, useMemo } from 'react'
import { Effect } from 'postprocessing'
import { Uniform } from 'three'
import { wrapEffect } from '@react-three/postprocessing'

// GLSL: читаем depthBuffer, линейризуем и смешиваем к sky
const fragmentShader = /* glsl */`
uniform vec3 sky;
uniform float strength;
uniform float power;

float linearizeDepth(float depth, float near, float far) {
  // depth (0..1) из Z-буфера → линейная глубина (0..1)
  float z = depth * 2.0 - 1.0;
  float viewZ = (2.0 * near * far) / (far + near - z * (far - near));
  return clamp(viewZ / far, 0.0, 1.0);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float d = linearizeDepth(texture2D(depthBuffer, uv).x, cameraNear, cameraFar);
  float k = pow(d, power);                 // немного нелинейности
  vec3 mixed = mix(inputColor.rgb, sky, k * strength);
  outputColor = vec4(mixed, inputColor.a);
}
`;

class AtmosphericTintImpl extends Effect {
  constructor(sky: THREE.Color | number | string, strength = 0.6, power = 1.2) {
    const uniforms = new Map<string, Uniform>([
      ['sky', new Uniform(new THREE.Color(sky))],
      ['strength', new Uniform(strength)],
      ['power', new Uniform(power)],
    ])
    super('AtmosphericTint', fragmentShader, { uniforms })
    // говорим composer’у, что этому эффекту нужен depth
    ;(this as any).depthBuffer = true
  }
}

const _Wrapped = wrapEffect(AtmosphericTintImpl)

/**
 * <AtmosphericTint sky strength power />
 * - sky: цвет (число, hex, string)
 * - strength: сила смешивания (0..1)
 * - power: экспонента (1..2 обычно)
 */
export const AtmosphericTint = forwardRef<
    Effect,
    { sky?: THREE.ColorRepresentation; strength?: number; power?: number }
>(function AtmosphericTint({ sky = 0xbfd1e5, strength = 0.6, power = 1.2 }, ref) {
  const args = useMemo(() => [sky, strength, power] as const, [sky, strength, power])
  return <_Wrapped ref={ref as any} args={args} />
})
