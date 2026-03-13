import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OPENROUTER_CHAT_RESPONSE,
  LEAD_CONTEXT_FIXTURE,
} from './helpers/fixtures.js';

import {
  substituteVariables,
  generateDraft,
} from '../src/services/openrouter.js';

describe('substituteVariables', () => {
  it('replaces all 5 template variables', () => {
    const template = 'Bonjour {{nom}}, votre mariage le {{date_evenement}}. Budget: {{budget}}. Contact: {{email}} / {{telephone}}.';
    const lead = {
      name: 'Sophie Dupont',
      eventDate: '15/06/2027',
      budget: '2500',
      email: 'sophie@example.com',
      phone: '+33612345678',
    };

    const result = substituteVariables(template, lead);

    expect(result).toBe('Bonjour Sophie Dupont, votre mariage le 15/06/2027. Budget: 2500. Contact: sophie@example.com / +33612345678.');
  });

  it('handles missing variables gracefully', () => {
    const template = 'Bonjour {{nom}}, budget: {{budget}}';
    const lead = { name: 'Test', eventDate: '', budget: '', email: '', phone: '' };

    const result = substituteVariables(template, lead);
    expect(result).toBe('Bonjour Test, budget: ');
  });
});

describe('generateDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls OpenRouter with correct payload and returns content', async () => {
    const mockAxiosInstance = {
      post: vi.fn().mockResolvedValue({ data: OPENROUTER_CHAT_RESPONSE }),
    };

    const promptTemplate = 'Tu es un assistant de mariage. Le client est {{nom}}, mariage le {{date_evenement}}.';
    const result = await generateDraft(
      LEAD_CONTEXT_FIXTURE,
      promptTemplate,
      'test-api-key',
      mockAxiosInstance as never,
    );

    expect(result).toContain('Bonjour Sophie');
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);

    const [url, payload, axiosConfig] = mockAxiosInstance.post.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(payload.model).toBe('anthropic/claude-sonnet-4');
    expect(axiosConfig.headers['Authorization']).toBe('Bearer test-api-key');
    expect(axiosConfig.headers['HTTP-Referer']).toBe('https://weds.fr');
  });

  it('includes lead context in system prompt', async () => {
    const mockAxiosInstance = {
      post: vi.fn().mockResolvedValue({ data: OPENROUTER_CHAT_RESPONSE }),
    };

    const promptTemplate = 'Client: {{nom}}. Emails recents: voir contexte.';
    await generateDraft(
      LEAD_CONTEXT_FIXTURE,
      promptTemplate,
      'test-api-key',
      mockAxiosInstance as never,
    );

    const [, payload] = mockAxiosInstance.post.mock.calls[0];
    const systemMessage = payload.messages.find((m: { role: string }) => m.role === 'system');
    expect(systemMessage).toBeDefined();
    expect(systemMessage.content).toContain('Sophie Dupont');

    const userMessage = payload.messages.find((m: { role: string }) => m.role === 'user');
    expect(userMessage).toBeDefined();
    expect(userMessage.content).toContain('Sophie Dupont');
  });
});
