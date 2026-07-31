'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  RiUserLine,
  RiMailLine,
  RiPhoneLine,
  RiMapPinLine,
  RiSearchLine,
  RiAddLine,
  RiArrowRightUpLine,
  RiMore2Fill,
  RiPencilLine,
  RiDeleteBinLine,
  RiArrowUpLine,
  RiArrowDownLine,
} from 'react-icons/ri';
import { AutoTaggedSources } from '@/app/pipeline/_components/AutoTaggedSources';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RiListCheck, RiKanbanView } from 'react-icons/ri';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AddCustomerModal from '@/components/customers/AddCustomerModal';
import { UniversalSelect } from '@/components/UniversalSelect';
import { readCustomers, subscribeCustomers, isCustomersHydrated, DEAL_STAGES, removeCustomer } from '@/lib/customers-store';
import { PAGE } from '@/lib/copy';
import { dealStageBadgeClass } from '@/components/customers/deal-stage-utils';
import { EmptyState } from '@/components/ui/empty-state';
import type { DealStage, Customer } from '@/lib/mock-data';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EditCustomerModal } from '@/components/customers/EditCustomerModal';
import { toast } from 'sonner';

const EMPTY_ARRAY: Customer[] = [];

export default function CustomersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const isClient = useSyncExternalStore(
    () => () => { },
    () => true,
    () => false
  );

  const allCustomers = useSyncExternalStore(
    subscribeCustomers,
    readCustomers,
    () => EMPTY_ARRAY
  );

  const isHydrated = useSyncExternalStore(
    subscribeCustomers,
    isCustomersHydrated,
    () => false
  );

  const stageOptions = [
    { id: '', name: 'All stages' },
    ...DEAL_STAGES.map((s) => ({ id: s, name: PAGE.customers.dealStages[s] }))
  ];

  const customers = allCustomers.filter((c) => {
    const stageMatch = !stageFilter || (c.dealStage || 'inquiry') === stageFilter;
    if (!stageMatch) return false;

    if (sourceFilter && (!c.leadSource || c.leadSource.toLowerCase() !== sourceFilter)) {
      return false;
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q)
    );
  });

  const sortedCustomers = [...customers].sort((a, b) => {
    let valA = '';
    let valB = '';

    if (sortKey === 'name') {
      valA = a.name.toLowerCase();
      valB = b.name.toLowerCase();
    } else if (sortKey === 'contact') {
      valA = a.email.toLowerCase();
      valB = b.email.toLowerCase();
    } else if (sortKey === 'location') {
      valA = a.city.toLowerCase();
      valB = b.city.toLowerCase();
    } else if (sortKey === 'stage') {
      valA = (a.dealStage || 'inquiry').toLowerCase();
      valB = (b.dealStage || 'inquiry').toLowerCase();
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedCustomers.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  const handleBulkDeleteClick = () => {
    setDeleteTargetIds(Array.from(selectedIds));
    setIsDeleteDialogOpen(true);
  };

  const handleRowDeleteClick = (id: string) => {
    setDeleteTargetIds([id]);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await Promise.all(deleteTargetIds.map(id => removeCustomer(id)));
      toast.success(`Deleted ${deleteTargetIds.length} client(s)`);
      setSelectedIds(new Set([...selectedIds].filter(id => !deleteTargetIds.includes(id))));
    } catch {
      toast.error('Failed to delete clients');
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteTargetIds([]);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) return null;
    return sortDir === 'asc' ? <RiArrowUpLine className="inline ml-1" /> : <RiArrowDownLine className="inline ml-1" />;
  };

  return (
    <DashboardLayout activePath="/customers">
      <div className="space-y-12 px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-ink">
                {PAGE.customers.title}
                <span className="text-gold">.</span>
              </h1>
              <p className="text-sm font-medium text-zinc-500">{PAGE.customers.subtitle}</p>
            </div>
            <div className="h-[2px] w-16 bg-gold" />
          </div>

          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center md:w-auto flex-wrap lg:flex-nowrap">
            <div className="w-full sm:w-[180px]">
              <UniversalSelect
                value={stageFilter}
                onChange={setStageFilter}
                options={stageOptions}
                placeholder="All stages"
                enableSearch={false}
              />
            </div>
            <div className="relative w-full sm:w-[280px] group flex-1">
              <RiSearchLine className="absolute left-0 top-1/2 z-10 -translate-y-1/2 text-zinc-400 group-focus-within:text-gold" />
              <Input
                type="text"
                placeholder={PAGE.customers.search}
                className="h-14 pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkDeleteClick}
                className="flex w-full sm:w-auto h-14 items-center gap-2 rounded-lg px-6 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 shadow-none border border-red-100 shrink-0 justify-center"
              >
                <RiDeleteBinLine size={16} />
                Delete Selected ({selectedIds.size})
              </Button>
            )}
            <Button
              onClick={() => setIsModalOpen(true)}
              className="flex w-full sm:w-auto h-14 items-center gap-3 rounded-lg bg-ink px-8 text-xs font-semibold text-white shadow-xl hover:bg-gold shrink-0 justify-center"
            >
              <RiAddLine size={18} />
              {PAGE.customers.addCta}
            </Button>
          </div>
        </div>

        <div className="mt-2 mb-4">
          <AutoTaggedSources
            customers={allCustomers}
            selectedSource={sourceFilter}
            onSelectSource={setSourceFilter}
            loading={!isHydrated}
          />
        </div>

        <AddCustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

        {!isClient || !isHydrated ? (
          <TableSkeleton rows={6} cols={5} />
        ) : customers.length === 0 ? (
          <EmptyState
            title={PAGE.customers.empty.title}
            description={PAGE.customers.empty.description}
            actionLabel={PAGE.customers.addCta}
            onAction={() => setIsModalOpen(true)}
            icon={<RiUserLine size={28} />}
          />
        ) : (
          <Card className="overflow-hidden rounded-xl pt-0! shadow-none! border-stone-alt">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-stone-alt bg-stone/50 hover:bg-stone/50">
                    <TableHead className="h-11 w-12 px-5 text-center">
                      <Checkbox
                        checked={sortedCustomers.length > 0 && selectedIds.size === sortedCustomers.length}
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      />
                    </TableHead>
                    <TableHead className="h-11 px-5 text-xs font-semibold text-zinc-500">
                      <button onClick={() => handleSort('name')} className="flex items-center hover:text-ink transition-colors group/sort">
                        {PAGE.customers.columns.identity}
                        <SortIcon columnKey="name" />
                      </button>
                    </TableHead>
                    <TableHead className="h-11 px-5 text-xs font-semibold text-zinc-500">
                      <button onClick={() => handleSort('contact')} className="flex items-center hover:text-ink transition-colors group/sort">
                        {PAGE.customers.columns.contact}
                        <SortIcon columnKey="contact" />
                      </button>
                    </TableHead>
                    <TableHead className="h-11 px-5 text-xs font-semibold text-zinc-500">
                      <button onClick={() => handleSort('location')} className="flex items-center hover:text-ink transition-colors group/sort">
                        {PAGE.customers.columns.location}
                        <SortIcon columnKey="location" />
                      </button>
                    </TableHead>
                    <TableHead className="h-11 px-5 text-xs font-semibold text-zinc-500">
                      <button onClick={() => handleSort('stage')} className="flex items-center hover:text-ink transition-colors group/sort">
                        {PAGE.customers.columns.stage}
                        <SortIcon columnKey="stage" />
                      </button>
                    </TableHead>
                    <TableHead className="h-11 px-5 text-right text-xs font-semibold text-zinc-500">
                      {PAGE.customers.columns.actions}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCustomers.map((customer) => {
                    const stage = (customer.dealStage ?? 'inquiry') as DealStage;
                    return (
                      <TableRow
                        key={customer.id}
                        className="group border-none transition-colors hover:bg-stone/20"
                      >
                        <TableCell className="px-5 py-4 w-12 text-center">
                          <Checkbox
                            checked={selectedIds.has(customer.id)}
                            onCheckedChange={(checked) => handleSelectRow(customer.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <Link href={`/customers/${customer.id}`} className="flex items-center gap-4">
                            <div className="relative overflow-hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-warm-dark to-warm-darker text-sm font-bold text-white shadow-sm border border-black/10">
                              <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-full blur-md -translate-y-1/2 translate-x-1/3"></div>
                              <span className="relative z-10">{customer.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-ink group-hover:text-gold">
                                {customer.name}
                              </p>
                              <p className="mt-1 inline-block bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold rounded-sm">
                                {customer.status}
                              </p>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <div className="space-y-1 text-xs font-medium text-zinc-500">
                            <p className="flex items-center gap-2">
                              <RiMailLine className="text-gold" />
                              {customer.email}
                            </p>
                            <p className="flex items-center gap-2">
                              <RiPhoneLine className="text-gold" />
                              {customer.phone.startsWith('+') ? customer.phone : `+${customer.phone}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <p className="flex items-center gap-2 text-xs font-semibold text-ink">
                            <RiMapPinLine className="text-gold" />
                            {customer.city}
                          </p>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <span
                            className={`inline-flex border px-2 py-1 text-[10px] font-semibold rounded-md ${dealStageBadgeClass(stage)}`}
                          >
                            {PAGE.customers.dealStages[stage]}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-8 w-8 p-0 text-zinc-500 hover:text-ink hover:bg-stone-alt/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                              <span className="sr-only">Open menu</span>
                              <RiMore2Fill size={16} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px] bg-white border border-stone-alt rounded-xl shadow-lg p-1.5 z-[1100]">
                              <DropdownMenuItem
                                onClick={() => setEditCustomerId(customer.id)}
                                className="gap-2 cursor-pointer text-xs font-medium text-ink rounded-lg hover:bg-stone/80 px-2.5 py-2"
                              >
                                <RiPencilLine size={14} className="text-zinc-500" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/customers/${customer.id}`)}
                                className="gap-2 cursor-pointer text-xs font-medium text-ink rounded-lg hover:bg-stone/80 px-2.5 py-2"
                              >
                                <RiArrowRightUpLine size={14} className="text-zinc-500" />
                                Profile
                              </DropdownMenuItem>
                              <div className="h-px bg-stone-alt my-1 mx-2" />
                              <DropdownMenuItem
                                onClick={() => handleRowDeleteClick(customer.id)}
                                className="gap-2 cursor-pointer text-xs font-medium text-red-600 focus:text-red-700 focus:bg-red-50 hover:bg-red-50 hover:text-red-700 rounded-lg px-2.5 py-2"
                              >
                                <RiDeleteBinLine size={14} />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {editCustomerId && (
          <EditCustomerModal
            isOpen={!!editCustomerId}
            onClose={() => setEditCustomerId(null)}
            customer={customers.find(c => c.id === editCustomerId) as Customer}
          />
        )}

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent showCloseButton={false} className="sm:max-w-[425px] gap-0 p-0 border border-stone-alt bg-white rounded-xl shadow-xl overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b border-stone-alt bg-stone/30">
              <DialogTitle className="text-xl font-semibold tracking-tight text-ink normal-case">Delete Client{deleteTargetIds.length > 1 ? 's' : ''}</DialogTitle>
              <DialogDescription className="text-sm font-medium text-zinc-500 mt-2">
                This action cannot be undone. Are you sure you want to permanently delete {deleteTargetIds.length === 1 ? 'this client' : `these ${deleteTargetIds.length} clients`} from the CRM?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="p-6 pt-4 bg-white sm:justify-end gap-3 flex-row flex">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="h-10 px-5 text-xs font-semibold text-ink border-stone-alt hover:bg-stone">
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} className="h-10 px-5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white border-none shadow-none">
                Delete {deleteTargetIds.length > 1 ? `(${deleteTargetIds.length})` : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
