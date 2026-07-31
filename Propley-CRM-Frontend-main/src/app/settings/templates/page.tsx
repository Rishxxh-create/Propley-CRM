'use client';

import { useState, useSyncExternalStore } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { InviteTemplatesWorkspace } from '@/components/settings/InviteTemplatesWorkspace';
import {
  readInviteTemplates,
  subscribeInviteTemplates,
  updateProjectTemplate,
  type ProjectInviteTemplate,
} from '@/lib/invite-templates-store';
import { toast } from '@/lib/toast';
import { PAGE } from '@/lib/copy';

export default function TemplatesPage() {
  const store = useSyncExternalStore(
    subscribeInviteTemplates,
    readInviteTemplates,
    readInviteTemplates
  );
  const [projectId, setProjectId] = useState(store.byProject[0]?.projectId ?? '');
  const [draft, setDraft] = useState<ProjectInviteTemplate | null>(null);

  const current =
    draft ??
    store.byProject.find((t) => t.projectId === projectId) ??
    store.byProject[0];

  const options = store.byProject.map((t) => ({
    id: t.projectId,
    name: t.projectName,
    subtitle: PAGE.templates.project,
  }));

  const loadProject = (id: string) => {
    setProjectId(id);
    const tpl = store.byProject.find((t) => t.projectId === id);
    if (tpl) setDraft({ ...tpl });
  };

  const handleSave = () => {
    if (!current) return;
    updateProjectTemplate(current.projectId, {
      email: current.email,
      rescheduleEmail: current.rescheduleEmail,
      whatsapp: current.whatsapp,
    });
    setDraft(null);
    toast.success(PAGE.templates.saved);
  };

  if (!current) {
    return (
      <DashboardLayout>
        <p className="text-sm text-zinc-500">No projects configured.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-16">
        <PageHeader title={PAGE.templates.title} description={PAGE.templates.subtitle} />
        <InviteTemplatesWorkspace
          current={current}
          projectId={projectId}
          options={options}
          onProjectChange={loadProject}
          onDraftChange={setDraft}
          onSave={handleSave}
        />
      </div>
    </DashboardLayout>
  );
}
