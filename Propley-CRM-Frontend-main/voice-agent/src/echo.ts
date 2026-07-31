const MIN_ECHO_WORDS = 3;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function dropWords(text: string, count: number): string {
  const token = /[\p{L}\p{N}]+/gu;
  let seen = 0;
  let match: RegExpExecArray | null;

  while ((match = token.exec(text)) !== null) {
    seen++;
    if (seen === count) {
      return text
        .slice(match.index + match[0].length)
        .replace(/^[\s\p{P}]+/u, "")
        .trim();
    }
  }
  return "";
}

export function stripSelfEcho(userText: string, agentText: string | null): string {
  if (!agentText) return userText;

  const spoken = words(userText);
  const said = words(agentText);
  if (spoken.length === 0 || said.length < MIN_ECHO_WORDS) return userText;

  const haystack = ` ${said.join(" ")} `;

  let matched = 0;
  for (let n = Math.min(spoken.length, said.length); n >= MIN_ECHO_WORDS; n--) {
    if (haystack.includes(` ${spoken.slice(0, n).join(" ")} `)) {
      matched = n;
      break;
    }
  }

  if (matched === 0) return userText;
  if (matched === spoken.length) return "";

  return dropWords(userText, matched);
}
