// One-off move of persisted state from the old "recoveryos-*" keys to "pulso-*".
const RENAMED_KEYS: Record<string, string> = {
  'recoveryos-session':  'pulso-session',
  'recoveryos-plan-v1':  'pulso-plan-v1',
  'recoveryos-chat-v2':  'pulso-chat-v2',
  'recoveryos-v1-store': 'pulso-v1-store',
};

if (typeof window !== 'undefined') {
  try {
    for (const [oldKey, newKey] of Object.entries(RENAMED_KEYS)) {
      const value = window.localStorage.getItem(oldKey);
      if (value !== null && window.localStorage.getItem(newKey) === null) {
        window.localStorage.setItem(newKey, value);
      }
      window.localStorage.removeItem(oldKey);
    }
  } catch {
    // storage unavailable: nothing to migrate
  }
}
