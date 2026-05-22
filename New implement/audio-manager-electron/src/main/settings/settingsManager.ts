// Known settings keys, their allowed values, and defaults. Used to validate
// writes coming from the renderer before they hit the database.
export interface SettingSchema {
  default: string
  validate: (value: string) => boolean
}

export const SETTINGS_SCHEMA: Record<string, SettingSchema> = {
  output_directory: { default: '', validate: (v) => typeof v === 'string' && v.length > 0 },
  default_format: { default: 'copy', validate: (v) => ['copy', 'mp3', 'aac', 'flac'].includes(v) },
  gpu_enabled: { default: 'true', validate: (v) => v === 'true' || v === 'false' },
  theme: { default: 'system', validate: (v) => ['system', 'light', 'dark'].includes(v) },
  auto_update: { default: 'true', validate: (v) => v === 'true' || v === 'false' },
}

export function validateSetting(key: string, value: string): { valid: boolean; error?: string } {
  const schema = SETTINGS_SCHEMA[key]
  if (!schema) {
    return { valid: false, error: `Unknown setting key: ${key}` }
  }
  if (!schema.validate(value)) {
    return { valid: false, error: `Invalid value "${value}" for setting "${key}"` }
  }
  return { valid: true }
}
