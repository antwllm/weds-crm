// Langfuse tracing now uses REST API directly (src/services/langfuse.ts)
// No OTel SDK needed — keeping this file for the export used by other modules

export const langfuseSpanProcessor = null;

const langfuseEnabled = !!(process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY);
if (langfuseEnabled) {
  console.log('Langfuse tracing active (REST API)');
} else {
  console.warn('Langfuse: LANGFUSE_SECRET_KEY ou LANGFUSE_PUBLIC_KEY manquant, tracing desactive');
}
