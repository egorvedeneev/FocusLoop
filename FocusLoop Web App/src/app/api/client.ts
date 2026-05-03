const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export type ReferenceType = "person" | "team" | "service" | "document";
export type ProjectStatus = "active" | "blocked" | "done" | "on-hold";

export type ReferenceEntity = {
  id: string;
  type: ReferenceType;
  title: string;
  description?: string | null;
  url?: string | null;
  metadata: Record<string, unknown>;
};

export type CurrentNextAction = {
  id: string;
  title: string;
  status: "open" | "done";
  kind: "next_action" | "supporting";
  due_at?: string | null;
};

export type FollowUp = {
  id: string;
  status: "pending" | "resolved";
  waiting_on_type: string;
  waiting_on_label: string;
  reason: string;
  return_at: string;
  suggested_action_text?: string | null;
  last_ping_at?: string | null;
};

export type ProjectListItem = {
  id: string;
  title: string;
  status: ProjectStatus;
  current_next_action?: CurrentNextAction | null;
  last_activity_at: string;
  attention_state: string;
};

export type ProjectDetail = {
  id: string;
  title: string;
  description?: string | null;
  status: ProjectStatus;
  current_next_action?: CurrentNextAction | null;
  follow_up?: FollowUp | null;
  reference_entities: ReferenceEntity[];
  activity: ActivityEvent[];
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

export type InboxItem = {
  id: string;
  source: string;
  raw_text: string;
  status: "new" | "clarified" | "archived";
  captured_at: string;
  clarified_as?: string | null;
};

export type FollowUpListItem = {
  id: string;
  project_id: string;
  project_title: string;
  state: "overdue" | "due_today" | "upcoming";
  waiting_on_label: string;
  reason: string;
  return_at: string;
  suggested_action_text?: string | null;
};

export type TodaySection = {
  type: string;
  title: string;
  items: Array<{
    project_id: string;
    project_title: string;
    reason_label?: string | null;
    action_id?: string | null;
    action_title?: string | null;
  }>;
};

export type TodayPayload = {
  summary: {
    needs_attention_count: number;
    overdue_follow_ups_count: number;
    missing_next_action_count: number;
    stale_projects_count: number;
    new_inbox_count: number;
  };
  sections: TodaySection[];
};

export type WeeklyReviewPayload = {
  week_start: string;
  summary: {
    moved_projects: number;
    blocked_projects: number;
    stale_projects: number;
  };
  sections: Array<{
    type: string;
    items: Array<{ project_id: string; project_title: string; summary: string }>;
  }>;
};

export type ActivityEvent = {
  id: string;
  event_type: string;
  created_at: string;
  payload: Record<string, unknown>;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error?.message ?? `Request failed with ${response.status}`;
    throw new Error(message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  if (!text.trim()) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export const api = {
  today: () => request<TodayPayload>("/today"),
  projects: (status?: ProjectStatus) => request<{ items: ProjectListItem[]; total: number }>(`/projects${status ? `?status=${status}` : ""}`),
  project: (id: string) => request<ProjectDetail>(`/projects/${id}`),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: "DELETE" }),
  setNextAction: (projectId: string, data: { title: string; description?: string; due_at?: string | null }) =>
    request<CurrentNextAction & { project_id: string }>(`/projects/${projectId}/next-action`, { method: "POST", body: JSON.stringify(data) }),
  completeAction: (actionId: string) => request(`/project-actions/${actionId}/complete`, { method: "POST" }),
  blockProject: (projectId: string, data: { waiting_on_type: string; waiting_on_label: string; reason: string; return_at: string; suggested_action_text?: string }) =>
    request(`/projects/${projectId}/block`, { method: "POST", body: JSON.stringify(data) }),
  unblockProject: (projectId: string, new_next_action_title: string) =>
    request(`/projects/${projectId}/unblock`, { method: "POST", body: JSON.stringify({ new_next_action_title }) }),
  inboxItems: (status = "new") => request<{ items: InboxItem[]; total: number }>(`/inbox-items?status=${status}`),
  createInboxItem: (raw_text: string) => request<InboxItem>("/inbox-items", { method: "POST", body: JSON.stringify({ source: "manual", raw_text }) }),
  clarifyInboxItem: (id: string, target_type: string, payload: Record<string, unknown> = {}) =>
    request(`/inbox-items/${id}/clarify`, { method: "POST", body: JSON.stringify({ target_type, payload }) }),
  archiveInboxItem: (id: string) => request(`/inbox-items/${id}/archive`, { method: "POST" }),
  followUps: (state?: string) => request<{ items: FollowUpListItem[] }>(`/follow-ups${state ? `?state=${state}` : ""}`),
  rescheduleFollowUp: (id: string, return_at: string) => request<FollowUp>(`/follow-ups/${id}/reschedule`, { method: "POST", body: JSON.stringify({ return_at }) }),
  weeklyReview: () => request<WeeklyReviewPayload>("/reviews/weekly"),
  references: (type?: ReferenceType) => request<{ items: ReferenceEntity[]; total: number }>(`/reference${type ? `?type=${type}` : ""}`),
  createReference: (data: { type: ReferenceType; title: string; description?: string; metadata?: Record<string, unknown> }) =>
    request<ReferenceEntity>("/reference", { method: "POST", body: JSON.stringify({ ...data, metadata: data.metadata ?? {} }) }),
};
