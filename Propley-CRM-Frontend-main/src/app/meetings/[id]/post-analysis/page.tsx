'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getPostMeetingAnalysis } from '@/lib/post-meeting-analysis';
import { fetchMeetingMetadata, patchMeetingTranscript } from '@/lib/api/meetings';
import type { ApiMeetingMetadata } from '@/lib/api/types/meetings';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RiArrowLeftLine,
  RiDownload2Line,
  RiFileTextLine,
  RiLinkedinBoxLine,
  RiMicLine,
  RiSparklingLine,
  RiSearchLine,
  RiArrowRightSLine,
  RiStickyNoteLine,
} from 'react-icons/ri';
import { BrandLogo } from '@/components/BrandLogo';
import { brandLogoForPlatform } from '@/lib/brand-logos';
import { MeetingNotesTab } from './_components/MeetingNotesTab';
import { MeetingActivityLog } from './_components/MeetingActivityLog';
import { PresentationContextFields } from './_components/PresentationContextFields';
import {
  getPresentationContext,
  hasPresentationContextContent,
} from './_components/presentation-context';
import { exportPresentationSummary } from '@/lib/export-presentation-pdf';
import { getDevelopmentByName } from '@/lib/mock-data';
import { toast } from '@/lib/toast';
import { PAGE } from '@/lib/copy';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchMeetingThunk } from '@/store/slices/meetingsThunks';
import { selectCurrentMeeting, selectCurrentMeetingStatus } from '@/store/selectors/meetingsSelectors';
import { useLoadMeetingActivity } from '@/store/hooks/useMeetings';
export default function PostMeetingAnalysisPage() {
  const params = useParams();
  const meetingId = (params?.id as string) ?? 'session';
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript' | 'notes'>('overview');
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [isUpdatingTranscript, setIsUpdatingTranscript] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState<'all' | 'advisor' | 'client'>('all');

  const dispatch = useAppDispatch();
  const meeting = useAppSelector(selectCurrentMeeting);
  const meetingStatus = useAppSelector(selectCurrentMeetingStatus);

  useLoadMeetingActivity(meetingId);

  useEffect(() => {
    void dispatch(fetchMeetingThunk(meetingId));
  }, [dispatch, meetingId]);

  const presentationContext = useMemo(
    () => getPresentationContext(meeting, meetingStatus),
    [meeting, meetingStatus],
  );

  const showPresentationContext = hasPresentationContextContent(presentationContext);

  const [metadata, setMetadata] = useState<ApiMeetingMetadata | null>(null);

  const loadMetadata = async () => {
    try {
      const data = await fetchMeetingMetadata(meetingId);
      if (data) setMetadata(data);
    } catch (e) {
      console.error('Failed to fetch meeting metadata', e);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, [meetingId]);

  const handleUpdateTranscript = async () => {
    if (!transcriptDraft.trim() || isUpdatingTranscript) return;
    setIsUpdatingTranscript(true);
    try {
      await patchMeetingTranscript(meetingId, { transcript: transcriptDraft });
      toast.success('Transcript updated successfully');
      setIsTranscriptModalOpen(false);
      await loadMetadata();
    } catch (error) {
      toast.error('Failed to update transcript');
    } finally {
      setIsUpdatingTranscript(false);
    }
  };

  const analysis = useMemo(() => {
    const isClientEmpty = !meeting?.client || meeting?.client === '—' || meeting?.client.includes('participant');
    const baseClientName = isClientEmpty ? (metadata?.client_name || '—') : meeting?.client;
    const clientName = metadata?.meeting_for || baseClientName;
    const property = meeting?.property || '—';
    const salesMember = metadata?.salesMember || metadata?.moderator_name || meeting?.salesMember || 'Advisor';

    let aiNotes = '## Executive summary\nNo AI synthesis available for this session yet.';
    if (metadata?.analytics) {
      const formattedDate = metadata.analytics.synthesized_at
        ? format(new Date(metadata.analytics.synthesized_at), "dd/MM/yyyy, HH:mm:ss")
        : 'N/A';

      aiNotes = `## Executive summary
- Synthesis completed at **${formattedDate}**.
- Total interactions: **${metadata.analytics.total_interactions ?? 0}**
- Unique clients joined: **${metadata.analytics.unique_clients ?? 0}**
- Content engagement score: **${metadata.analytics.content_engagement ?? 0}%**

## Session Transcript
${metadata.transcript || 'No transcript available.'}`;
    }

    return {
      transcript: metadata?.transcript || '',
      aiNotes,
      clientName: clientName || '—',
      salesMember,
      socialProfiling: [] as any[],
      slideHeatmaps: [] as any[],
      mergeVariables: {
        client_name: clientName || '—',
        meeting_duration: metadata?.duration ? `${Math.floor(metadata.duration / 60)}m ${metadata.duration % 60}s` : 'Unknown',
        client_count: metadata?.client_count || String(metadata?.analytics?.unique_clients || '1'),
        total_interactions: String(metadata?.analytics?.total_interactions || '0')
      }
    };
  }, [meeting, metadata]);

  const tabs = [
    { id: 'overview', label: 'AI Notes & Summary', shortLabel: 'AI Notes', icon: RiSparklingLine },
    { id: 'transcript', label: 'Call Transcript', shortLabel: 'Transcript', icon: RiMicLine },
    { id: 'notes', label: 'Session Notes', shortLabel: 'Notes', icon: RiStickyNoteLine },
  ] as const;

  // Split transcript text into structured speaker/speech dialogue nodes
  const transcriptLines = useMemo(() => {
    if (!analysis.transcript) return [];
    return analysis.transcript.split('\n\n').map((line, idx) => {
      const parts = line.split(': ');
      if (parts.length === 1) {
        return { id: idx, speaker: 'System', text: line };
      }
      const speaker = parts[0] || 'Advisor';
      const text = parts.slice(1).join(': ') || '';
      return { id: idx, speaker, text };
    });
  }, [analysis.transcript]);

  // Filter dialogue nodes dynamically based on active search phrase and speaker toggle
  const filteredTranscriptLines = useMemo(() => {
    return transcriptLines.filter((line) => {
      const matchesSearch =
        line.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
        line.speaker.toLowerCase().includes(transcriptSearch.toLowerCase());

      const isClient = line.speaker.toLowerCase() === 'client';
      const matchesSpeaker =
        speakerFilter === 'all' ||
        (speakerFilter === 'advisor' && !isClient) ||
        (speakerFilter === 'client' && isClient);

      return matchesSearch && matchesSpeaker;
    });
  }, [transcriptLines, transcriptSearch, speakerFilter]);

  const cardPadding = 'p-4 sm:p-6 lg:p-8';

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex min-w-0 w-full flex-col gap-6 sm:gap-8 lg:flex-row lg:items-start px-4 sm:px-8 py-8 max-w-7xl mx-auto"
      >

        {/* NESTED SUB-SIDEBAR FOR INTEL NAVIGATION */}
        <aside className="hidden lg:block w-72 shrink-0 bg-white border border-stone-alt p-6 space-y-6 self-start lg:sticky lg:top-6 z-10 rounded-xl">
          <Link
            href="/meetings"
            className="group flex items-center gap-3 px-4 py-3 border border-stone-alt bg-stone/20 hover:bg-stone/50 text-xs font-semibold text-ink transition-all rounded-md"
          >
            <RiArrowLeftLine className="text-gold transition-transform group-hover:-translate-x-0.5" />
            Back to presentations
          </Link>

          <div className="h-[1px] bg-stone-alt" />

          {/* DYNAMIC TABS LIST */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-400 uppercase px-2 mb-2 label-premium">
              Intelligence Menu
            </p>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full text-left px-3 py-3 text-xs font-semibold transition-all flex items-center justify-between border-l-2 cursor-pointer',
                    isActive
                      ? 'border-gold bg-stone/50 text-ink'
                      : 'border-transparent text-zinc-500 hover:text-ink hover:bg-stone/20'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={isActive ? 'text-gold' : 'text-zinc-400'} size={16} />
                    <span>{tab.label}</span>
                  </div>
                  <RiArrowRightSLine
                    className={cn(
                      'text-zinc-400 transition-transform',
                      isActive && 'translate-x-0.5 text-gold'
                    )}
                    size={14}
                  />
                </button>
              );
            })}
          </div>

          <div className="h-[1px] bg-stone-alt" />

          {showPresentationContext && (
            <div className="space-y-4 pt-1">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-400 uppercase label-premium">
                Presentation Context
              </p>
              <PresentationContextFields context={presentationContext} variant="sidebar" />
            </div>
          )}
        </aside>

        {/* MOBILE NAVIGATION */}
        <div className="w-full min-w-0 space-y-4 lg:hidden">
          <Link
            href="/meetings"
            className="group inline-flex w-full items-center justify-center gap-3 border border-stone-alt bg-white px-4 py-3 text-xs font-semibold text-ink transition-all rounded-none sm:w-auto sm:justify-start"
          >
            <RiArrowLeftLine className="text-gold transition-transform group-hover:-translate-x-0.5" />
            Back to presentations
          </Link>

          {showPresentationContext && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="grid grid-cols-2 gap-3 border border-stone-alt bg-white p-4 sm:grid-cols-4"
            >
              <PresentationContextFields context={presentationContext} variant="mobile" />
            </motion.div>
          )}

          <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 scrollbar-none md:-mx-10 md:px-10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap rounded-none border transition-all shrink-0 cursor-pointer',
                    isActive
                      ? 'bg-ink border-ink text-white'
                      : 'border-stone-alt bg-white text-zinc-500 hover:border-gold hover:text-ink'
                  )}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-zinc-400'} />
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE INTEL DETAIL SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="min-w-0 flex-1 w-full space-y-6 sm:space-y-8"
        >

          {/* HEADER SECTION WITH KEY ACTIONS */}
          <div className="border-b border-stone-alt pb-5 sm:pb-6">
            <div className="flex flex-col gap-4 sm:gap-5 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0 space-y-2">
                <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                  Post-meeting analysis<span className="text-gold">.</span>
                </h1>
              </div>
            </div>
            <div className="mt-4 h-[2px] w-16 bg-gold" />
          </div>

          {/* TAB CONTENTS WITH STAGGER TRANSITIONS */}
          <AnimatePresence mode="wait">

            {/* OVERVIEW & AI SUMMARY */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="space-y-6"
              >
                <Card className="rounded-xl border-stone-alt pt-0! bg-white shadow-none!">
                  <CardContent className={cn('space-y-6', cardPadding)}>
                    <div className="flex items-center gap-2 border-b border-stone-alt pb-4">
                      <RiSparklingLine className="text-gold" size={18} />
                      <h2 className="text-sm font-semibold text-ink">AI Meeting Notes & Synthesis</h2>
                    </div>
                    <div
                      className="prose prose-sm max-w-none text-xs leading-relaxed text-zinc-600 [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-ink [&_li]:my-2 [&_strong]:text-ink [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-4"
                      dangerouslySetInnerHTML={{
                        __html: analysis.aiNotes
                          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                          .replace(/^- (.+)$/gm, '<li>$1</li>')
                          .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n\n/g, '<br /><br />'),
                      }}
                    />
                  </CardContent>
                </Card>


                <MeetingActivityLog meetingUuid={meetingId} />

                {/* EXTRACTED VARIABLES */}
                <Card className="rounded-xl border-stone-alt pt-0! bg-white shadow-none!">
                  <CardContent className={cn('space-y-6', cardPadding)}>
                    <div className="flex items-center gap-2 border-b border-stone-alt pb-4">
                      <RiFileTextLine className="text-gold" size={18} />
                      <h2 className="text-sm font-semibold text-ink">Extracted Variables & Context</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(analysis.mergeVariables).map(([key, value]) => (
                        <div
                          key={key}
                          className="border border-stone-alt p-4 bg-stone/20 flex flex-col justify-between rounded-lg"
                        >
                          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider label-premium">
                            {key.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-semibold text-ink mt-2">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* CALL TRANSCRIPT (CHAT UX) */}
            {activeTab === 'transcript' && (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="space-y-6"
              >
                <Card className="rounded-xl border-stone-alt pt-0! bg-white shadow-none!">
                  <CardContent className={cn('space-y-6', cardPadding)}>
                    <div className="flex flex-col gap-4 border-b border-stone-alt pb-4 sm:flex-row sm:items-start sm:justify-between md:items-center">
                      <div className="flex min-w-0 items-center gap-2">
                        <RiMicLine className="shrink-0 text-gold" size={18} />
                        <h2 className="text-sm font-semibold text-ink">Call Transcript</h2>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTranscriptDraft(metadata?.transcript || '');
                          setIsTranscriptModalOpen(true);
                        }}
                        className="h-9 rounded-md border-stone-alt px-4 text-xs font-semibold"
                      >
                        Update Transcript
                      </Button>
                    </div>

                    <div className="space-y-4 max-h-[min(500px,60vh)] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                      {metadata?.transcript || 'No transcript available.'}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* SESSION NOTES */}
            {activeTab === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="space-y-6"
              >
                <MeetingNotesTab meetingUuid={meetingId} cardPadding={cardPadding} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <Dialog
        open={isTranscriptModalOpen}
        onOpenChange={(open) => {
          if (!open && !isUpdatingTranscript) setIsTranscriptModalOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-[500px] p-6 gap-6 rounded-xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">Update Transcript</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Make corrections or paste a new transcript for this session.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={transcriptDraft}
              onChange={(e) => setTranscriptDraft(e.target.value)}
              placeholder="Paste updated transcript here..."
              className="min-h-[250px] resize-y border border-stone-alt bg-white px-4 py-3 text-xs text-ink placeholder:font-normal placeholder:text-zinc-400 focus-visible:border-gold rounded-md"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsTranscriptModalOpen(false)}
              disabled={isUpdatingTranscript}
              className="rounded-md border-stone-alt text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              variant="propley"
              className="gap-2 rounded-md text-xs font-semibold"
              onClick={handleUpdateTranscript}
              disabled={isUpdatingTranscript || !transcriptDraft.trim()}
            >
              {isUpdatingTranscript ? 'Saving...' : 'Save Transcript'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
