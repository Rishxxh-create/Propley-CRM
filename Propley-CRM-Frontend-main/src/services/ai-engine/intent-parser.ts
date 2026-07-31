import type { CommandExecution, CommandArgs } from '@/types/voice-agent';
import type { MeetingStatus } from '@/lib/mock-data';
import { extractClientTargetFromUtterance } from '@/lib/client-voice-lookup';
import { stripVoiceFillers } from '@/lib/voice-text';

// Conjunctions to split commands
const SPLIT_REGEXP = /\b(?:then|and\s+then|next|after\s+that)\b/i;

// Verb indicators that "and" might be splitting two distinct commands
const AND_COMMAND_INDICATORS = [
  'open', 'show', 'navigate', 'go', 'filter', 'search', 'find', 'mute', 
  'unmute', 'toggle', 'change', 'schedule', 'reschedule', 'launch', 'start'
];

/**
 * Splits a text input into individual command phrases.
 * E.g., "open presentations and filter completed then open calendar"
 * -> ["open presentations and filter completed", "open calendar"]
 * -> then parses further if needed.
 */
export function splitQueries(text: string): string[] {
  // First split by explicit high-priority splitters
  const parts = text.split(SPLIT_REGEXP).map(p => p.trim()).filter(Boolean);
  const finalParts: string[] = [];

  for (const part of parts) {
    // If the part contains "and", check if it separates two distinct command actions
    if (/\band\b/i.test(part)) {
      const subParts = part.split(/\band\b/i).map(s => s.trim()).filter(Boolean);
      let accumulated = '';
      
      for (let i = 0; i < subParts.length; i++) {
        const sub = subParts[i];
        const firstWord = sub.split(/\s+/)[0].toLowerCase();
        
        if (i > 0 && AND_COMMAND_INDICATORS.includes(firstWord)) {
          // It's a new command! Push previous accumulated and start new
          if (accumulated) finalParts.push(accumulated.trim());
          accumulated = sub;
        } else {
          accumulated = accumulated ? `${accumulated} and ${sub}` : sub;
        }
      }
      if (accumulated) finalParts.push(accumulated.trim());
    } else {
      finalParts.push(part);
    }
  }

  return finalParts.map(p => p.trim()).filter(Boolean);
}

interface ParsedCommand {
  commandId: string;
  label: string;
  args: CommandArgs;
}

const MEETING_STATUS_WORDS =
  /\b(?:completed|live|scheduled|upcoming|canceled|cancelled)\b/;

export { stripVoiceFillers } from '@/lib/voice-text';

/** Map spoken status words to registry MeetingStatus. */
export function extractMeetingStatusFromTranscript(norm: string): MeetingStatus | undefined {
  const n = stripVoiceFillers(norm).toLowerCase();
  if (/\bcompleted\b/.test(n)) return 'Completed';
  if (/\b(?:scheduled|upcoming)\b/.test(n)) return 'Scheduled';
  if (/\blive\b/.test(n)) return 'Live';
  if (/\b(?:canceled|cancelled)\b/.test(n)) return 'Canceled';
  return undefined;
}

function filterMeetingsLabel(parts: {
  status?: string;
  datePreset?: string;
  project?: string;
  advisor?: string;
}): string {
  if (parts.status === 'Scheduled') return 'Show scheduled presentations';
  if (parts.status === 'Completed') return 'Show completed presentations';
  if (parts.status === 'Live') return 'Show live presentations';
  if (parts.status === 'Canceled') return 'Show canceled presentations';
  const bits = [parts.status, parts.datePreset, parts.project, parts.advisor].filter(Boolean);
  return bits.length ? `Filter: ${bits.join(', ')}` : 'Filter presentations';
}

