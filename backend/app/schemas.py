from datetime import date, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models import ActionKind, ActionStatus, FollowUpStatus, InboxStatus, ProjectStatus, ReferenceType


class ProjectCreate(BaseModel):
    title: str
    description: str | None = None


class ProjectPatch(BaseModel):
    title: str | None = None
    description: str | None = None


class NextActionCreate(BaseModel):
    title: str
    description: str | None = None
    due_at: datetime | None = None


class ProjectActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    title: str
    description: str | None = None
    kind: ActionKind
    status: ActionStatus
    due_at: datetime | None = None
    completed_at: datetime | None = None


class CurrentNextAction(BaseModel):
    id: UUID
    title: str
    status: ActionStatus
    kind: ActionKind


class ProjectListItem(BaseModel):
    id: UUID
    title: str
    status: ProjectStatus
    current_next_action: CurrentNextAction | None = None
    last_activity_at: datetime
    attention_state: str = "none"


class ProjectListOut(BaseModel):
    items: list[ProjectListItem]
    total: int


class FollowUpOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: FollowUpStatus
    waiting_on_type: str
    waiting_on_label: str
    reason: str
    return_at: datetime
    suggested_action_text: str | None = None
    last_ping_at: datetime | None = None


class ReferenceEntityOut(BaseModel):
    id: UUID
    type: ReferenceType
    title: str
    description: str | None = None
    url: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ActivityEventOut(BaseModel):
    id: UUID
    event_type: str
    created_at: datetime
    payload: dict[str, Any] = Field(default_factory=dict)


class ProjectDetailOut(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    status: ProjectStatus
    current_next_action: CurrentNextAction | None = None
    follow_up: FollowUpOut | None = None
    reference_entities: list[ReferenceEntityOut] = Field(default_factory=list)
    activity: list[ActivityEventOut] = Field(default_factory=list)
    last_activity_at: datetime
    created_at: datetime
    updated_at: datetime


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None = None
    status: ProjectStatus
    current_next_action_id: UUID | None = None
    last_activity_at: datetime
    created_at: datetime
    updated_at: datetime


class InboxItemCreate(BaseModel):
    source: str = "manual"
    raw_text: str


class InboxItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source: str
    raw_text: str
    status: InboxStatus
    captured_at: datetime
    clarified_as: str | None = None


class InboxListOut(BaseModel):
    items: list[InboxItemOut]
    total: int


class InboxClarifyRequest(BaseModel):
    target_type: Literal["project", "next_action", "follow_up", "reference", "archive"]
    payload: dict[str, Any] = Field(default_factory=dict)


class InboxClarifyOut(BaseModel):
    inbox_item_id: UUID
    status: InboxStatus
    clarified_as: str
    result_id: UUID | None = None


class BlockProjectRequest(BaseModel):
    waiting_on_type: str
    waiting_on_label: str
    reason: str
    return_at: datetime
    suggested_action_text: str | None = None


class BlockProjectOut(BaseModel):
    project_id: UUID
    project_status: ProjectStatus
    follow_up: FollowUpOut


class UnblockProjectRequest(BaseModel):
    new_next_action_title: str


class UnblockProjectOut(BaseModel):
    project_id: UUID
    project_status: ProjectStatus
    current_next_action: CurrentNextAction


class FollowUpListItem(BaseModel):
    id: UUID
    project_id: UUID
    project_title: str
    state: Literal["overdue", "due_today", "upcoming"]
    waiting_on_label: str
    reason: str
    return_at: datetime
    suggested_action_text: str | None = None


class FollowUpListOut(BaseModel):
    items: list[FollowUpListItem]


class RescheduleFollowUpRequest(BaseModel):
    return_at: datetime


class TodayAction(BaseModel):
    type: str
    label: str


class TodayItem(BaseModel):
    project_id: UUID
    project_title: str
    reason_label: str | None = None
    action_id: UUID | None = None
    action_title: str | None = None
    primary_action: TodayAction | None = None


class TodaySection(BaseModel):
    type: str
    title: str
    items: list[TodayItem]


class TodaySummary(BaseModel):
    needs_attention_count: int
    overdue_follow_ups_count: int
    missing_next_action_count: int
    stale_projects_count: int
    new_inbox_count: int


class TodayOut(BaseModel):
    summary: TodaySummary
    sections: list[TodaySection]


class WeeklyReviewItem(BaseModel):
    project_id: UUID
    project_title: str
    summary: str


class WeeklyReviewSection(BaseModel):
    type: str
    items: list[WeeklyReviewItem]


class WeeklyReviewSummary(BaseModel):
    moved_projects: int
    blocked_projects: int
    stale_projects: int


class WeeklyReviewOut(BaseModel):
    week_start: date
    summary: WeeklyReviewSummary
    sections: list[WeeklyReviewSection]


class WeeklyReviewCompleteOut(BaseModel):
    week_start: date
    status: str


class ReferenceCreate(BaseModel):
    type: ReferenceType
    title: str
    description: str | None = None
    url: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ReferenceListOut(BaseModel):
    items: list[ReferenceEntityOut]
    total: int


class ReferenceLinkCreate(BaseModel):
    reference_entity_id: UUID
    role: str | None = None


class ReferenceLinkOut(BaseModel):
    id: UUID
    project_id: UUID
    reference_entity_id: UUID
    role: str | None = None


class ActivityListOut(BaseModel):
    items: list[ActivityEventOut]
