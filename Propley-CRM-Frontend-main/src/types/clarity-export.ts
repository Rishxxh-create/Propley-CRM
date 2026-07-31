export type ClarityExportDimension =
  | 'Browser'
  | 'Device'
  | 'Country/Region'
  | 'OS'
  | 'Source'
  | 'Medium'
  | 'Campaign'
  | 'Channel'
  | 'URL';

export interface ClarityInsightRow {
  [key: string]: string | number | undefined;
}

export interface ClarityInsightMetric {
  metricName: string;
  information: ClarityInsightRow[];
}

export interface FetchClarityInsightsOptions {
  numOfDays?: 1 | 2 | 3;
  dimension1?: ClarityExportDimension;
  dimension2?: ClarityExportDimension;
  dimension3?: ClarityExportDimension;
}
