export function getOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey === 'sk-...' || apiKey.length < 20) return null;
  return apiKey;
}

export function getOpenAiModel() {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-5.4-mini';
}
