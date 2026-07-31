import { RootState } from '@/store';

export const selectAdvisorsReport = (state: RootState) => state.reports.advisorsReport;
export const selectAdvisorsReportStatus = (state: RootState) => state.reports.advisorsStatus;

export const selectMeetingsReport = (state: RootState) => state.reports.meetingsReport;
export const selectMeetingsReportStatus = (state: RootState) => state.reports.meetingsStatus;
