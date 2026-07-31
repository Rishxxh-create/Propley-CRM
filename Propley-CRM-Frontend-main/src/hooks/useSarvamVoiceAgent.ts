/**
 * @deprecated — Use useVoiceAgent() from context/VoiceAgentProvider instead.
 * This file is kept as a safe passthrough so any stale HMR bundles
 * don't create a second competing STT instance.
 */
import { useVoiceAgent } from '@/context/VoiceAgentProvider';

export function useSarvamVoiceAgent() {
  // Delegate entirely to the shared context — no new STT instance created.
  return useVoiceAgent();
}
