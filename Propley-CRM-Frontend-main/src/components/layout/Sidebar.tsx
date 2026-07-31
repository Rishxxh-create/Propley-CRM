"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiCloseLine,
  RiLogoutBoxRLine,
  RiArrowDownSLine,
} from "react-icons/ri";
import { cn } from "@/lib/utils";
import { CRM_NAV, type NavItem } from "@/lib/navigation";
import { APP } from "@/lib/copy";
import { clearAuthSession } from "@/lib/auth-session";
import { CurrentUserChip } from "@/components/layout/CurrentUserChip";
import { PropleyLogo } from "@/components/PropleyLogo";
import { UniversalSelect } from "@/components/UniversalSelect";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuthUser } from "@/store/slices/authSlice";
import { clearEventStats } from "@/store/slices/eventsSlice";
import { clearMeetings } from "@/store/slices/meetingsSlice";
import { fetchProjectsThunk } from "@/store/slices/projectsThunks";
import { selectProjects, selectSelectedProjectId, selectProjectsStatus } from "@/store/selectors/projectsSelectors";
import { setSelectedProject } from "@/store/slices/projectsSlice";
import { useEffect } from "react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Presentations registry + wizard/detail routes — not the calendar sub-route */
function isPresentationsRoute(pathname: string): boolean {
  if (pathname === "/meetings") return true;
  if (!pathname.startsWith("/meetings/")) return false;
  if (
    pathname === "/meetings/calendar" ||
    pathname.startsWith("/meetings/calendar/")
  ) {
    return false;
  }
  return true;
}

function isCalendarRoute(pathname: string): boolean {
  return (
    pathname === "/meetings/calendar" ||
    pathname.startsWith("/meetings/calendar/")
  );
}

function isLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/meetings") return isPresentationsRoute(pathname);
  if (href === "/meetings/calendar") return isCalendarRoute(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

function itemHasActiveChild(pathname: string, item: NavItem) {
  if (item.href && isLinkActive(pathname, item.href)) return true;
  return item.children?.some((c) => isLinkActive(pathname, c.href)) ?? false;
}

function expandedGroupsForPath(pathname: string): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  CRM_NAV.forEach((section) => {
    section.items.forEach((item) => {
      if (item.children && itemHasActiveChild(pathname, item)) {
        next[item.id] = true;
      }
    });
  });
  return next;
}

export default function Sidebar({
  isOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [signingOut, setSigningOut] = useState(false);

  const projects = useAppSelector(selectProjects);
  const selectedProjectId = useAppSelector(selectSelectedProjectId);
  const projectsStatus = useAppSelector(selectProjectsStatus);

  useEffect(() => {
    if (projectsStatus === "idle") {
      void dispatch(fetchProjectsThunk());
    }
  }, [dispatch, projectsStatus]);

  const projectOptions = useMemo(
    () => projects.map((p) => ({ id: p.id, name: p.name })),
    [projects]
  );

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await clearAuthSession();
      dispatch(clearAuthUser());
      dispatch(clearEventStats());
      dispatch(clearMeetings());
      router.replace("/auth");
    } finally {
      setSigningOut(false);
    }
  }

  const pathnameExpanded = useMemo(
    () => expandedGroupsForPath(pathname),
    [pathname],
  );

  const mergedExpanded = useMemo(
    () => ({ ...expanded, ...pathnameExpanded }),
    [expanded, pathnameExpanded],
  );

  const toggleGroup = (id: string) => {
    setExpanded((prev) => {
      const current = { ...prev, ...pathnameExpanded };
      return { ...prev, [id]: !current[id] };
    });
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[50] bg-ink/40 backdrop-blur-md lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed lg:relative z-[60] flex h-full w-[272px] flex-col border-r border-stone-alt bg-ivory",
          "transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="relative shrink-0 border-b border-stone-alt px-6 pt-7 pb-4">
          <Link href="/" onClick={onClose} className="block select-none mb-4">
            <PropleyLogo size="md" priority />
            <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">
              {APP.productLabel}
            </p>
          </Link>
          
          <div className="w-full bg-ivory">
            <UniversalSelect
              value={selectedProjectId ?? ""}
              onChange={(val) => dispatch(setSelectedProject(val))}
              options={projectOptions}
              placeholder="Select project"
              searchPlaceholder="Search projects..."
              emptyMessage="No projects found."
              enableSearch={false}
              className="mt-2"
            />
          </div>

          <button
            type="button"
            className="absolute right-4 top-6 text-zinc-400 hover:text-ink lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <RiCloseLine size={22} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-5">
          {CRM_NAV.map((section) => (
            <motion.div key={section.id} className="mb-7 last:mb-2">
              <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <NavRow
                    key={item.id}
                    item={item}
                    pathname={pathname}
                    expanded={!!mergedExpanded[item.id]}
                    onToggle={() => toggleGroup(item.id)}
                    onClose={onClose}
                  />
                ))}
              </ul>
            </motion.div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-stone-alt p-4">
          <div className="mb-3 flex items-center gap-3 px-2 py-2">
            <CurrentUserChip />
          </div>

          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-alt bg-stone py-3 text-xs font-semibold text-zinc-500 transition-colors hover:border-gold/30 hover:text-ink disabled:opacity-50"
          >
            <RiLogoutBoxRLine size={16} />
            {APP.signOut}
          </button>
        </div>
      </aside>
    </>
  );
}

