import { normalizeCorosToolText } from './coros-mcp.client';

describe('normalizeCorosToolText', () => {
  it('decodes the JSON-encoded text returned by the live COROS MCP server', () => {
    const raw = '"Sleep Data\\n========================\\n2026-09-08\\nMain Sleep: 7h 20min"';

    expect(normalizeCorosToolText(raw)).toBe(
      'Sleep Data\n========================\n2026-09-08\nMain Sleep: 7h 20min',
    );
  });

  it('leaves regular text and malformed JSON untouched', () => {
    expect(normalizeCorosToolText('plain\ntext')).toBe('plain\ntext');
    expect(normalizeCorosToolText('"malformed')).toBe('"malformed');
  });
});
