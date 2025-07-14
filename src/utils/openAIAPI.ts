import { getActiveGroup } from './openAISettings'

function buildSystemPrompt(): string {
  return `Ты генератор JSON-сцен для Three.js.

Правила:
1. Отвечай ТОЛЬКО валидным JSON без комментариев.
2. Формат ответа — массив объектов и объект параметров освещения.
3. Разрешённые фигуры:
   • "box": {"width","height","depth","color","position"[x,y,z],"rotation"[x,y,z],"opacity","emissive","emissiveIntensity"}
   • "sphere": {"radius","color","position"[x,y,z],"rotation"[x,y,z],"opacity","emissive","emissiveIntensity"}
   • "cylinder": {"radiusTop","radiusBottom","height","radialSegments","color","position"[x,y,z],"rotation"[x,y,z],"opacity","emissive","emissiveIntensity"}
   • "cone": {"radius","height","radialSegments","color","position"[x,y,z],"rotation"[x,y,z],"opacity","emissive","emissiveIntensity"}
   • "pyramid": {"baseSize","height","color","position"[x,y,z],"rotation"[x,y,z],"opacity","emissive","emissiveIntensity"}
4. Цвет в hex (например, "#ff8800").
5. Размеры в метрах. Центр сцены (0,0,0).
6. Rotation (наклон) в радианах [x,y,z], где:
   • x - наклон вокруг оси X (вперёд/назад)
   • y - наклон вокруг оси Y (влево/вправо)
   • z - наклон вокруг оси Z (поворот)
7. Opacity (прозрачность) - число от 0 до 1, где 0 - полностью прозрачный, 1 - полностью непрозрачный.
8. Emissive (свечение) - цвет свечения в hex (например, "#ff0000"). Объект будет излучать свет указанного цвета.
9. EmissiveIntensity (интенсивность свечения) - число от 0 до бесконечности, по умолчанию 1. Чем больше значение, тем ярче свечение.
10. Параметры освещения должны быть включены в ответ как отдельный объект в формате:
    {
      "objects": [...массив объектов...],
      "lighting": {
        "ambientColor": "#цвет",
        "ambientIntensity": число от 0 до 1,
        "directionalColor": "#цвет", 
        "directionalIntensity": число от 0 до 1,
        "backgroundColor": "#цвет"
      }
    }

Пример полного ответа с настройками освещения:
{
  "objects": [
    {"type":"cylinder","radiusTop":0.3,"radiusBottom":0.5,"height":3,"radialSegments":12,"color":"#8B4513","position":[0,1.5,0],"rotation":[0.1,0,0]},
    {"type":"sphere","radius":1.5,"color":"#228B22","position":[0,3,0],"emissive":"#00ff00","emissiveIntensity":2}
  ],
  "lighting": {
    "ambientColor": "#6b7280",
    "ambientIntensity": 0.4,
    "directionalColor": "#ffffff",
    "directionalIntensity": 0.8,
    "backgroundColor": "#f8f9fa"
  }
}`
}

export interface  LightingSettings {
  ambientColor?: string;
  ambientIntensity?: number;
  directionalColor?: string;
  directionalIntensity?: number;
  backgroundColor?: string;
}

export interface SceneResponse {
  objects: unknown[];
  lighting?: LightingSettings;
}

export async function fetchSceneJSON(userPrompt: string): Promise<SceneResponse> {
  const { url, model, apiKey } = getActiveGroup()

  const body = {
    model,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: userPrompt }
    ],
    max_tokens: 30000,
    temperature: 0.7,
    reasoning: { exclude: true },
    response_format: { type: "json_object" }
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`OpenRouter error ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  let raw = (data.choices?.[0]?.message?.content ?? "").trim()

  console.log('Raw response:', raw)

  // Strip Markdown code fences to ensure valid JSON
  raw = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(raw)

    // Обработка нового формата ответа с объектами и настройками освещения
    if (parsed && typeof parsed === 'object') {
      // Проверяем, содержит ли ответ новый формат с объектами и освещением
      if (parsed.objects && Array.isArray(parsed.objects)) {
        return {
          objects: parsed.objects,
          lighting: parsed.lighting || {}
        }
      }

      // Обратная совместимость - если в ответе только массив объектов
      if (Array.isArray(parsed)) {
        return { objects: parsed }
      }

      // Проверка на другие форматы ответа (для обратной совместимости)
      const arrays = Object.values(parsed).filter(Array.isArray)
      if (arrays.length > 0) {
        return { objects: arrays[0] as unknown[] }
      }
    }

    return { objects: Array.isArray(parsed) ? parsed : [] }
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        return { objects: JSON.parse(jsonMatch[0]) }
      } catch (e) {
        console.error('Failed to parse extracted JSON:', e)
      }
    }

    console.error('LLM response parsing failed:', raw)
    throw new Error('Не удалось обработать ответ от ИИ')
  }
}
