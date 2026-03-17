import { createHash } from 'crypto';
import { logger } from '../logger.js';

// --- Lazy-loaded Langfuse SDK references ---

let startActiveObservation: any;
let startObservation: any;
let propagateAttributes: any;
let getActiveTraceId: any;
let updateActiveObservation: any;
let langfuseClient: any;
let _spanProcessor: any = null;

const langfuseEnabled = !!(process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY);

let sdkReady: Promise<boolean> | null = null;

function ensureSdkLoaded(): Promise<boolean> {
  if (!langfuseEnabled) return Promise.resolve(false);
  if (sdkReady) return sdkReady;

  sdkReady = (async () => {
    try {
      const tracing = await import('@langfuse/tracing');
      startActiveObservation = tracing.startActiveObservation;
      startObservation = tracing.startObservation;
      propagateAttributes = tracing.propagateAttributes;
      getActiveTraceId = tracing.getActiveTraceId;
      updateActiveObservation = (tracing as any).updateActiveObservation;

      // Get the span processor from the global tracer provider
      const tracerProvider = tracing.getLangfuseTracerProvider?.();
      if (tracerProvider) {
        // Access internal processors to force flush
        _spanProcessor = tracerProvider;
      }

      const client = await import('@langfuse/client');
      langfuseClient = new client.LangfuseClient();
      return true;
    } catch (err) {
      logger.warn('Langfuse SDK import echoue, tracing desactive', { error: err });
      return false;
    }
  })();

  return sdkReady;
}

// --- Public types ---

export interface AiCallResult {
  content: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface AiTraceInput {
  name: string;           // 'whatsapp-agent' | 'email-draft'
  leadId: number;
  leadName: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  promptVersion: string;
  langfusePrompt?: any;   // Langfuse prompt object for trace linking
}

export interface AiTraceResult {
  langfuseTraceId: string | null;
  latencyMs: number;
  response: string;
  usage?: { promptTokens: number; completionTokens: number };
}

// --- Public functions ---

export function computePromptVersion(promptTemplate: string): string {
  return createHash('sha256').update(promptTemplate).digest('hex').slice(0, 8);
}

async function flushTraces(): Promise<void> {
  try {
    // Method 1: flush via LangfuseClient
    if (langfuseClient?.flush) {
      await langfuseClient.flush();
    }
    // Method 2: flush via the tracer provider
    if (_spanProcessor?.forceFlush) {
      await _spanProcessor.forceFlush();
    }
    // Method 3: flush via global OTel API
    const { trace } = await import('@opentelemetry/api');
    const provider = trace.getTracerProvider() as any;
    if (provider?.forceFlush) {
      await provider.forceFlush();
    } else if (provider?.getDelegate?.()?.forceFlush) {
      await provider.getDelegate().forceFlush();
    }
  } catch {
    // Best effort
  }
}

export async function traceAiCall(
  input: AiTraceInput,
  callFn: () => Promise<AiCallResult>,
): Promise<AiTraceResult> {
  const start = Date.now();

  const ready = await ensureSdkLoaded();

  // If Langfuse not available, just call directly
  if (!ready || !startActiveObservation) {
    const result = await callFn();
    return {
      langfuseTraceId: null,
      latencyMs: Date.now() - start,
      response: result.content,
      usage: result.usage,
    };
  }

  let langfuseTraceId: string | null = null;
  let capturedUsage: AiCallResult['usage'] | undefined;

  try {
    const response = await startActiveObservation(input.name, async (span: any) => {
      return await propagateAttributes(
        {
          userId: String(input.leadId),
          metadata: { leadId: String(input.leadId), leadName: input.leadName, promptVersion: input.promptVersion },
          tags: [input.name, `prompt:${input.promptVersion}`],
        },
        async () => {
          const generation = startObservation(
            'llm-call',
            {
              model: input.model,
              input: [
                { role: 'system', content: input.systemPrompt },
                { role: 'user', content: input.userMessage },
              ],
            },
            { asType: 'generation' },
          );

          // Link Langfuse prompt object to the generation (best-effort)
          if (input.langfusePrompt && updateActiveObservation) {
            try {
              updateActiveObservation({ prompt: input.langfusePrompt }, { asType: 'generation' });
            } catch {
              // Best-effort: prompt linking failure never blocks tracing
            }
          }

          const result = await callFn();
          capturedUsage = result.usage;

          // Build generation update with output and optional usage details
          const generationUpdate: Record<string, any> = {
            output: { content: result.content },
          };
          if (result.usage) {
            generationUpdate.usageDetails = {
              input: result.usage.promptTokens,
              output: result.usage.completionTokens,
            };
          }

          generation.update(generationUpdate).end();

          span.update({ output: result.content });

          // Capture trace ID for DB storage
          if (getActiveTraceId) {
            langfuseTraceId = getActiveTraceId();
          }

          return result.content;
        },
      );
    });

    // Flush traces to Langfuse Cloud immediately
    await flushTraces();
    logger.info('Langfuse trace envoyee', { traceId: langfuseTraceId, name: input.name, leadId: input.leadId });

    return {
      langfuseTraceId,
      latencyMs: Date.now() - start,
      response,
      usage: capturedUsage,
    };
  } catch (error) {
    logger.warn('Langfuse tracing echoue, appel direct', { error });
    // Fallback: call without tracing
    const result = await callFn();
    return {
      langfuseTraceId: null,
      latencyMs: Date.now() - start,
      response: result.content,
      usage: result.usage,
    };
  }
}

export async function submitScore(
  traceId: string,
  score: number,
  comment?: string,
): Promise<void> {
  const ready = await ensureSdkLoaded();

  if (!ready || !langfuseClient) {
    logger.warn('Langfuse client non disponible, score ignore');
    return;
  }

  try {
    await langfuseClient.createScore({
      traceId,
      name: 'user-feedback',
      value: score,
      dataType: 'NUMERIC',
      comment: comment || undefined,
    });
    await langfuseClient.flush();
  } catch (error) {
    logger.error('Langfuse score submission echoue', { error });
  }
}
