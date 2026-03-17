import { logger } from '../logger.js';

// --- Lazy-loaded Langfuse SDK ---

let langfuseClient: any = null;
let sdkReady: Promise<boolean> | null = null;

const langfuseEnabled = !!(process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY);

function ensureClientLoaded(): Promise<boolean> {
  if (!langfuseEnabled) return Promise.resolve(false);
  if (sdkReady) return sdkReady;

  sdkReady = (async () => {
    try {
      const client = await import('@langfuse/client');
      langfuseClient = new client.LangfuseClient();
      return true;
    } catch (err) {
      logger.warn('Langfuse client import echoue, prompt sync desactive', { error: err });
      return false;
    }
  })();

  return sdkReady;
}

// --- Prompt cache (60s TTL) ---

let cachedPrompt: { name: string; obj: any; expiresAt: number } | null = null;

// --- Public functions ---

/**
 * Push a prompt to Langfuse Prompt Management.
 * Creates a new version with the "production" label.
 * Best-effort: returns null on failure, never throws.
 */
export async function pushPromptToLangfuse(
  promptTemplate: string,
  promptName: string,
): Promise<{ version: number } | null> {
  const ready = await ensureClientLoaded();
  if (!ready || !langfuseClient) return null;

  try {
    const result = await langfuseClient.prompt.create({
      name: promptName,
      type: 'text',
      prompt: promptTemplate,
      labels: ['production'],
    });

    logger.info('Langfuse prompt pousse avec succes', {
      promptName,
      version: result?.version,
    });

    // Invalidate cache
    if (cachedPrompt?.name === promptName) {
      cachedPrompt = null;
    }

    return { version: result?.version ?? 0 };
  } catch (error) {
    logger.warn('Langfuse push prompt echoue', { promptName, error });
    return null;
  }
}

/**
 * Get the Langfuse prompt object for trace linking.
 * Cached for 60 seconds to avoid repeated API calls during burst processing.
 * Returns null if Langfuse not configured or prompt not found.
 */
export async function getLangfusePrompt(promptName: string): Promise<any | null> {
  const ready = await ensureClientLoaded();
  if (!ready || !langfuseClient) return null;

  // Check cache
  if (cachedPrompt && cachedPrompt.name === promptName && Date.now() < cachedPrompt.expiresAt) {
    return cachedPrompt.obj;
  }

  try {
    const prompt = await langfuseClient.prompt.get(promptName);

    // Cache for 60 seconds
    cachedPrompt = {
      name: promptName,
      obj: prompt,
      expiresAt: Date.now() + 60_000,
    };

    return prompt;
  } catch (error) {
    logger.warn('Langfuse get prompt echoue', { promptName, error });
    return null;
  }
}

/**
 * Pull the production-labeled prompt text from Langfuse.
 * Used by the webhook handler to sync prompt changes back to CRM.
 * Returns null if not available.
 */
export async function pullPromptFromLangfuse(
  promptName: string,
): Promise<{ prompt: string; version: number } | null> {
  const ready = await ensureClientLoaded();
  if (!ready || !langfuseClient) return null;

  try {
    const result = await langfuseClient.prompt.get(promptName);

    if (!result?.prompt) {
      logger.warn('Langfuse pull prompt: contenu vide', { promptName });
      return null;
    }

    // Invalidate cache since we just fetched fresh data
    cachedPrompt = {
      name: promptName,
      obj: result,
      expiresAt: Date.now() + 60_000,
    };

    return {
      prompt: result.prompt,
      version: result.version ?? 0,
    };
  } catch (error) {
    logger.warn('Langfuse pull prompt echoue', { promptName, error });
    return null;
  }
}