function NavRow({
  item,
  pathname,
  expanded,
  onToggle,
  onClose,
}: {
  item: NavItem;
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const hasChildren = !!item.children?.length;
  const isActive = item.href
    ? isLinkActive(pathname, item.href)
    : itemHasActiveChild(pathname, item);

  if (item.action === "new-meeting") {
    const scheduleActive = pathname === '/meetings/new' || pathname.startsWith('/meetings/new?');
    return (
      <li>
        <Link
          href="/meetings/new"
          onClick={onClose}
          className={cn(
            'group flex w-full items-center gap-3 border px-3 py-2.5 text-left transition-all cursor-pointer',
            scheduleActive
              ? 'border-gold bg-gold/5 text-ink'
              : 'border-dashed border-stone-alt hover:border-gold/50 hover:bg-gold/5'
          )}
        >
          <item.icon className="text-lg text-gold transition-transform group-hover:scale-110" />
          <span className="text-sm font-semibold text-ink group-hover:text-gold">
            {item.label}
          </span>
        </Link>
      </li>
    );
  }

  if (hasChildren) {
    return (
      <li>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
            isActive
              ? "bg-stone text-ink"
              : "text-zinc-600 hover:bg-stone/60 hover:text-ink",
          )}
        >
          <item.icon
            className={cn(
              "text-lg transition-colors",
              isActive ? "text-gold" : "text-zinc-400 group-hover:text-gold",
            )}
          />
          <span className="flex-1 text-sm font-medium">{item.label}</span>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="text-zinc-400"
          >
            <RiArrowDownSLine size={18} />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden border-l border-stone-alt ml-5 pl-2"
            >
              {item.children!.map((child) => {
                const childActive = !child.comingSoon && isLinkActive(pathname, child.href);

                if (child.comingSoon) {
                  return (
                    <li key={child.href}>
                      <span
                        className="relative flex items-center gap-2 py-2.5 pl-3 pr-2 text-sm font-medium text-zinc-400 cursor-not-allowed select-none"
                        title="Coming soon"
                      >
                        {child.label}
                        <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-gold/70">
                          Soon
                        </span>
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      onClick={onClose}
                      className={cn(
                        "relative flex items-center gap-2 py-2.5 pl-3 pr-2 text-sm transition-colors",
                        childActive
                          ? "font-semibold text-ink"
                          : "font-medium text-zinc-500 hover:text-gold",
                      )}
                    >
                      {childActive && (
                        <motion.span
                          layoutId="sidebar-active-pip"
                          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 bg-gold"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 32,
                          }}
                        />
                      )}
                      {child.label}
                      {child.badge && (
                        <span className="ml-auto text-[10px] font-semibold text-gold">
                          {child.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href!}
        onClick={onClose}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 transition-colors",
          isActive
            ? "bg-stone text-ink"
            : "text-zinc-600 hover:bg-stone/60 hover:text-ink",
        )}
      >
        {isActive && (
          <motion.span
            layoutId="sidebar-active-bar"
            className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 bg-gold"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        )}
        <item.icon
          className={cn(
            "text-lg",
            isActive ? "text-gold" : "text-zinc-400 group-hover:text-gold",
          )}
        />
        <span className="text-sm font-medium">{item.label}</span>
      </Link>
    </li>
  );
}
