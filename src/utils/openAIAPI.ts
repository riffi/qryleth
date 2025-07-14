import { getActiveGroup } from './openAISettings'
import {buildSystemPrompt} from "./systemPrompt.ts";



export interface  LightingSettings {
  ambientColor?: string;
  ambientIntensity?: number;
  directionalColor?: string;
  directionalIntensity?: number;
  backgroundColor?: string;
}

export interface ScenePlacement {
  objectIndex: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export interface SceneResponse {
  objects: unknown[];
  placements: ScenePlacement[];
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

    if (parsed && typeof parsed === 'object') {
      // Новый формат с объектами, расстановкой и освещением
      if (Array.isArray(parsed.objects) && Array.isArray(parsed.placements)) {
        return {
          objects: parsed.objects,
          placements: parsed.placements,
          lighting: parsed.lighting || {}
        }
      }

      // Формат без расстановки (обратная совместимость)
      if (parsed.objects && Array.isArray(parsed.objects)) {
        return {
          objects: parsed.objects,
          placements: [],
          lighting: parsed.lighting || {}
        }
      }

      // Старый формат – просто массив объектов
      if (Array.isArray(parsed)) {
        return { objects: parsed, placements: [] }
      }

      // Другие возможные форматы
      const arrays = Object.values(parsed).filter(Array.isArray)
      if (arrays.length > 0) {
        return { objects: arrays[0] as unknown[], placements: [] }
      }
    }

    return { objects: Array.isArray(parsed) ? parsed : [], placements: [] }
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        return { objects: JSON.parse(jsonMatch[0]), placements: [] }
      } catch (e) {
        console.error('Failed to parse extracted JSON:', e)
      }
    }

    console.error('LLM response parsing failed:', raw)
    throw new Error('Не удалось обработать ответ от ИИ')
  }
}
