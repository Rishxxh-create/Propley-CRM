'use client';

import { useLoadMeetings } from '@/store/hooks/useMeetings';

export default function MeetingsLayout({ children }: { children: React.ReactNode }) {
  useLoadMeetings();
  return children;
}
