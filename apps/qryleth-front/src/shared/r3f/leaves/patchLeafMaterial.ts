import * as THREE from 'three'

export type LeafShape = 'texture'

export interface PatchLeafMaterialOptions {
  /** Всегда 'texture' */
  shape: LeafShape
  /** Соотношение сторон спрайта */
  texAspect: number
  // Отладочные флаги и параметры маски/изгиба
  rectDebug?: boolean
  edgeDebug?: boolean
  edgeSoftness?: number
  // Параметры HSV‑покраски
  leafPaintFactor?: number
  targetLeafColorLinear?: THREE.Color
  /** Управлять предварительным умножением цвета на альфу (уменьшение bleeding по краям). */
  preMultiplyAlpha?: boolean
  /** Сила подсветки на просвет (0..1). */
  backlightStrength?: number
  /** Глобальный коэффициент фейда (0..1) для дизеринга. */
  fade?: number
  /** Использовать ли пер‑инстансовый атрибут aFade вместо uFade. */
  useInstanceFade?: boolean
}

/**
 * Настройка MeshStandardMaterial только для текстурированных листьев.
 * Поддержка: изгиб плоскости, HSV‑покраска цветовой карты, отладка прямоугольника/краёв,
 * центр спрайта (uTexCenter), фейд и управление premultiply.
 */