/** Presentations registry filters — must run before generic "open meetings" navigation. */
export function parseFilterMeetingsIntent(norm: string): ParsedCommand | null {
  const n = stripVoiceFillers(norm).toLowerCase().trim();
  const status = extractMeetingStatusFromTranscript(n);

  const hasMeetingNoun = /\b(?:meetings?|presentations?|sessions?|registry)\b/.test(n);

  if (!hasMeetingNoun && !status) return null;

  // "completed meetings", "live presentations" (no show/filter verb required)
  const statusOnlyPhrase = status && hasMeetingNoun && !/\b(?:customer|client|crm)\b/.test(n);

  const classicFilter =
    (/\b(?:filter|show|display|list|see|view)\b.*\b(?:meetings|presentations|sessions)\b/.test(
      n
    ) ||
      /\b(?:filter|show|list|see|view)\b.*\b(?:completed|scheduled|live|canceled|cancelled|upcoming)\b/.test(
        n
      )) &&
    !n.includes('calendar') &&
    !n.includes('new');

  if (!statusOnlyPhrase && !classicFilter) return null;

  let datePreset: string | undefined;
  if (/\btoday\b/.test(n)) datePreset = 'today';
  else if (/\bweek\b/.test(n)) datePreset = 'week';
  else if (/\bmonth\b/.test(n)) datePreset = 'month';

  let project: string | undefined;
  for (const pName of DEVELOPMENT_NAMES) {
    if (n.includes(pName.toLowerCase()) || n.includes(pName.split(' ')[0].toLowerCase())) {
      project = pName;
      break;
    }
  }

  const advisorNames = [
    'Priya Sharma',
    'Ananya Reddy',
    'Vikram Malhotra',
    'Rahul Mehta',
    'Karan Johar',
    'Neha Gupta',
  ];
  let advisor: string | undefined;
  for (const aName of advisorNames) {
    if (n.includes(aName.toLowerCase()) || n.includes(aName.split(' ')[0].toLowerCase())) {
      advisor = aName;
      break;
    }
  }

  if (!status && !datePreset && !project && !advisor) return null;

  return {
    commandId: 'filter-meetings',
    label: filterMeetingsLabel({ status, datePreset, project, advisor }),
    args: { status, datePreset, project, advisor },
  };
}

const DEVELOPMENT_NAMES = [
  'Lodha World Towers',
  'The Ivory Pavilion',
  'Skyview Estate',
  'Amanora Gateway',
  'Aaranya Valley',
  'Sera Pavilion',
];

/** Matches schedule/book/create + optional articles + presentation|meeting|session */
function isSchedulePresentationPhrase(norm: string): boolean {
  if (/\bfilter\b/.test(norm)) return false;
  const noun =
    /\b(?:(?:new|another)\s+)?(?:presentation|meeting|session)s?\b/.test(norm) ||
    /\bschedule\s+(?:a\s+)?(?:presentation|meeting|session)\b/.test(norm);
  const verb =
    /\b(?:schedule|book|create|arrange|add|start|set\s+up|plan)\b/.test(norm) ||
    /\b(?:new|another)\s+(?:presentation|meeting|session)\b/.test(norm);
  return noun && verb;
}

function extractDevelopment(norm: string): string {
  for (const pName of DEVELOPMENT_NAMES) {
    if (
      norm.includes(pName.toLowerCase()) ||
      norm.includes(pName.split(' ')[0].toLowerCase())
    ) {
      return pName;
    }
  }
  const forProject = norm.match(
    /\bfor\s+(?:the\s+)?([a-z][a-z\s]{2,}?)(?:\s+(?:with|at|on|tomorrow|today)\b|$)/
  );
  if (forProject) {
    const candidate = forProject[1].trim();
    if (!/\b(?:client|customer|prospect|lead)\b/.test(candidate)) {
      return candidate.replace(/\b(presentation|meeting|session)\b/g, '').trim();
    }
  }
  return '';
}

