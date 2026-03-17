import { createHash, randomBytes } from 'crypto';
import { logger } from '../logger.js';

// --- Langfuse via OTLP HTTP (real-time ingestion) + REST fallback for scores ---

const LANGFUSE_SECRET_KEY = process.env.LANGFUSE_SECRET_KEY || '';
const LANGFUSE_PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY || '';
const LANGFUSE_BASE_URL = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';
const langfuseEnabled = !!(LANGFUSE_SECRET_KEY && LANGFUSE_PUBLIC_KEY);

const basicAuth = langfuseEnabled
  ? 'Basic ' + Buffer.from(`${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`).toString('base64')
  : '';

// --- OTLP helpers ---

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}

function toNanos(date: Date): string {
  return (BigInt(date.getTime()) * 1_000_000n).toString();
}

function stringAttr(key: string, value: string): { key: string; value: Record<string, string> } {
  return { key, value: { stringValue: value } };
}

function intAttr(key: string, value: number): { key: string; value: Record<string, string> } {
  return { key, value: { intValue: value.toString() } };
}

// Send OTLP JSON to Langfuse OTel endpoint (real-time)
async function sendOtlpTrace(spans: any[]): Promise<boolean> {
  if (!langfuseEnabled || spans.length === 0) return false;
  try {
    const payload = {
      resourceSpans: [{
        resource: { attributes: [stringAttr('service.name', 'weds-crm')] },
        scopeSpans: [{
          scope: { name: 'langfuse-sdk', version: '5.0.1' },
          spans,
        }],
      }],
    };

    const res = await fetch(`${LANGFUSE_BASE_URL}/api/public/otel/v1/traces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': basicAuth,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn('Langfuse OTLP erreur', { status: res.status, body: text.slice(0, 300) });
      return false;
    }
    return true;
  } catch (err) {
    logger.warn('Langfuse OTLP echouee (best-effort)', { error: (err as Error).message });
    return false;
  }
}

// REST API for scores (not available via OTel)
async function langfuseRest(path: string, body: any): Promise<string | null> {
  if (!langfuseEnabled) return null;
  try {
    const res = await fetch(`${LANGFUSE_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: basicAuth },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    return (json as any).id || 'ok';
  } catch {
    return null;
  }
}

// --- Public types ---

export interface AiCallResult {
  content: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface AiTraceInput {
  name: string;
  leadId: number;
  leadName: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  promptVersion: string;
  langfusePrompt?: any;
}

export interface AiTraceResult {
  langfuseTraceId: string | null;
  latencyMs: number;
  response: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export function computePromptVersion(promptTemplate: string): string {
  return createHash('sha256').update(promptTemplate).digest('hex').slice(0, 8);
}

export async function traceAiCall(
  input: AiTraceInput,
  callFn: () => Promise<AiCallResult>,
): Promise<AiTraceResult> {
  const start = Date.now();
  const result = await callFn();
  const latencyMs = Date.now() - start;

  let langfuseTraceId: string | null = null;

  if (langfuseEnabled) {
    try {
      const traceId = randomHex(16);
      const rootSpanId = randomHex(8);
      const genSpanId = randomHex(8);
      const startNanos = toNanos(new Date(start));
      const endNanos = toNanos(new Date(start + latencyMs));
      langfuseTraceId = traceId;

      // Build Langfuse-specific attributes for the root span (trace)
      const rootAttributes = [
        stringAttr('langfuse.trace.name', input.name),
        stringAttr('langfuse.trace.user.id', String(input.leadId)),
        stringAttr('langfuse.trace.metadata.leadId', String(input.leadId)),
        stringAttr('langfuse.trace.metadata.leadName', input.leadName),
        stringAttr('langfuse.trace.metadata.promptVersion', input.promptVersion),
        stringAttr('langfuse.trace.metadata.model', input.model),
        stringAttr('langfuse.trace.tags', input.name),
        stringAttr('langfuse.observation.type', 'span'),
        stringAttr('langfuse.observation.input', JSON.stringify({
          systemPrompt: input.systemPrompt,
          userMessage: input.userMessage,
        })),
        stringAttr('langfuse.observation.output', JSON.stringify({ content: result.content })),
      ];

      // Build generation span attributes
      const genAttributes = [
        stringAttr('langfuse.observation.type', 'generation'),
        stringAttr('langfuse.observation.name', 'llm-call'),
        stringAttr('langfuse.observation.model.name', input.model),
        stringAttr('langfuse.observation.input', JSON.stringify([
          { role: 'system', content: input.systemPrompt },
          { role: 'user', content: input.userMessage },
        ])),
        stringAttr('langfuse.observation.output', JSON.stringify({ content: result.content })),
      ];

      if (result.usage) {
        genAttributes.push(intAttr('langfuse.observation.usage.input', result.usage.promptTokens));
        genAttributes.push(intAttr('langfuse.observation.usage.output', result.usage.completionTokens));
      }

      const spans = [
        // Root span = Langfuse trace
        {
          traceId,
          spanId: rootSpanId,
          name: input.name,
          kind: 1, // SPAN_KIND_INTERNAL
          startTimeUnixNano: startNanos,
          endTimeUnixNano: endNanos,
          attributes: rootAttributes,
          status: { code: 1 }, // OK
        },
        // Child span = generation
        {
          traceId,
          spanId: genSpanId,
          parentSpanId: rootSpanId,
          name: 'llm-call',
          kind: 1,
          startTimeUnixNano: startNanos,
          endTimeUnixNano: endNanos,
          attributes: genAttributes,
          status: { code: 1 },
        },
      ];

      const ok = await sendOtlpTrace(spans);
      if (ok) {
        logger.info('Langfuse trace OTLP envoyee', { traceId, name: input.name, leadId: input.leadId });
      } else {
        langfuseTraceId = null;
      }
    } catch (err) {
      logger.warn('Langfuse trace echouee (best-effort)', { error: (err as Error).message });
      langfuseTraceId = null;
    }
  }

  return { langfuseTraceId, latencyMs, response: result.content, usage: result.usage };
}

export async function submitScore(
  traceId: string,
  score: number,
  comment?: string,
): Promise<void> {
  await langfuseRest('/api/public/scores', {
    traceId,
    name: 'user-feedback',
    value: score,
    dataType: 'NUMERIC',
    ...(comment ? { comment } : {}),
  });
}
