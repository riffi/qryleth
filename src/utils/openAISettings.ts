export interface OpenAISettingsGroup {
  id: string;
  name: string;
  url: string;
  model: string;
  apiKey: string;
}

interface StoredSettings {
  groups: OpenAISettingsGroup[];
  activeId?: string;
}

const STORAGE_KEY = 'openai_settings';

function getDefaultGroup(): OpenAISettingsGroup {
  return {
    id: 'default',
    name: 'Default',
    url: 'https://api.polza.ai/api/v1/chat/completions',
    model: 'anthropic/claude-sonnet-4',
    apiKey: ''
  };
}

function loadFromStorage(): StoredSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const def = { groups: [getDefaultGroup()], activeId: 'default' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(def));
    return def;
  }
  try {
    const parsed = JSON.parse(raw) as StoredSettings;
    if (!parsed.groups || !Array.isArray(parsed.groups)) {
      throw new Error('Invalid');
    }
    return parsed;
  } catch {
    const def = { groups: [getDefaultGroup()], activeId: 'default' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(def));
    return def;
  }
}

function saveToStorage(data: StoredSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getAllGroups(): { groups: OpenAISettingsGroup[]; activeId?: string } {
  return loadFromStorage();
}

export function saveGroups(groups: OpenAISettingsGroup[], activeId?: string) {
  saveToStorage({ groups, activeId });
}

export function setActiveGroup(id: string) {
  const data = loadFromStorage();
  data.activeId = id;
  saveToStorage(data);
}

export function getActiveGroup(): OpenAISettingsGroup {
  const data = loadFromStorage();
  const found = data.groups.find(g => g.id === data.activeId);
  return found || data.groups[0];
}

export function upsertGroup(group: OpenAISettingsGroup) {
  const data = loadFromStorage();
  const idx = data.groups.findIndex(g => g.id === group.id);
  if (idx >= 0) {
    data.groups[idx] = group;
  } else {
    data.groups.push(group);
  }
  saveToStorage(data);
}

export function removeGroup(id: string) {
  const data = loadFromStorage();
  data.groups = data.groups.filter(g => g.id !== id);
  if (data.activeId === id) {
    data.activeId = data.groups[0]?.id;
  }
  saveToStorage(data);
}
