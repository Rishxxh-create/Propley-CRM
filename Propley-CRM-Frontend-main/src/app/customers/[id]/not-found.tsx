import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PAGE } from '@/lib/copy';

export default function CustomerNotFound() {
  return (
    <DashboardLayout activePath="/customers">
      <div className="space-y-6 py-20 text-center">
        <h1 className="text-2xl font-semibold text-ink">{PAGE.customers.profile.notFound}</h1>
        <Link href="/customers" className="text-sm font-semibold text-gold hover:text-gold-hover">
          {PAGE.customers.profile.back}
        </Link>
      </div>
    </DashboardLayout>
  );
}
