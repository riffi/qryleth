import * as THREE from 'three'

export type LeafShape = 'billboard' | 'coniferCross' | 'texture'

export interface PatchLeafMaterialOptions {
  shape: LeafShape
  texAspect: number
  // Отладочные флаги и параметры маски/изгиба
  rectDebug?: boolean
  edgeDebug?: boolean
  edgeSoftness?: number
  bendAmountBillboard?: number
  bendAmountConifer?: number
  // Параметры HSV-покраски для режима 'texture'
  leafPaintFactor?: number
  targetLeafColorLinear?: THREE.Color
  /**
   * Управлять предварительным умножением цвета на альфу в режиме 'texture'.
   * По умолчанию true (минимизация bleeding по краям), но при бэйке билбордов
   * это может сильно затемнять листья. Для бэйка следует отключать (false).
   */
  preMultiplyAlpha?: boolean
  /**
   * Сила дополнительной подсветки на просвет (backlight), 0..1.
   *
   * Ранее подсветка добавлялась константно и делала листья слишком светлыми,
   * слабо реагирующими на изменение освещения. Теперь её можно масштабировать
   * (например, по интенсивности окружающего света сцены) или отключить (0).
   */
  backlightStrength?: number
}

/**
 * Унифицированно настраивает MeshStandardMaterial для листвы перед компиляцией шейдера.
 *
 * Возможности:
 * - Эллиптическая маска в UV для режимов без текстуры;
 * - Мягкий изгиб плоскости по нормали (разные коэффициенты для 'billboard'/'coniferCross');
 * - Рамка по прямоугольнику UV (отладка) и подсветка края по альфа-границе (отладка);
 * - Для 'texture' — HSV-покраска выборки карты цвета к целевому цвету материала «Листья»;
 * - Поддержка центра вращения внутри спрайта (uniform uTexCenter), задается извне.
 */
