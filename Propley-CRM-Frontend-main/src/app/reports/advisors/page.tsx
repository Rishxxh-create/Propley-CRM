'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAdvisorsReport } from '@/store/hooks/useReports';
import { PAGE } from '@/lib/copy';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export default function AdvisorsReportPage() {
  const { report, loading } = useAdvisorsReport();

  const maxEngagement = report ? Math.max(...report.map(r => r.engagement), 1) : 1;

  return (
    <DashboardLayout activePath="/reports/advisors">
      <div className="space-y-12 px-8 py-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-ink">
                Advisors Report
                <span className="text-gold">.</span>
              </h1>
              <p className="text-sm font-medium text-zinc-500">
                Performance metrics across the team.
              </p>
            </div>
            <div className="h-[2px] w-16 bg-gold" />
          </div>
        </div>

        {loading || !report ? (
          <Card className="overflow-hidden rounded-xl pt-0! border border-stone-alt bg-white shadow-none!">
            <div className="h-11 border-b border-stone-alt bg-stone/50" />
            <TableSkeleton rows={6} cols={4} />
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-xl pt-0! border border-stone-alt bg-gradient-to-b from-white to-stone-alt/20 shadow-none!">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-stone-alt bg-stone/50 hover:bg-stone/50">
                    <TableHead className="h-11 px-5 text-xs font-semibold text-zinc-500">
                      Advisor
                    </TableHead>
                    <TableHead className="h-11 px-5 text-xs font-semibold text-zinc-500">
                      Meetings
                    </TableHead>
                    <TableHead className="h-11 px-5 text-xs font-semibold text-zinc-500">
                      Engagement
                    </TableHead>
                    <TableHead className="h-11 px-5 text-xs font-semibold text-zinc-500">
                      Clients Reached
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.map((item, index) => (
                    <TableRow
                      key={index}
                      className="group border-none transition-colors hover:bg-stone/20"
                    >
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-warm-dark to-warm-darker text-[11px] font-semibold text-white shadow-sm">
                            {item.advisor.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm font-semibold text-ink transition-colors group-hover:text-gold">
                            {item.advisor}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <p className="text-sm font-medium text-zinc-600">
                          {item.meetings}
                        </p>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-medium text-zinc-600 w-10">
                            {item.engagement}
                          </p>
                          <div className="hidden sm:block h-1.5 w-24 rounded-full bg-stone-alt overflow-hidden shrink-0">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-gold to-gold-hover"
                              style={{ width: `${(item.engagement / maxEngagement) * 100}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <p className="text-sm font-medium text-zinc-600">
                          {item.clients_reached}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