export function patchLeafMaterial(
  mat: THREE.MeshStandardMaterial,
  opts: PatchLeafMaterialOptions,
): void {
  const aspect = opts.texAspect || 1
  const edgeSoft = opts.edgeSoftness ?? 0.18
  const bend = 0.08
  const rectDebug = !!opts.rectDebug
  const edgeDebug = !!opts.edgeDebug

  // Листья — двусторонние плоскости
  mat.side = THREE.DoubleSide

  mat.onBeforeCompile = (shader) => {
    // Вершинный шейдер: базовые uniform и varying
    const vCommon = `#include <common>\n` +
      `uniform float uAspect;\n` +
      `uniform float uEdgeSoftness;\n` +
      `uniform float uBend;\n` +
      `uniform vec2 uTexCenter;\n` +
      `attribute float aLeafPaintMul;\n` +
      `attribute float aFade;\n` +
      `varying float vLeafPaintMul;\n` +
      `varying float vFade;\n` +
      `varying vec2 vLeafUv;`
    const vBegin = `\nvec3 pos = position;\n` +
      `vLeafUv = uv;\n` +
      `vLeafPaintMul = aLeafPaintMul;\n` +
      `vFade = aFade;\n` +
      `float bend = (vLeafUv.y - 0.5);\n` +
      `pos += normalize(normal) * ((bend * bend - 0.25) * uBend);\n` +
      `vec3 transformed = pos;\n`

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', vCommon)
      .replace('#include <begin_vertex>', vBegin)
      .replace('#include <uv_vertex>', `#include <uv_vertex>`)

    // Фрагментный шейдер: HSV‑покраска + отладка
    let frag = shader.fragmentShader
    const debugCommon = `#include <common>\n` +
      `uniform float uEdgeDebug;\n` +
      `uniform vec3 uEdgeColor;\n` +
      `uniform float uEdgeWidth;\n` +
      `uniform float uAlphaThreshold;\n` +
      `uniform float uRectDebug;\n` +
      `uniform vec3 uRectColor;\n` +
      `uniform float uRectWidth;\n` +
      `uniform float uBacklightStrength;\n` +
      `uniform float uFade;\n` +
      `uniform float uUseInstanceFade;\n` +
      `uniform float uLeafPaintFactor;\n` +
      `uniform vec3 uLeafTargetColor;\n` +
      `uniform float uPremultiplyAlpha;\n` +
      `vec3 rgb2hsv(vec3 c){ vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); float e = 1.0e-10; return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x); }\n` +
      `vec3 hsv2rgb(vec3 c){ vec3 rgb = clamp( abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0 ); return c.z * mix(vec3(1.0), rgb, c.y); }\n` +
      `float mixHue(float a, float b, float t){ float d = b - a; d = mod(d + 0.5, 1.0) - 0.5; return fract(a + d * t + 1.0); }\n` +
      `varying float vLeafPaintMul;\n` +
      `varying vec2 vLeafUv;\n` +
      `varying float vFade;`
    frag = frag.replace('#include <common>', debugCommon)

    const hsvBlock = `\n  if (uPremultiplyAlpha > 0.5) { diffuseColor.rgb *= diffuseColor.a; }\n` +
      `  float leafEff = uLeafPaintFactor * vLeafPaintMul;\n` +
      `  if (leafEff > 0.0001) {\n` +
      `    vec3 hsv = rgb2hsv(diffuseColor.rgb);\n` +
      `    vec3 tgt = rgb2hsv(uLeafTargetColor);\n` +
      `    hsv.x = mixHue(hsv.x, tgt.x, leafEff);\n` +
      `    hsv.y = mix(hsv.y, tgt.y, leafEff);\n` +
      `    hsv.z = mix(hsv.z, tgt.z, leafEff);\n` +
      `    diffuseColor.rgb = hsv2rgb(hsv);\n` +
      `  }\n`

    const debugMap = `#include <map_fragment>\n` +
      `#if defined(USE_MAP)\n` +
      `  if (uEdgeDebug > 0.5) {\n` +
      `    float a = diffuseColor.a;\n` +
      `    float w = fwidth(a) * uEdgeWidth;\n` +
      `    float edge = 1.0 - smoothstep(uAlphaThreshold - w, uAlphaThreshold + w, a);\n` +
      `    diffuseColor.rgb = mix(diffuseColor.rgb, uEdgeColor, clamp(edge, 0.0, 1.0));\n` +
      `  }\n` +
      `#endif\n` +
      `  // Дизер-фейд (ordered 4x4 Bayer) по uFade или aFade\n` +
      `  float _fade = mix(uFade, vFade, clamp(uUseInstanceFade, 0.0, 1.0));\n` +
      `  int bx = int(mod(gl_FragCoord.x, 4.0));\n` +
      `  int by = int(mod(gl_FragCoord.y, 4.0));\n` +
      `  int bayer[16];\n` +
      `  bayer[0]=0; bayer[1]=8; bayer[2]=2; bayer[3]=10; bayer[4]=12; bayer[5]=4; bayer[6]=14; bayer[7]=6; bayer[8]=3; bayer[9]=11; bayer[10]=1; bayer[11]=9; bayer[12]=15; bayer[13]=7; bayer[14]=13; bayer[15]=5;\n` +
      `  float _thr = (float(bayer[by*4+bx]) + 0.5) / 16.0;\n` +
      `  if (_fade < _thr) discard;\n` +
      `  // Альфа-отсечка после модификации a\n` +
      `  if (diffuseColor.a < uAlphaThreshold) discard;\n` +
      `  if (uRectDebug > 0.5) {\n` +
      `    float d = min(min(vLeafUv.x, vLeafUv.y), min(1.0 - vLeafUv.x, 1.0 - vLeafUv.y));\n` +
      `    float wr = max(uRectWidth, fwidth(d) * 2.0);\n` +
      `    float edgeR = 1.0 - smoothstep(wr * 0.5, wr, d);\n` +
      `    diffuseColor.a = max(diffuseColor.a, edgeR);\n` +
      `    diffuseColor.rgb = mix(diffuseColor.rgb, uRectColor, clamp(edgeR, 0.0, 1.0));\n` +
      `  }\n`

    frag = frag.replace('#include <map_fragment>', debugMap.replace('#include <map_fragment>', `#include <map_fragment>${hsvBlock}`))
    shader.fragmentShader = frag

    // Инициализация uniform'ов
    shader.uniforms.uAspect = { value: aspect }
    shader.uniforms.uEdgeSoftness = { value: edgeSoft }
    shader.uniforms.uBend = { value: bend }
    shader.uniforms.uRectDebug = { value: rectDebug ? 1.0 : 0.0 }
    shader.uniforms.uRectColor = { value: new THREE.Color(0xff00ff) }
    shader.uniforms.uRectWidth = { value: 0.02 }
    shader.uniforms.uEdgeDebug = { value: edgeDebug ? 1.0 : 0.0 }
    shader.uniforms.uEdgeColor = { value: new THREE.Color(0x00ff00) }
    shader.uniforms.uEdgeWidth = { value: 2.0 }
    shader.uniforms.uAlphaThreshold = { value: (mat.alphaTest ?? 0.5) as number }
    shader.uniforms.uBacklightStrength = { value: Math.max(0, Math.min(1, opts.backlightStrength ?? 0.0)) }
    shader.uniforms.uFade = { value: Math.max(0, Math.min(1, opts.fade ?? 1.0)) }
    shader.uniforms.uUseInstanceFade = { value: opts.useInstanceFade ? 1.0 : 0.0 }
    const c = opts.targetLeafColorLinear || new THREE.Color('#2E8B57')
    shader.uniforms.uLeafPaintFactor = { value: opts.leafPaintFactor ?? 0 }
    shader.uniforms.uLeafTargetColor = { value: new THREE.Color(c.r, c.g, c.b) }
    shader.uniforms.uPremultiplyAlpha = { value: opts.preMultiplyAlpha === false ? 0.0 : 1.0 }
    ;(mat as any).userData.uniforms = shader.uniforms
  }

  mat.needsUpdate = true
}