export function patchLeafMaterial(
  mat: THREE.MeshStandardMaterial,
  opts: PatchLeafMaterialOptions,
): void {
  const shape = opts.shape
  const aspect = shape === 'coniferCross' ? 2.4 : (shape === 'texture' ? (opts.texAspect || 1) : 0.6)
  const edgeSoft = opts.edgeSoftness ?? 0.18
  const bend = shape === 'coniferCross' ? (opts.bendAmountConifer ?? 0.06) : (opts.bendAmountBillboard ?? 0.08)
  const rectDebug = !!opts.rectDebug
  const edgeDebug = !!opts.edgeDebug

  // Делаем листья двусторонними (тонкие плоскости/«кресты»).
  mat.side = THREE.DoubleSide
  // Ранее здесь насильно проставлялся alphaTest для текстурных листьев (0.5),
  // что дублировало настройку из React-пропов материала. Убираем дублирование —
  // шейдер возьмёт актуальный порог из матрицы uniform'ов (ниже).

  mat.onBeforeCompile = (shader) => {
    // Базовые uniform и varying
    const vCommon = (shape === 'texture')
      ? `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;\nuniform float uBend;\nuniform vec2 uTexCenter;\nattribute float aLeafPaintMul;\nvarying float vLeafPaintMul;\nvarying vec2 vLeafUv;`
      : `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;\nuniform float uBend;\nuniform vec2 uTexCenter;\nvarying vec2 vLeafUv;`
    const vBegin = (shape === 'texture')
      ? `\nvec3 pos = position;\n  vLeafUv = uv;\n  vLeafPaintMul = aLeafPaintMul;\n  float bend = (vLeafUv.y - 0.5);\n  pos += normalize(normal) * ((bend * bend - 0.25) * uBend);\n  vec3 transformed = pos;\n`
      : `\nvec3 pos = position;\n  vLeafUv = uv;\n  float bend = (vLeafUv.y - 0.5);\n  pos += normalize(normal) * ((bend * bend - 0.25) * uBend);\n  vec3 transformed = pos;\n`

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', vCommon)
      .replace('#include <begin_vertex>', vBegin)
      .replace('#include <uv_vertex>', `#include <uv_vertex>`)

    // Фрагмент: маска/отладка/HSV-покраска
    if (shape !== 'texture') {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;`)
        .replace('#include <alphatest_fragment>', `
          float dx = (vLeafUv.x - 0.5) / 0.5;
          float dy = (vLeafUv.y - 0.5) / 0.5 / uAspect;
          float r2 = dx*dx + dy*dy;
          float alphaMask = smoothstep(1.0 - uEdgeSoftness, 1.0, 1.0 - r2);
          diffuseColor.a *= alphaMask;
          #include <alphatest_fragment>
        `)
    }

    // Перед отсечкой — подмешиваем альфу рамки по краям плоскости (если включен debug)
    if (shape === 'texture') {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <alphatest_fragment>', `
          if (uRectDebug > 0.5) {
            float d = min(min(vLeafUv.x, vLeafUv.y), min(1.0 - vLeafUv.x, 1.0 - vLeafUv.y));
            float wr = max(uRectWidth, fwidth(d) * 2.0);
            float edgeR = 1.0 - smoothstep(wr * 0.5, wr, d);
            diffuseColor.a = max(diffuseColor.a, edgeR);
          }
          #include <alphatest_fragment>
        `)

    }



    // Общие uniforms для debug и HSV-покраски
    {
      let frag = shader.fragmentShader
      const debugCommon = `#include <common>\nuniform float uEdgeDebug;\nuniform vec3 uEdgeColor;\nuniform float uEdgeWidth;\nuniform float uAlphaThreshold;\nuniform float uRectDebug;\nuniform vec3 uRectColor;\nuniform float uRectWidth;\nuniform float uBacklightStrength;\n${shape === 'texture' ? 'uniform float uLeafPaintFactor;\nuniform vec3 uLeafTargetColor;\nuniform float uPremultiplyAlpha;\nvec3 rgb2hsv(vec3 c){ vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); float e = 1.0e-10; return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x); }\nvec3 hsv2rgb(vec3 c){ vec3 rgb = clamp( abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0 ); return c.z * mix(vec3(1.0), rgb, c.y); }\nfloat mixHue(float a, float b, float t){ float d = b - a; d = mod(d + 0.5, 1.0) - 0.5; return fract(a + d * t + 1.0); }' : ''}\n${shape === 'texture' ? 'varying float vLeafPaintMul;\n' : ''}varying vec2 vLeafUv;`
      frag = frag.replace('#include <common>', debugCommon)
      const hsvBlock = (shape === 'texture') ? `\n  
        // Предварительное умножение цвета на альфу (контролируемое флагом)\n  
        if (uPremultiplyAlpha > 0.5) { diffuseColor.rgb *= diffuseColor.a; }\n  
        float leafEff = uLeafPaintFactor * vLeafPaintMul;\n  
        if (leafEff > 0.0001) {\n
            vec3 hsv = rgb2hsv(diffuseColor.rgb);\n    
            vec3 tgt = rgb2hsv(uLeafTargetColor);\n    
            hsv.x = mixHue(hsv.x, tgt.x, leafEff);\n    
            hsv.y = mix(hsv.y, tgt.y, leafEff);\n    
            hsv.z = mix(hsv.z, tgt.z, leafEff);\n
            diffuseColor.rgb = hsv2rgb(hsv);\n
         }\n` : ''
      const debugMap = `#include <map_fragment>\n#if defined(USE_MAP)\n  if (uEdgeDebug > 0.5) {\n    float a = diffuseColor.a;\n    float w = fwidth(a) * uEdgeWidth;\n    float edge = 1.0 - smoothstep(uAlphaThreshold - w, uAlphaThreshold + w, a);\n    diffuseColor.rgb = mix(diffuseColor.rgb, uEdgeColor, clamp(edge, 0.0, 1.0));\n  }\n#endif\n  if (uRectDebug > 0.5) {\n    float d = min(min(vLeafUv.x, vLeafUv.y), min(1.0 - vLeafUv.x, 1.0 - vLeafUv.y));\n    float wr = max(uRectWidth, fwidth(d) * 2.0);\n    float edgeR = 1.0 - smoothstep(wr * 0.5, wr, d);\n    diffuseColor.a = max(diffuseColor.a, edgeR);\n    diffuseColor.rgb = mix(diffuseColor.rgb, uRectColor, clamp(edgeR, 0.0, 1.0));\n  }\n`
      frag = frag.replace('#include <map_fragment>', debugMap.replace('#include <map_fragment>', `#include <map_fragment>${hsvBlock}`))
      shader.fragmentShader = frag
    }

    // Мягкая подсветка на просвет (тонкий «транслуцентный» эффект), теперь управляемая.
    // Сила задаётся uniform'ом uBacklightStrength (0..1). При 0 — эффект отключён.
    // shader.fragmentShader = shader.fragmentShader
    //   .replace('#include <lights_fragment_end>', `
    //     #include <lights_fragment_end>
    //     float back = clamp(dot(normalize(-geometryNormal), normalize(vec3(0.2, 1.0, 0.1))), 0.0, 1.0);
    //     reflectedLight.indirectDiffuse += vec3(0.06, 0.10, 0.06) * back * uBacklightStrength;
    //   `)

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
    // Управление силой подсветки на просвет: по умолчанию выключено (0.0)
    shader.uniforms.uBacklightStrength = { value: Math.max(0, Math.min(1, opts.backlightStrength ?? 0.0)) }
    if (shape === 'texture') {
      const c = opts.targetLeafColorLinear || new THREE.Color('#2E8B57')
      shader.uniforms.uLeafPaintFactor = { value: opts.leafPaintFactor ?? 0 }
      shader.uniforms.uLeafTargetColor = { value: new THREE.Color(c.r, c.g, c.b) }
      shader.uniforms.uPremultiplyAlpha = { value: opts.preMultiplyAlpha === false ? 0.0 : 1.0 }
    }
    ;(mat as any).userData.uniforms = shader.uniforms
  }

  mat.needsUpdate = true
}