function extractScheduleClient(norm: string): string {
  const withMatch = norm.match(
    /\bwith\s+(?:client\s+)?([a-z0-9][a-z0-9\s]{0,40}?)(?:\s+(?:at|on|for|tomorrow|today|next)\b|$)/
  );
  if (withMatch) return withMatch[1].trim();

  const forClient = norm.match(
    /\bfor\s+(?:client\s+)?([a-z0-9][a-z0-9\s]{0,40}?)(?:\s+(?:at|on|with|tomorrow|today)\b|$)/
  );
  if (forClient) {
    const name = forClient[1].trim();
    if (!DEVELOPMENT_NAMES.some((d) => d.toLowerCase().includes(name))) {
      return name;
    }
  }
  return '';
}

function sanitizeExtractedClientName(candidate: string): string {
  const name = candidate.trim();
  if (!name) return '';
  const norm = name.toLowerCase().replace(/\s+/g, ' ');
  if (
    /^(?:a\s+)?(?:new\s+)?(?:customer|client|lead|contact)s?$/.test(norm) ||
    /^(?:new\s+)?(?:customer|client|lead|contact)\s+(?:named|called)\s+/.test(norm)
  ) {
    return '';
  }
  const tokens = norm.split(' ');
  if (
    tokens.every((t) =>
      ['a', 'an', 'the', 'new', 'customer', 'client', 'lead', 'contact'].includes(t)
    )
  ) {
    return '';
  }
  return name;
}

function parseAddCustomerIntent(norm: string): ParsedCommand | null {
  const addToCrm = /\badd\s+([a-z][a-z\s]{2,})\s+to\s+(?:crm|customers|portfolio)\b/.exec(norm);
  const bareAdd =
    /\b(?:add|create|register)\s+(?:a\s+)?(?:new\s+)?(?:customer|client|lead|contact)s?\s*$/i.test(
      norm
    ) || /\bnew\s+(?:customer|client|lead|contact)\s*$/i.test(norm);

  if (!bareAdd && !addToCrm && !/\b(?:add|create|register|new)\s+(?:customer|client|lead|contact)\b/.test(norm)) {
    return null;
  }

  let name = '';
  if (addToCrm) {
    name = sanitizeExtractedClientName(addToCrm[1]);
  } else {
    const withMatch = norm.match(/\bwith\s+(?:client\s+)?([a-z][a-z0-9\s]{1,40}?)(?:\s+(?:phone|email|in)\b|$)/);
    const namedMatch = norm.match(
      /\b(?:add|create|register)\s+(?:client|customer|lead|contact)\s+([a-z][a-z0-9\s]{2,}?)(?:\s+(?:with|phone|email)|$)/
    );
    const namedPersonMatch = norm.match(
      /\b(?:add|create)\s+([a-z][a-z0-9\s]{2,}?)\s+(?:as\s+)?(?:a\s+)?(?:new\s+)?(?:customer|client|lead|contact)\b/
    );
    if (withMatch) name = sanitizeExtractedClientName(withMatch[1]);
    else if (namedPersonMatch) name = sanitizeExtractedClientName(namedPersonMatch[1]);
    else if (namedMatch) name = sanitizeExtractedClientName(namedMatch[1]);
  }

  const phoneMatch = norm.match(/\b(?:phone|mobile)\s*(?:is|:)?\s*([\d\s+\-]{8,})/);
  const emailMatch = norm.match(/\b[\w.+-]+@[\w.-]+\.\w+/);
  const cityMatch = norm.match(/\b(?:in|from|city)\s+([a-z\s]+?)(?:\s+(?:phone|email)|$)/);

  return {
    commandId: 'add-customer',
    label: name ? `Add client ${name}` : 'Add new client to CRM',
    args: {
      name,
      client: name,
      phone: phoneMatch?.[1]?.replace(/\s/g, '') ?? '',
      email: emailMatch?.[0] ?? '',
      city: cityMatch?.[1]?.trim() ?? '',
    },
  };
}

