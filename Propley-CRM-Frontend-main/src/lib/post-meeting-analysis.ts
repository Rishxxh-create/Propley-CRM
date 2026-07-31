export interface SlideHeatmap {
  slideId: string;
  title: string;
  viewTimeSeconds: number;
  clickCount: number;
  scrollDepth: number;
  rageClicks: number;
  engagementScore: number;
}

export interface RecordingAsset {
  id: string;
  type: 'video' | 'audio';
  label: string;
  duration: string;
  size: string;
  uploadedAt: string;
}

export interface SocialProfileInsight {
  platform: string;
  handle: string;
  followers: string;
  relevance: string;
  enabled: boolean;
}

export interface PostMeetingAnalysis {
  meetingId: string;
  property: string;
  clientName: string;
  salesMember: string;
  sessionDate: string;
  transcriptStatus: 'ready' | 'processing';
  transcript: string;
  aiNotes: string;
  mergeVariables: Record<string, string>;
  recordings: RecordingAsset[];
  slideHeatmaps: SlideHeatmap[];
  socialProfiling: SocialProfileInsight[];
}

const SLIDE_TITLES = [
  'Welcome & estate overview',
  'Grand lobby & arrival',
  'Living pavilion',
  'Master suite',
  'Terrace & infinity pool',
  'Smart kitchen',
  'Investment summary',
];

function hashSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getPostMeetingAnalysis(
  meetingId: string,
  overrides?: Partial<Pick<PostMeetingAnalysis, 'property' | 'clientName' | 'salesMember' | 'sessionDate'>>
): PostMeetingAnalysis {
  const seed = hashSeed(meetingId);

  const slideHeatmaps: SlideHeatmap[] = SLIDE_TITLES.map((title, index) => {
    const base = ((seed + index * 17) % 50) + 30;
    return {
      slideId: `slide-${String(index + 1).padStart(2, '0')}`,
      title,
      viewTimeSeconds: base + index * 12,
      clickCount: ((seed + index) % 24) + 4,
      scrollDepth: Math.min(98, 55 + ((seed + index * 7) % 40)),
      rageClicks: index === 3 ? 2 : (seed + index) % 3,
      engagementScore: Math.min(99, 62 + ((seed + index * 11) % 35)),
    };
  }).sort((a, b) => b.engagementScore - a.engagementScore);

  const property = overrides?.property ?? '—';
  const clientName = overrides?.clientName ?? '—';

  return {
    meetingId,
    property,
    clientName,
    salesMember: overrides?.salesMember ?? 'Priya Sharma',
    sessionDate: overrides?.sessionDate ?? 'May 20, 2026 · 10:00 AM',
    transcriptStatus: 'ready',
    transcript: `Sales Member: Good morning ${clientName}, welcome to the immersive walkthrough of ${property}.

Client: Thank you — the lobby rendering feels very premium.

Sales Member: I'll guide you through the master suite next; that's where most clients spend the longest session time.

Client: The terrace views are important for us — can we compare unit typologies?

Sales Member: Absolutely. I'll open the investment summary slide and we can model ROI with your preferred variables.`,
    aiNotes: `## Executive summary
- Client showed strongest engagement on **Master suite** and **Terrace & infinity pool** slides.
- Recommended follow-up within 48 hours with terrace-facing unit availability.

## Variables captured
- {client_name}: ${clientName}
- {project_name}: ${property}
- {primary_interest}: Terrace views & master suite finishes
- {budget_signal}: Upper luxury tier
- {next_step}: Send typology comparison + schedule second session

## Social profiling (optional)
LinkedIn profile matched with 94% confidence. Professional network suggests architecture & design affinity.`,
    mergeVariables: {
      client_name: clientName,
      project_name: property,
      primary_interest: 'Terrace views & master suite',
      budget_signal: 'Upper luxury tier',
      next_step: 'Typology comparison deck',
      meeting_duration: '42m 18s',
    },
    recordings: [
      {
        id: 'rec-video',
        type: 'video',
        label: 'Full presentation capture',
        duration: '42:18',
        size: '1.2 GB',
        uploadedAt: 'Synced 12 min after session',
      },
      {
        id: 'rec-audio',
        type: 'audio',
        label: 'Call audio (Sales Engine)',
        duration: '42:18',
        size: '86 MB',
        uploadedAt: 'Synced 12 min after session',
      },
    ],
    slideHeatmaps,
    socialProfiling: [
      {
        platform: 'LinkedIn',
        handle: '@sarahjenkins',
        followers: '2.4K',
        relevance: 'Architecture & luxury lifestyle',
        enabled: true,
      },
      {
        platform: 'Instagram',
        handle: '@sjenkins.estates',
        followers: '890',
        relevance: 'Interior design, travel',
        enabled: true,
      },
    ],
  };
}
