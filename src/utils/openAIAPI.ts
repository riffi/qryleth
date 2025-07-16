import { getActiveConnection } from './openAISettings'
import {buildSystemPrompt} from "./systemPrompt.ts";
import type { SceneObject, ScenePrimitive, SceneResponse, LightingSettings } from '../types/scene'

export async function fetchSceneJSON(userPrompt: string): Promise<SceneResponse> {
  const { url, model, apiKey } = await getActiveConnection()

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
      // Новый формат с составными объектами
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

      // Старый формат – просто массив объектов (конвертируем в новый)
      if (Array.isArray(parsed)) {
        const convertedObjects = parsed.map((primitive: unknown, index: number) => ({
          name: `Object_${index}`,
          primitives: [primitive as ScenePrimitive]
        }))
        return {
          objects: convertedObjects,
          placements: convertedObjects.map((_: unknown, index: number) => ({ objectIndex: index }))
        }
      }

      // Другие возможные форматы
      const arrays = Object.values(parsed).filter(Array.isArray)
      if (arrays.length > 0) {
        const convertedObjects = (arrays[0] as unknown[]).map((primitive: unknown, index: number) => ({
          name: `Object_${index}`,
          primitives: [primitive as ScenePrimitive]
        }))
        return {
          objects: convertedObjects,
          placements: convertedObjects.map((_: unknown, index: number) => ({ objectIndex: index }))
        }
      }
    }

    return { objects: [], placements: [] }
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        const parsedArray = JSON.parse(jsonMatch[0])
        const convertedObjects = parsedArray.map((primitive: unknown, index: number) => ({
          name: `Object_${index}`,
          primitives: [primitive as ScenePrimitive]
        }))
        return {
          objects: convertedObjects,
          placements: convertedObjects.map((_: unknown, index: number) => ({ objectIndex: index }))
        }
      } catch (e) {
        console.error('Failed to parse extracted JSON:', e)
      }
    }

    console.error('LLM response parsing failed:', raw)
    throw new Error('Не удалось обработать ответ от ИИ')
  }
}