function parseSchedulePresentationIntent(norm: string): ParsedCommand | null {
  if (!isSchedulePresentationPhrase(norm)) return null;

  const project = extractDevelopment(norm);
  const client = extractScheduleClient(norm);

  let date = '';
  if (/\btoday\b/.test(norm)) date = 'today';
  else if (/\btomorrow\b/.test(norm)) date = 'tomorrow';
  else if (/\bnext\s+(?:week|monday)\b/.test(norm)) date = 'next-week';

  let time = '';
  const timeMatch = norm.match(/\b(?:at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : '';
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  return {
    commandId: 'schedule-presentation',
    label: `Schedule presentation${project ? `: ${project}` : ''}${client ? ` with ${client}` : ''}`,
    args: { project, client, date, time },
  };
}

/**
 * Parses a single command phrase into structured ID and arguments.
 */
export function parseSingleCommand(phrase: string): ParsedCommand | null {
  const norm = stripVoiceFillers(phrase).toLowerCase().trim();

  const filterMeetings = parseFilterMeetingsIntent(norm);
  if (filterMeetings) return filterMeetings;

  // 1. Moderator Slide navigation
  // e.g. "go to slide 4", "change slide to 5", "navigate to slide 3"
  const slideMatch = norm.match(/\b(?:slide|page)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/);
  if (slideMatch) {
    const numWord = slideMatch[1];
    let slideNum = numWord;
    const wordMap: Record<string, string> = {
      one: '01', two: '02', three: '03', four: '04', five: '05',
      six: '06', seven: '07', eight: '08', nine: '09', ten: '10'
    };
    if (isNaN(Number(numWord))) {
      slideNum = wordMap[numWord] || '01';
    } else {
      slideNum = numWord.padStart(2, '0');
    }
    return {
      commandId: 'change-slide',
      label: `Change slide to ${slideNum}`,
      args: { slide: slideNum }
    };
  }
  
  if (/\b(?:next\s+slide|go\s+forward)\b/.test(norm)) {
    return {
      commandId: 'change-slide',
      label: 'Go to next slide',
      args: { slide: 'next' }
    };
  }
  if (/\b(?:previous\s+slide|go\s+back\s+slide|back\s+slide)\b/.test(norm)) {
    return {
      commandId: 'change-slide',
      label: 'Go to previous slide',
      args: { slide: 'prev' }
    };
  }

  // 2. Moderator Drawer control
  // e.g. "open analytics drawer", "show visitor details", "open script guide", "close script"
  if (/\b(?:close|hide)\s+(?:drawer|panel|overlay|sidebar)\b/.test(norm) || /\b(?:close|hide)\s+(?:analytics|visitors|script)\b/.test(norm)) {
    return {
      commandId: 'toggle-drawer',
      label: 'Close drawer panel',
      args: { drawer: null }
    };
  }
  if (/\b(?:analytics|metric|chart|engagement)\b/.test(norm) && /\b(?:open|show|toggle)\b/.test(norm)) {
    return {
      commandId: 'toggle-drawer',
      label: 'Open Analytics Drawer',
      args: { drawer: 'analytics' }
    };
  }
  if (/\b(?:visitor|client|user|participant|team|observer|people|audience)\b/.test(norm) && /\b(?:open|show|list)\b/.test(norm) && !/\b(?:observer)\b/.test(norm)) {
    return {
      commandId: 'toggle-drawer',
      label: 'Open Visitors Drawer',
      args: { drawer: 'visitors' }
    };
  }
  if (/\b(?:script|guide|notes|overlay)\b/.test(norm) && /\b(?:open|show|read|toggle)\b/.test(norm)) {
    return {
      commandId: 'toggle-drawer',
      label: 'Open Script Drawer',
      args: { drawer: 'script' }
    };
  }

  // 3. Moderator Mic/Cam/Observers control
  if (/\bmute\b.*\b(?:mic|microphone|audio)\b/.test(norm) || /\b(?:turn\s+off|disable|stop)\s+(?:mic|microphone|audio)\b/.test(norm)) {
    return {
      commandId: 'toggle-mic',
      label: 'Mute Microphone',
      args: { enabled: false }
    };
  }
  if (/\bunmute\b.*\b(?:mic|microphone|audio)\b/.test(norm) || /\b(?:turn\s+on|enable|start)\s+(?:mic|microphone|audio)\b/.test(norm)) {
    return {
      commandId: 'toggle-mic',
      label: 'Unmute Microphone',
      args: { enabled: true }
    };
  }
  if (/\b(?:turn\s+off|disable|stop|hide)\s+(?:cam|camera|video)\b/.test(norm)) {
    return {
      commandId: 'toggle-cam',
      label: 'Disable Camera feed',
      args: { enabled: false }
    };
  }
  if (/\b(?:turn\s+on|enable|start|show)\s+(?:cam|camera|video)\b/.test(norm)) {
    return {
      commandId: 'toggle-cam',
      label: 'Enable Camera feed',
      args: { enabled: true }
    };
  }
  if (/\bhide\s+observers\b/.test(norm) || /\b(?:hide|disable|turn\s+off)\s+(?:observer|spectator|backstage)\b/.test(norm)) {
    return {
      commandId: 'toggle-observers',
      label: 'Hide Observer Sidebar',
      args: { enabled: false }
    };
  }
  if (/\bshow\s+observers\b/.test(norm) || /\b(?:show|enable|turn\s+on)\s+(?:observer|spectator|backstage)\b/.test(norm)) {
    return {
      commandId: 'toggle-observers',
      label: 'Show Observer Sidebar',
      args: { enabled: true }
    };
  }

  // 4. Client Profile tabs / sub-views
  // sections: 'overview' | 'activity' | 'presentations' | 'advisor' | 'notes'
  if (/\b(?:timeline|activity|history|feed|log)\b/.test(norm) && /\b(?:open|show|view)\b/.test(norm)) {
    return {
      commandId: 'set-client-section',
      label: 'Open Activity Timeline tab',
      args: { section: 'activity' }
    };
  }
  if (/\b(?:notes|note|comment)\b/.test(norm) && /\b(?:open|show|view|write)\b/.test(norm)) {
    return {
      commandId: 'set-client-section',
      label: 'Open Notes tab',
      args: { section: 'notes' }
    };
  }
  if (/\b(?:session|presentation|meeting|history)\b/.test(norm) && /\b(?:open|show|view)\b/.test(norm) && norm.includes('customer')) {
    return {
      commandId: 'set-client-section',
      label: 'Open Presentation History',
      args: { section: 'presentations' }
    };
  }
  if (/\b(?:advisor|consultant|sales member|assignment)\b/.test(norm) && /\b(?:open|show|view)\b/.test(norm)) {
    return {
      commandId: 'set-client-section',
      label: 'Open Advisor Assignment panel',
      args: { section: 'advisor' }
    };
  }
  if (/\b(?:overview|profile|details|info)\b/.test(norm) && /\b(?:open|show|view)\b/.test(norm)) {
    return {
      commandId: 'set-client-section',
      label: 'Open Client Overview',
      args: { section: 'overview' }
    };
  }

  // 5. Template editor tabs
  // 'invite-email' | 'reschedule-email' | 'whatsapp'
  if (/\b(?:whatsapp|message)\b/.test(norm) && /\b(?:open|show|view|templates|tab)\b/.test(norm)) {
    return {
      commandId: 'set-template-tab',
      label: 'Switch to WhatsApp templates',
      args: { tab: 'whatsapp' }
    };
  }
  if (/\b(?:reschedule|rescheduled)\b/.test(norm) && /\b(?:email|mail|template|tab)\b/.test(norm)) {
    return {
      commandId: 'set-template-tab',
      label: 'Switch to Reschedule Email template',
      args: { tab: 'reschedule-email' }
    };
  }
  if (/\b(?:invite|invitation|email|mail|template|tab)\b/.test(norm) && /\b(?:open|show|view)\b/.test(norm)) {
    return {
      commandId: 'set-template-tab',
      label: 'Switch to Email templates',
      args: { tab: 'invite-email' }
    };
  }

  // 6. Navigation
  if (
    /\b(?:customers?|clients?|crm|portfolio)\b/.test(norm) &&
    /\b(?:check|view|show|open|go|see|list)\b/.test(norm)
  ) {
    return {
      commandId: 'navigate',
      label: 'Open customer list',
      args: { path: '/customers' },
    };
  }
  if (
    /\b(?:presentations?|meetings?|sessions?|registry)\b/.test(norm) &&
    /\b(?:check|view|show|open|go|see|list)\b/.test(norm) &&
    !norm.includes('calendar') &&
    !norm.includes('new') &&
    !MEETING_STATUS_WORDS.test(norm)
  ) {
    return {
      commandId: 'navigate',
      label: 'Open presentations list',
      args: { path: '/meetings' },
    };
  }
  if (/\b(?:dashboard|overview|home|main)\b/.test(norm) && /\b(?:open|go|navigate|show|check|view)\b/.test(norm)) {
    return {
      commandId: 'navigate',
      label: 'Navigate to Dashboard',
      args: { path: '/' }
    };
  }
  if (
    /\b(?:presentation|meeting|session)\b/.test(norm) &&
    /\b(?:open|go|navigate|show|start)\b/.test(norm) &&
    /\b(?:schedule|wizard)\b/.test(norm)
  ) {
    return {
      commandId: 'navigate',
      label: 'Open Schedule Presentation wizard',
      args: { path: '/meetings/new' },
    };
  }
  if (
    /\b(?:presentations|meetings|registry|sessions)\b/.test(norm) &&
    /\b(?:open|go|navigate|show)\b/.test(norm) &&
    !norm.includes('new') &&
    !norm.includes('calendar') &&
    !MEETING_STATUS_WORDS.test(norm)
  ) {
    return {
      commandId: 'navigate',
      label: 'Navigate to Presentations',
      args: { path: '/meetings' }
    };
  }
  if (/\b(?:calendar|agenda|schedule\s+view)\b/.test(norm) && /\b(?:open|go|navigate|show)\b/.test(norm)) {
    return {
      commandId: 'navigate',
      label: 'Navigate to Calendar',
      args: { path: '/meetings/calendar' }
    };
  }
  if (/\b(?:customers|clients|crm|contacts|leads)\b/.test(norm) && /\b(?:open|go|navigate|show)\b/.test(norm)) {
    return {
      commandId: 'navigate',
      label: 'Navigate to Customers CRM',
      args: { path: '/customers' }
    };
  }
  if (/\b(?:team|members|staff|advisors)\b/.test(norm) && /\b(?:open|go|navigate|show)\b/.test(norm)) {
    return {
      commandId: 'navigate',
      label: 'Navigate to Team Members',
      args: { path: '/admin/team' }
    };
  }
  if (/\b(?:roles|policies|permissions)\b/.test(norm) && /\b(?:open|go|navigate|show)\b/.test(norm)) {
    return {
      commandId: 'navigate',
      label: 'Navigate to Role Policies',
      args: { path: '/admin/roles' }
    };
  }
  if (/\b(?:matrix|permission\s+matrix)\b/.test(norm) && /\b(?:open|go|navigate|show)\b/.test(norm)) {
    return {
      commandId: 'navigate',
      label: 'Navigate to Permission Matrix',
      args: { path: '/admin/permissions' }
    };
  }
  if (/\b(?:templates|invite\s+templates|invite\s+settings)\b/.test(norm) && /\b(?:open|go|navigate|show)\b/.test(norm)) {
    return {
      commandId: 'navigate',
      label: 'Navigate to Invitation Templates',
      args: { path: '/settings/templates' }
    };
  }

  // 7. Launch moderator session
  // e.g. "launch presentation for Skyview", "open sales portal for Lodha World Towers", "start presentation for Lodha"
  if (/\b(?:launch|start|open|enter)\b.*\b(?:presentation|portal|sales portal|session)\b/i.test(norm)) {
    const propertyNames = ['Lodha World Towers', 'The Ivory Pavilion', 'Skyview Estate', 'Amanora Gateway', 'Aaranya Valley', 'Sera Pavilion'];
    // Try to extract name
    let foundProj = '';
    for (const pName of propertyNames) {
      if (norm.includes(pName.toLowerCase()) || norm.includes(pName.split(' ')[0].toLowerCase())) {
        foundProj = pName;
        break;
      }
    }
    return {
      commandId: 'launch-portal',
      label: foundProj ? `Launch portal for ${foundProj}` : 'Launch presentation portal',
      args: { project: foundProj }
    };
  }

  // 8. Client information (multi-match disambiguation in command handler)
  const clientInfoName = extractClientTargetFromUtterance(phrase);
  if (clientInfoName) {
    return {
      commandId: 'client-info',
      label: `Client information: ${clientInfoName}`,
      args: { client: clientInfoName, question: phrase.trim() },
    };
  }

  // 9. Search Customer / Open Client profile
  const ourClientMatch = norm.match(
    /\b(?:our|my|the)\s+client\s+([a-z][a-z0-9\s]{2,}?)\s*$/
  );
  if (ourClientMatch) {
    const clientName = ourClientMatch[1].trim();
    if (clientName.length > 2) {
      return {
        commandId: 'search-customer',
        label: `Open client ${clientName}`,
        args: { client: clientName },
      };
    }
  }

  const bareClientMatch = norm.match(/^client\s+([a-z][a-z0-9\s]{2,}?)\s*$/);
  if (bareClientMatch) {
    const clientName = bareClientMatch[1].trim();
    if (clientName.length > 2) {
      return {
        commandId: 'search-customer',
        label: `Open client ${clientName}`,
        args: { client: clientName },
      };
    }
  }

  // e.g. "search customer Aditya", "open profile for Priya Sharma", "find client Arjun Mehta"
  const searchCustomerMatch = norm.match(
    /\b(?:search|find|open|view|show)\s+(?:customer|client|profile|contact)?\s*for?\s*([a-z0-9\s]+)/
  );
  if (searchCustomerMatch && !/\b(?:presentations|meetings|calendar|settings|template|role|permission|dashboard)\b/.test(searchCustomerMatch[1])) {
    const clientName = searchCustomerMatch[1].trim();
    if (clientName && clientName.length > 2) {
      return {
        commandId: 'search-customer',
        label: `Search customer "${clientName}"`,
        args: { client: clientName }
      };
    }
  }

  // 10. Schedule presentation / wizard (meetings = presentations in product copy)
  const scheduleIntent = parseSchedulePresentationIntent(norm);
  if (scheduleIntent) {
    return scheduleIntent;
  }

  // 11. Add customer / client to CRM
  const addCustomerIntent = parseAddCustomerIntent(norm);
  if (addCustomerIntent) {
    return addCustomerIntent;
  }

  return null;
}

/**
 * Parses a raw voice search transcript into a queue of CommandExecution items.
 */
export function parseTranscriptToQueue(transcript: string): CommandExecution[] {
  const phrases = splitQueries(transcript);
  const queue: CommandExecution[] = [];

  for (const phrase of phrases) {
    const parsed = parseSingleCommand(phrase);
    if (parsed) {
      queue.push({
        id: Math.random().toString(36).substring(2, 9),
        commandId: parsed.commandId,
        label: parsed.label || phrase,
        status: 'pending',
        args: parsed.args,
      });
    }
  }

  return queue;
}
