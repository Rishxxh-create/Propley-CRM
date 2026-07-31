'use client';

import { useState } from 'react';
import {
  RiCloseLine,
  RiUser3Line,
  RiMailLine,
  RiPhoneLine,
  RiMapPinLine,
  RiArrowRightLine,
  RiInformationLine,
  RiShareLine,
  RiLoader4Line,
} from 'react-icons/ri';
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
import { LEAD_SOURCE_OPTIONS } from '@/lib/lead-source-options';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';
import { addCustomer } from '@/lib/customers-store';
import { addClientNote } from '@/lib/client-notes';
import { getCurrentAdvisorId } from '@/lib/current-advisor';
import { toast } from '@/lib/toast';
import { PAGE } from '@/lib/copy';

const FORM_ID = 'add-client-form';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

const emptyForm = () => ({
  name: '',
  email: '',
  phone: '',
  city: '',
  leadSource: '',
});

export default function AddCustomerModal({ isOpen, onClose, onAdded }: AddCustomerModalProps) {
  const user = useAppSelector(selectAuthUser);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ph = PAGE.customers.addDrawer.placeholders;

  const phoneLength = formData.phone.trim().length;
  const isFormValid = formData.name.trim() !== '' && formData.email.trim() !== '' && phoneLength >= 10 && phoneLength <= 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const customer = await addCustomer({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        city: formData.city.trim() || '—',
        assignedAdvisorId: user ? String(user.id) : getCurrentAdvisorId(),
        leadSource: formData.leadSource || undefined,
      });
      toast.customerAdded();
      onAdded?.();
      onClose();
      setFormData(emptyForm());
    } catch {
      toast.error('Could not add client');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="right" repositionInputs={false}>
      <DrawerContent className="flex h-full w-full flex-col rounded-lg border-s border-stone-alt bg-white outline-none sm:w-[500px]">
        <DrawerClose asChild>
          <button
            type="button"
            className="absolute top-4 right-4 z-50 flex h-8 w-8 items-center justify-center text-zinc-400 transition-colors hover:text-ink"
            aria-label="Close"
          >
            <RiCloseLine size={24} />
          </button>
        </DrawerClose>

        <form id={FORM_ID} onSubmit={handleSubmit} className="flex h-full flex-col min-h-0">
          <div className="custom-scrollbar flex-1 overflow-y-auto">
            <DrawerHeader className="p-8 pb-4">
              <DrawerTitle className="text-3xl font-semibold tracking-tight text-ink">
                {PAGE.customers.addCta}
              </DrawerTitle>
              <p className="mt-2 text-xs font-medium text-zinc-500">{PAGE.customers.subtitle}</p>
            </DrawerHeader>

            <div className="space-y-8 p-8 pt-2">
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
                  autoComplete="name"
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
                    autoComplete="email"
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
                    autoComplete="tel"
                    minLength={10}
                    maxLength={20}
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
                  autoComplete="address-level2"
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




            </div>
          </div>

          <footer className="shrink-0 border-t border-stone-alt bg-white p-6 flex justify-end">
            <Button
              type="submit"
              className="bg-ink hover:bg-gold text-white text-xs font-semibold rounded-lg h-10 px-6 transition-all flex items-center gap-2"
              loading={isSubmitting}
              disabled={!isFormValid || isSubmitting}
            >
              {PAGE.customers.addDrawer.registerCta}
              <RiArrowRightLine size={16} />
            </Button>
          </footer>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
