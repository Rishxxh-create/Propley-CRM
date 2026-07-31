import { format, isValid, parse, type FormatOptions, type ParseOptions } from 'date-fns';
import { enIN } from 'date-fns/locale';

/** date-fns locale for India (en-IN) */
export const IN_LOCALE = enIN;

const formatOpts: FormatOptions = { locale: enIN };
const parseOpts: ParseOptions<Date> = { locale: enIN };

/** Display: 18 May 2026 */
export const IN_DATE_DISPLAY = 'd MMMM yyyy';

/** Numeric: 18/05/2026 */
export const IN_DATE_SHORT = 'dd/MM/yyyy';

/** With weekday: Monday, 18 May 2026 */
export const IN_DATE_LONG = 'EEEE, d MMMM yyyy';

/** Month + year: May 2026 */
export const IN_MONTH_YEAR = 'MMMM yyyy';

/** Compact: 18 May */
export const IN_DAY_MONTH = 'd MMM';

/** Weekday short: Mon */
export const IN_WEEKDAY_SHORT = 'EEE';

/** Notes & activity: 18 May 2026, 2:30 pm */
export const IN_DATETIME = 'd MMM yyyy, h:mm a';

/** Calendar week range end: 18 May 2026 */
export const IN_DAY_MONTH_YEAR = 'd MMM yyyy';

const PARSE_PATTERNS = [
  'd MMMM yyyy',
  'dd MMMM yyyy',
  'd MMM yyyy',
  'dd/MM/yyyy',
  'd/M/yyyy',
  'MMMM d, yyyy',
  'MMM d, yyyy',
] as const;

export function formatIndianDate(
  date: Date,
  pattern: string = IN_DATE_DISPLAY
): string {
  return format(date, pattern, formatOpts);
}

/** Persist presentation dates in Indian long form */
export function formatStoredPresentationDate(date: Date): string {
  return formatIndianDate(date, IN_DATE_DISPLAY);
}

export function formatIndianDateTime(date: Date): string {
  return formatIndianDate(date, IN_DATETIME);
}

export function formatMeetingDateLabel(dateStr: string): string {
  const parsed = parseIndianDateString(dateStr);
  if (!parsed) return dateStr;
  return formatIndianDate(parsed);
}

export function parseIndianDateString(dateStr: string): Date | null {
  if (!dateStr?.trim()) return null;

  const cleaned = dateStr
    .trim()
    .replace(/(\d+)(st|nd|rd|th)/gi, '$1');

  for (const pattern of PARSE_PATTERNS) {
    const parsed = parse(cleaned, pattern, new Date(), parseOpts);
    if (isValid(parsed)) return parsed;
  }

  const d = new Date(cleaned);
  if (isValid(d)) return d;

  const dayFirst = cleaned.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (dayFirst) {
    const parsed = parse(
      `${dayFirst[1]} ${dayFirst[2]} ${dayFirst[3]}`,
      'd MMMM yyyy',
      new Date(),
      parseOpts
    );
    if (isValid(parsed)) return parsed;
  }

  const monthFirst = cleaned.match(/([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (monthFirst) {
    const parsed = parse(
      `${monthFirst[2]} ${monthFirst[1]} ${monthFirst[3]}`,
      'd MMMM yyyy',
      new Date(),
      parseOpts
    );
    if (isValid(parsed)) return parsed;
  }

  return null;
}
