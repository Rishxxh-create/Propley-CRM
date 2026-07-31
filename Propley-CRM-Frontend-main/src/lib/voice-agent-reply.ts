'use client';

import { useVoiceAgentStore } from '@/store/voice-agent-store';

export function postAgentReply(text: string): string {
  return useVoiceAgentStore.getState().addChatMessage('agent', text);
}
