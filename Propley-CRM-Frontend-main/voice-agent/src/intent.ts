const HYPOTHETICAL: RegExp[] = [
  /^\s*(so\s+)?(should|shall)\s+(i|we)\b/i,
  /\bwhat\s+(would|will|'?d)\s+happen\b/i,
  /^\s*what\s+if\b/i,
  /\bif\s+i\s+(were\s+to|was\s+to)\b/i,
  /\bwould\s+(it|that|you)\s+(be\s+)?(a\s+)?(good|bad|wise|better|sensible)\b/i,
  /\b(is|would)\s+it\s+(possible|worth|smart|sensible)\b/i,
  /\bdo\s+you\s+think\s+i\s+should\b/i,
  /\bwhat\s+does\s+(that|this|cancelling|rescheduling)\s+(tool\s+)?do\b/i,
  /\bhow\s+(do|does)\s+(i|you|it)\s+work\b/i,
];

export function isHypothetical(userText: string): boolean {
  const text = userText.trim();
  if (!text) return false;
  return HYPOTHETICAL.some((pattern) => pattern.test(text));
}
