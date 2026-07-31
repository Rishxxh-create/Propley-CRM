import type { RootState } from '@/store';

export const selectEventStats = (state: RootState) => state.events.stats;
export const selectEventStatsStatus = (state: RootState) => state.events.status;
export const selectFunnelStats = (state: RootState) => state.events.funnelStats;
export const selectFunnelStatus = (state: RootState) => state.events.funnelStatus;
export const selectLeadSourceStats = (state: RootState) => state.events.leadSourceStats;
export const selectLeadSourceStatus = (state: RootState) => state.events.leadSourceStatus;
export const selectCityStats = (state: RootState) => state.events.cityStats;
export const selectCityStatus = (state: RootState) => state.events.cityStatus;
export const selectLiveStream = (state: RootState) => state.events.liveStream;
export const selectLiveStreamStatus = (state: RootState) => state.events.liveStreamStatus;
