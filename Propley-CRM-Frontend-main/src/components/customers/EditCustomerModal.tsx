'use client';

import { useState } from 'react';
import {
  RiCloseLine,
  RiUser3Line,
  RiMailLine,
  RiPhoneLine,
  RiMapPinLine,
  RiArrowRightLine,
  RiShareLine,
  RiMoneyRupeeCircleLine,
  RiCalendarCheckLine,
} from 'react-icons/ri';
import type { Customer } from '@/lib/mock-data';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { UniversalSelect } from '@/components/UniversalSelect';
import { LEAD_SOURCE_OPTIONS, resolveLeadSourceId } from '@/lib/lead-source-options';
import { updateCustomer } from '@/lib/customers-store';
import { emitCobrowse } from '@/lib/cobrowse';
import { toast } from '@/lib/toast';
import { PAGE } from '@/lib/copy';
import { format } from 'date-fns';
import { DatePicker } from '@/components/presentations/DatePicker';

const FORM_ID = 'edit-client-form';

interface EditCustomerModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

function buildFormData(customer: Customer) {
  return {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    leadSource: resolveLeadSourceId(customer.leadSource) ?? customer.leadSource ?? '',
    assignedAdvisorId: customer.assignedAdvisorId,
    dealValue: customer.dealValue ? customer.dealValue.toString() : '',
    followUpDate: customer.followUpDate ? customer.followUpDate.split('T')[0] : '',
  };
}

function EditCustomerForm({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const ph = PAGE.customers.addDrawer.placeholders;
  const [formData, setFormData] = useState(() => buildFormData(customer));
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updated = await updateCustomer(customer.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        city: formData.city.trim() || '—',
        assignedAdvisorId: formData.assignedAdvisorId,
        leadSource: formData.leadSource || undefined,
        dealValue: formData.dealValue ? parseInt(formData.dealValue, 10) : undefined,
        followUpDate: formData.followUpDate || undefined,
      });
      if (!updated) {
        toast.error('Could not update client profile');
        return;
      }
      emitCobrowse('customer-updated', { id: updated.id, name: updated.name });
      toast.customerUpdated();
      onClose();
    } catch {
      toast.error('Could not update client profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DrawerClose asChild>
        <button
          type="button"
          className="absolute top-4 right-4 z-50 flex h-8 w-8 items-center justify-center text-zinc-400 transition-colors hover:text-ink"
          aria-label="Close"
        >
          <RiCloseLine size={24} />
        </button>
      </DrawerClose>

      <div className="custom-scrollbar flex-1 overflow-y-auto">
        <DrawerHeader className="p-8 pb-4">
          <DrawerTitle className="text-3xl font-semibold tracking-tight text-ink">
            {PAGE.customers.profile.editCta}
          </DrawerTitle>
          <p className="mt-2 text-xs font-medium text-zinc-500">
            {PAGE.customers.profile.editSubtitle}
          </p>
        </DrawerHeader>

        <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-8 p-8 pt-2">
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <RiUser3Line size={14} className="text-gold" />
              {PAGE.customers.columns.identity}
            </Label>
            <Input
              placeholder={ph.name}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <RiMailLine size={14} className="text-gold" />
                Email
              </Label>
              <Input
                type="email"
                placeholder={ph.email}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <RiPhoneLine size={14} className="text-gold" />
                Phone
              </Label>
              <PhoneInput
                placeholder={ph.phone}
                value={formData.phone}
                onChange={(value) => setFormData({ ...formData, phone: value })}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <RiMapPinLine size={14} className="text-gold" />
              {PAGE.customers.columns.location}
            </Label>
            <Input
              placeholder={ph.city}
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <RiShareLine size={14} className="text-gold" />
              {PAGE.customers.profile.leadSource}
            </Label>
            <UniversalSelect
              value={formData.leadSource}
              onChange={(value) => setFormData({ ...formData, leadSource: value })}
              options={LEAD_SOURCE_OPTIONS}
              placeholder={ph.leadSource}
              enableSearch={false}
            />
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <RiMoneyRupeeCircleLine size={14} className="text-gold" />
                Deal Price (₹)
              </Label>
              <Input
                type="text"
                placeholder="e.g. ₹ 50,00,000"
                value={(() => {
                  if (!formData.dealValue) return '';
                  const parsed = parseInt(formData.dealValue, 10);
                  if (isNaN(parsed)) return formData.dealValue;
                  return `₹ ${new Intl.NumberFormat('en-IN').format(parsed)}`;
                })()}
                onChange={(e) => {
                  const numeric = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, dealValue: numeric });
                }}
              />
            </div>
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <RiCalendarCheckLine size={14} className="text-gold" />
                Follow-up Date
              </Label>
              <DatePicker
                value={formData.followUpDate ? new Date(formData.followUpDate) : undefined}
                onChange={(d) => setFormData({ ...formData, followUpDate: d ? format(d, 'yyyy-MM-dd') : '' })}
                placeholder="Select date"
                minDate={new Date()}
              />
            </div>
          </div>

        </form>
      </div>

      <footer className="shrink-0 border-t border-stone-alt bg-white p-6 flex justify-end">
        <Button type="submit" form={FORM_ID} className="bg-ink hover:bg-gold text-white text-xs font-semibold rounded-lg h-10 px-6 transition-all flex items-center gap-2" loading={isSubmitting}>
          {PAGE.customers.profile.saveProfile}
          <RiArrowRightLine size={16} />
        </Button>
      </footer>
    </>
  );
}

export function EditCustomerModal({ customer, isOpen, onClose }: EditCustomerModalProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="right" repositionInputs={false}>
      <DrawerContent className="flex h-full w-full flex-col rounded-lg border-s border-stone-alt bg-white outline-none sm:w-[500px]">
        {isOpen ? (
          <EditCustomerForm key={customer.id} customer={customer} onClose={onClose} />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
