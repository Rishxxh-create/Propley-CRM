'use client';

import { useEffect, useRef, useState } from 'react';
import { useVoiceAgentStore } from '@/store/voice-agent-store';
import { useVoiceAgent } from '@/context/VoiceAgentProvider';
import { Waveform } from '../waveform/Waveform';
import {
  RiCloseLine,
  RiMicFill,
  RiMicOffFill,
  RiSendPlane2Fill,
  RiCheckLine,
  RiArrowRightSLine,
} from 'react-icons/ri';
import { cn } from '@/lib/utils';
import { DEVELOPMENTS, getAdvisorName } from '@/lib/mock-data';
import { readCustomers } from '@/lib/customers-store';
import { buildPreviewForCommand } from '@/services/ai-engine/voice-agent-flow';
import { getCustomersByIds } from '@/lib/client-voice-lookup';
import { VoiceChatMarkdown } from '@/lib/voice-chat-markdown';

export function VoiceAgentSidebar() {
  const {
    state: agentState,
    isListening,
    transcript,
    interimTranscript,
    chatHistory,
    slotFilling,
    recentSuggestions,
    suggestionsHidden,
    settings,
    pendingClientLookup,
    agentSpeech,
    commandDraft,
    isReviewingCommand,
    updateSettings,
    setCommandDraft,
    clearChatHistory,
    setPanelOpen,
    setSuggestionsHidden,
  } = useVoiceAgentStore();

  const { toggleListening, triggerCommandString, pickClientCandidate } = useVoiceAgent();

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, interimTranscript]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = commandDraft.trim();
    if (!query) return;
    setCommandDraft('');
    useVoiceAgentStore.getState().addChatMessage('user', query);
    await triggerCommandString(query);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    useVoiceAgentStore.getState().addChatMessage('user', suggestion);
    await triggerCommandString(suggestion);
  };

  const getDynamicSuggestions = (): string[] => {
    if (slotFilling?.phase === 'preview') {
      return ['Confirmed', 'Cancel'];
    }

    if (slotFilling?.phase === 'collecting') {
      const currentSlot = slotFilling.missingFields[slotFilling.currentFieldIndex];
      if (!currentSlot) return [];

      if (currentSlot.name === 'client' || currentSlot.name === 'name') {
        try {
          return readCustomers().slice(0, 3).map((c) => c.name);
        } catch {
          return ['Rahul Burma', 'Rahul Verma', 'Priya Menon'];
        }
      }
      if (currentSlot.name === 'email') {
        return ['rahul@gmail.com', 'priya.menon@outlook.com', 'ananya@client.propley.in'];
      }
      if (currentSlot.name === 'phone') {
        return ['9876543210', 'nine eight seven six five four three two one zero'];
      }
      if (currentSlot.name === 'city') {
        return ['Mumbai', 'Bengaluru', 'Pune'];
      }
      if (currentSlot.name === 'project') {
        return DEVELOPMENTS.slice(0, 3).map((d) => d.name);
      }
      if (currentSlot.name === 'date') {
        return ['Today', 'Tomorrow', 'Next Monday'];
      }
      if (currentSlot.name === 'time') {
        return ['10:00 AM', '2:30 PM', '4:00 PM'];
      }
      return [];
    }

    if (!suggestionsHidden) {
      return recentSuggestions.slice(0, 5);
    }

    return [];
  };

  const suggestions = getDynamicSuggestions();
  const showSuggestions = suggestions.length > 0 && !pendingClientLookup;
  const isPreview = slotFilling?.phase === 'preview';
  const previewText =
    isPreview && slotFilling
      ? buildPreviewForCommand(slotFilling.commandId, slotFilling.filledArgs)
      : null;

  const clientPickCandidates = pendingClientLookup
    ? getCustomersByIds(pendingClientLookup.candidateIds)
    : [];

  return (
    <div className="pointer-events-auto relative flex h-full flex-col bg-white font-sans text-ink">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-stone-alt bg-stone px-6">
        <div className="flex items-center gap-2">
          <div className="h-[6px] w-[6px] bg-gold" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
            PROpley Voice Engine
          </span>
          {agentState !== 'idle' && (
            <span
              className={cn(
                'rounded-lg px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider',
                agentState === 'listening' && 'animate-pulse border border-gold/20 bg-gold/10 text-gold',
                agentState === 'processing' && 'bg-zinc-100 text-zinc-600',
                agentState === 'executing' && 'bg-ink text-white'
              )}
            >
              {agentState}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center text-zinc-500 transition-colors hover:bg-stone-alt/50 hover:text-ink"
            title="Minimize Panel"
          >
            <RiCloseLine size={18} />
          </button>
        </div>
      </div>



      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
        {chatHistory.filter((m) => m.sender !== 'system').map((message) => {
          const isSpeaking =
            message.sender === 'agent' && agentSpeech?.messageId === message.id;
          const speechStatus =
            isSpeaking && agentSpeech?.status === 'loading' ? 'Preparing voice…' : 'Speaking';

          return (
            <div
              key={message.id}
              className={cn(
                'flex max-w-[85%] flex-col rounded-lg border p-4 text-xs leading-relaxed transition-colors',
                message.sender === 'user' && 'self-end border-ink bg-ink text-white',
                message.sender === 'agent' &&
                cn(
                  'self-start bg-stone text-ink',
                  isSpeaking
                    ? 'border-gold bg-gold/5 shadow-[inset_3px_0_0_0] shadow-gold'
                    : 'border-stone-alt'
                ),
                message.sender === 'system' &&
                'self-center border-zinc-100 bg-zinc-50 px-3 py-2 text-[10px] tracking-wide text-zinc-400'
              )}
            >
              {message.sender === 'system' && (
                <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-widest text-zinc-400">
                  Execution Log
                </span>
              )}
              {message.sender === 'agent' ? (
                <>
                  {isSpeaking && (
                    <span className="mb-2 inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-gold">
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
                      {speechStatus}
                    </span>
                  )}
                  <VoiceChatMarkdown text={message.text} />
                </>
              ) : (
                <p className="whitespace-pre-wrap">{message.text}</p>
              )}
            </div>
          );
        })}

        {clientPickCandidates.length > 1 && (
          <div className="flex w-full flex-col gap-2.5 self-stretch border border-gold/25 bg-gold/5 p-3">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-gold">
              Tap to select a client
            </p>
            {clientPickCandidates.map((customer, index) => {
              const advisor = getAdvisorName(customer.assignedAdvisorId);
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => pickClientCandidate(customer.id)}
                  className={cn(
                    'group flex w-full cursor-pointer items-center gap-3 border border-stone-alt bg-white px-3 py-3 text-left shadow-sm',
                    'transition-all duration-200 hover:border-ink hover:bg-ink hover:shadow-md',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
                    'active:scale-[0.99]'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center border text-sm font-semibold tabular-nums',
                      'border-stone-alt bg-stone text-gold',
                      'group-hover:border-gold/50 group-hover:bg-gold/15 group-hover:text-ivory'
                    )}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="block truncate text-xs font-semibold text-ink group-hover:text-ivory">
                      {customer.name}
                    </span>
                    <span className="block truncate text-[10px] font-medium text-zinc-500 group-hover:text-ivory/80">
                      {customer.city} · {customer.email}
                    </span>
                    <span className="block text-[10px] text-zinc-400 group-hover:text-ivory/70">
                      Advisor: {advisor}
                    </span>
                  </div>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-400 group-hover:text-gold-light">
                      Select
                    </span>
                    <RiArrowRightSLine
                      size={18}
                      className="text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-light"
                      aria-hidden
                    />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {isPreview && previewText && (
          <div className="shrink-0 rounded-lg border border-gold/30 bg-gold/5 p-4">
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-gold">
              Awaiting confirmation
            </p>
            <VoiceChatMarkdown text={previewText} className="text-ink" />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => handleSuggestionClick('confirmed')}
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 border border-ink bg-ink py-2 text-[10px] font-semibold text-white transition-colors hover:bg-gold"
              >
                <RiCheckLine size={14} />
                Confirm
              </button>
              <button
                type="button"
                onClick={() => handleSuggestionClick('cancel')}
                className="inline-flex flex-1 cursor-pointer items-center justify-center border border-stone-alt bg-white py-2 text-[10px] font-semibold text-zinc-600 transition-colors hover:border-zinc-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {showSuggestions && (
        <div className="flex shrink-0 flex-col gap-1.5 border-t border-stone-alt bg-stone/20 px-6 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-400">
              {slotFilling ? (isPreview ? 'Confirm or cancel' : 'Suggested inputs') : 'Try saying'}
            </span>
            {!slotFilling && (
              <button
                type="button"
                onClick={() => setSuggestionsHidden(true)}
                className="flex h-6 w-6 cursor-pointer items-center justify-center text-zinc-400 transition-colors hover:bg-stone-alt/60 hover:text-ink"
                aria-label="Hide try saying suggestions"
                title="Hide suggestions"
              >
                <RiCloseLine size={14} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="cursor-pointer rounded-lg border border-stone-alt bg-white px-3 py-1.5 text-left text-[10px] font-medium text-zinc-600 transition-colors duration-200 hover:border-gold hover:text-gold"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex shrink-0 flex-col gap-4 border-t border-stone-alt bg-stone p-6">
        {(isListening || isReviewingCommand) && (
          <div className="flex items-center justify-between border border-stone-alt bg-white px-4 py-2">
            <span
              className={cn(
                'text-[10px] font-medium uppercase tracking-wider',
                isReviewingCommand ? 'text-ink' : 'animate-pulse text-gold'
              )}
            >
              {isReviewingCommand ? 'Running command…' : 'Listening — text appears below'}
            </span>
            {isListening && <Waveform barCount={15} />}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleListening}
            className={cn(
              'flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border shadow-md transition-all duration-300',
              isListening
                ? 'animate-pulse border-gold bg-gold text-white'
                : 'border-stone-alt bg-white text-zinc-500 hover:border-zinc-400 hover:text-ink'
            )}
            title={isListening ? 'Stop Listening' : 'Start Voice Input (Shift+Space)'}
          >
            {isListening ? <RiMicOffFill size={20} /> : <RiMicFill size={20} />}
          </button>

          <div className="relative flex flex-1 items-center">
            <input
              type="text"
              placeholder={
                isListening
                  ? 'Speak your command…'
                  : isReviewingCommand
                    ? 'Executing shortly…'
                    : isPreview
                      ? 'Say confirmed or cancel…'
                      : slotFilling
                        ? 'Answer the question…'
                        : 'Type or speak a command…'
              }
              value={commandDraft}
              onChange={(e) => setCommandDraft(e.target.value)}
              readOnly={isListening || isReviewingCommand}
              className={cn(
                'h-12 w-full select-text rounded-lg border bg-white px-4 pr-10 text-xs shadow-sm transition-colors placeholder:text-zinc-400 focus:border-gold focus:outline-none',
                isListening || isReviewingCommand
                  ? 'border-gold/40 bg-stone/30 text-ink'
                  : 'border-stone-alt'
              )}
            />
            <button
              type="submit"
              disabled={!commandDraft.trim() || isListening || isReviewingCommand}
              className="absolute right-3 cursor-pointer text-zinc-400 transition-colors hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
            >
              <RiSendPlane2Fill size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
