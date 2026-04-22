from datetime import datetime, timezone
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def enum_values(enum_cls: type[StrEnum]) -> list[str]:
    return [item.value for item in enum_cls]


class ProjectStatus(StrEnum):
    active = "active"
    blocked = "blocked"
    done = "done"
    on_hold = "on-hold"


class ActionKind(StrEnum):
    next_action = "next_action"
    supporting = "supporting"


class ActionStatus(StrEnum):
    open = "open"
    done = "done"


class InboxStatus(StrEnum):
    new = "new"
    clarified = "clarified"
    archived = "archived"


class FollowUpStatus(StrEnum):
    pending = "pending"
    resolved = "resolved"


class ReferenceType(StrEnum):
    person = "person"
    team = "team"
    service = "service"
    document = "document"


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus, name="project_status", values_callable=enum_values), default=ProjectStatus.active)
    current_next_action_id: Mapped[UUID | None] = mapped_column(PgUUID(as_uuid=True), ForeignKey("project_actions.id"), nullable=True)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    blocked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    actions: Mapped[list["ProjectAction"]] = relationship(
        "ProjectAction",
        foreign_keys="ProjectAction.project_id",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    current_next_action: Mapped["ProjectAction | None"] = relationship(
        "ProjectAction",
        foreign_keys=[current_next_action_id],
        post_update=True,
    )
    follow_ups: Mapped[list["FollowUp"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    reference_links: Mapped[list["ProjectReferenceLink"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class ProjectAction(Base):
    __tablename__ = "project_actions"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("projects.id"), index=True)
    user_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    kind: Mapped[ActionKind] = mapped_column(Enum(ActionKind, name="action_kind", values_callable=enum_values), default=ActionKind.next_action)
    status: Mapped[ActionStatus] = mapped_column(Enum(ActionStatus, name="action_status", values_callable=enum_values), default=ActionStatus.open)
    source: Mapped[str] = mapped_column(String(64), default="manual")
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    project: Mapped[Project] = relationship("Project", foreign_keys=[project_id], back_populates="actions")


class InboxItem(Base):
    __tablename__ = "inbox_items"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True)
    source: Mapped[str] = mapped_column(String(64), default="manual")
    raw_text: Mapped[str] = mapped_column(Text)
    status: Mapped[InboxStatus] = mapped_column(Enum(InboxStatus, name="inbox_status", values_callable=enum_values), default=InboxStatus.new)
    clarified_as: Mapped[str | None] = mapped_column(String(64), nullable=True)
    clarified_project_id: Mapped[UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)
    clarified_action_id: Mapped[UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)
    clarified_follow_up_id: Mapped[UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)
    clarified_reference_id: Mapped[UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class FollowUp(Base):
    __tablename__ = "follow_ups"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("projects.id"), index=True)
    user_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True)
    status: Mapped[FollowUpStatus] = mapped_column(Enum(FollowUpStatus, name="follow_up_status", values_callable=enum_values), default=FollowUpStatus.pending)
    waiting_on_type: Mapped[str] = mapped_column(String(64))
    waiting_on_label: Mapped[str] = mapped_column(String(255))
    reason: Mapped[str] = mapped_column(Text)
    return_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    suggested_action_text: Mapped[str | None] = mapped_column(Text)
    last_ping_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    project: Mapped[Project] = relationship(back_populates="follow_ups")


class ReferenceEntity(Base):
    __tablename__ = "reference_entities"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True)
    type: Mapped[ReferenceType] = mapped_column(Enum(ReferenceType, name="reference_type", values_callable=enum_values))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    project_links: Mapped[list["ProjectReferenceLink"]] = relationship(back_populates="reference_entity", cascade="all, delete-orphan")


class ProjectReferenceLink(Base):
    __tablename__ = "project_reference_links"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("projects.id"), index=True)
    reference_entity_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("reference_entities.id"), index=True)
    role: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    project: Mapped[Project] = relationship(back_populates="reference_links")
    reference_entity: Mapped[ReferenceEntity] = relationship(back_populates="project_links")


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True)
    entity_type: Mapped[str] = mapped_column(String(64), index=True)
    entity_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), index=True)
    event_type: Mapped[str] = mapped_column(String(128))
    payload_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
