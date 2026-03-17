// Must be imported before any traced code runs (right after Sentry in index.ts)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';

const langfuseEnabled = !!(process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY);

let sdk: NodeSDK | null = null;

if (langfuseEnabled) {
  sdk = new NodeSDK({
    spanProcessors: [new LangfuseSpanProcessor()],
  });
  sdk.start();
  console.log('Langfuse instrumentation demarree');
} else {
  console.warn('Langfuse: LANGFUSE_SECRET_KEY ou LANGFUSE_PUBLIC_KEY manquant, tracing desactive');
}

process.on('SIGTERM', () => {
  if (sdk) sdk.shutdown();
});
