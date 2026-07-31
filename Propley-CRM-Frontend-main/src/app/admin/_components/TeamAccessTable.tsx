'use client';

import { RiEditLine } from 'react-icons/ri';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getRoleLabel } from '@/lib/roles';
import type { TeamMember } from '@/lib/mock-data';
import { ROLE_STYLES, STATUS_STYLES } from './admin-shared';

export function TeamAccessTable({
  members,
  onEdit,
}: {
  members: TeamMember[];
  onEdit: (member: TeamMember) => void;
}) {
  return (
    <Card className="rounded-lg border-stone-alt shadow-none! overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-stone/40 border-b border-stone-alt hover:bg-stone/40">
              <TableHead className="h-12 px-6 text-xs font-semibold text-zinc-500">Member</TableHead>
              <TableHead className="h-12 px-6 text-xs font-semibold text-zinc-500">Access Role</TableHead>
              <TableHead className="h-12 px-6 text-xs font-semibold text-zinc-500">Department</TableHead>
              <TableHead className="h-12 px-6 text-xs font-semibold text-zinc-500">Status</TableHead>
              <TableHead className="h-12 px-6 text-xs font-semibold text-zinc-500">Last Active</TableHead>
              <TableHead className="h-12 px-6 text-xs font-semibold text-zinc-500 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member, i) => (
              <TableRow
                key={member.id}
                className="border-b border-stone-alt/80 transition-colors hover:bg-stone/30"
                style={{ animation: `fadeUp 0.4s ease ${i * 0.05}s both` }}
              >
                <TableCell className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center border border-stone-alt bg-stone text-sm font-semibold text-gold">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{member.name}</p>
                      <p className="text-xs text-zinc-500 font-medium">{member.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-5">
                  <span className={cn('text-[10px] font-semibold px-2.5 py-1 inline-block', ROLE_STYLES[member.role])}>
                    {getRoleLabel(member.role)}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-5 text-sm font-medium text-zinc-600">{member.department}</TableCell>
                <TableCell className="px-6 py-5">
                  <span className={cn('text-[10px] font-semibold px-2.5 py-1 capitalize inline-block', STATUS_STYLES[member.status])}>
                    {member.status}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-5 text-xs font-medium text-zinc-500">{member.lastActive}</TableCell>
                <TableCell className="px-6 py-5 text-right">
                  <button
                    type="button"
                    onClick={() => onEdit(member)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-500 transition-colors hover:bg-stone hover:text-gold"
                  >
                    <RiEditLine size={15} />
                    Edit
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
