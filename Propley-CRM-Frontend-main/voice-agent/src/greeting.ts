import { GREETING } from "./config.js";

export interface PipelineSnapshot {
  activeMeetings?: number;
  totalMeetings?: number;
  totalClients?: number;
}

function timeOfDay(hour: number): string {
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

export function composeGreeting(
  snapshot: PipelineSnapshot | null,
  advisor?: string | null,
  hour: number = new Date().getHours(),
): string {
  const name = advisor?.trim().split(/\s+/)[0];
  const hello = name ? `${timeOfDay(hour)}, ${name}.` : `${timeOfDay(hour)}.`;

  if (!snapshot) return name ? `${hello} What can I do for you?` : GREETING;

  const active = snapshot.activeMeetings ?? 0;
  const clients = snapshot.totalClients ?? 0;

  if (active > 0) {
    const count = active === 1 ? "one live right now" : `${active} live right now`;
    return `${hello} You've got ${count}. ${pick([
      "Want me to pull them up?",
      "Shall I bring them up?",
      "Where do you want to start?",
    ])}`;
  }

  if (clients > 0) {
    const count = clients === 1 ? "one client" : `${clients} clients`;
    return `${hello} Nothing live at the moment — ${count} on your books. ${pick([
      "What are we doing today?",
      "Where do you want to start?",
      "What can I get you?",
    ])}`;
  }

  return name ? `${hello} What can I do for you?` : GREETING;
}
