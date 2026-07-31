'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { RiArrowRightSLine } from 'react-icons/ri';
import { cn } from '@/lib/utils';

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  children,
  className,
}: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className={cn('space-y-5', className)}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-xs font-medium text-zinc-400">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.label} className="flex items-center gap-1">
              {i > 0 && <RiArrowRightSLine className="text-zinc-300" size={14} />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-gold transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-zinc-600">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <motion.div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <motion.div className="space-y-3">
          <h1 className="text-3xl lg:text-4xl font-semibold text-ink tracking-tight">
            {title}
            <span className="text-gold">.</span>
          </h1>
          {description && (
            <p className="text-sm text-zinc-500 font-medium max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
          <motion.div
            className="h-px w-14 bg-gold"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            style={{ originX: 0 }}
          />
        </motion.div>
        {children && <motion.div className="flex shrink-0 items-center gap-3">{children}</motion.div>}
      </motion.div>
    </motion.header>
  );
}
