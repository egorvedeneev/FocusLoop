"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-04 08:49:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


project_status = postgresql.ENUM("active", "blocked", "done", "on-hold", name="project_status", create_type=False)
action_kind = postgresql.ENUM("next_action", "supporting", name="action_kind", create_type=False)
action_status = postgresql.ENUM("open", "done", name="action_status", create_type=False)
inbox_status = postgresql.ENUM("new", "clarified", "archived", name="inbox_status", create_type=False)
follow_up_status = postgresql.ENUM("pending", "resolved", name="follow_up_status", create_type=False)
reference_type = postgresql.ENUM("person", "team", "service", "document", name="reference_type", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    project_status.create(bind, checkfirst=True)
    action_kind.create(bind, checkfirst=True)
    action_status.create(bind, checkfirst=True)
    inbox_status.create(bind, checkfirst=True)
    follow_up_status.create(bind, checkfirst=True)
    reference_type.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", project_status, nullable=False),
        sa.Column("current_next_action_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("blocked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_projects_user_id", "projects", ["user_id"])

    op.create_table(
        "project_actions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("kind", action_kind, nullable=False),
        sa.Column("status", action_status, nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_project_actions_project_id", "project_actions", ["project_id"])
    op.create_index("ix_project_actions_user_id", "project_actions", ["user_id"])
    op.create_foreign_key(
        "fk_projects_current_next_action_id",
        "projects",
        "project_actions",
        ["current_next_action_id"],
        ["id"],
    )

    op.create_table(
        "inbox_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("status", inbox_status, nullable=False),
        sa.Column("clarified_as", sa.String(length=64), nullable=True),
        sa.Column("clarified_project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("clarified_action_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("clarified_follow_up_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("clarified_reference_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_inbox_items_user_id", "inbox_items", ["user_id"])

    op.create_table(
        "follow_ups",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", follow_up_status, nullable=False),
        sa.Column("waiting_on_type", sa.String(length=64), nullable=False),
        sa.Column("waiting_on_label", sa.String(length=255), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("return_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("suggested_action_text", sa.Text(), nullable=True),
        sa.Column("last_ping_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_follow_ups_project_id", "follow_ups", ["project_id"])
    op.create_index("ix_follow_ups_user_id", "follow_ups", ["user_id"])

    op.create_table(
        "reference_entities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", reference_type, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("url", sa.String(length=2048), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_reference_entities_user_id", "reference_entities", ["user_id"])

    op.create_table(
        "project_reference_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("reference_entity_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("reference_entities.id"), nullable=False),
        sa.Column("role", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_project_reference_links_project_id", "project_reference_links", ["project_id"])
    op.create_index("ix_project_reference_links_reference_entity_id", "project_reference_links", ["reference_entity_id"])

    op.create_table(
        "activity_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=128), nullable=False),
        sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_activity_events_user_id", "activity_events", ["user_id"])
    op.create_index("ix_activity_events_entity_type", "activity_events", ["entity_type"])
    op.create_index("ix_activity_events_entity_id", "activity_events", ["entity_id"])


def downgrade() -> None:
    op.drop_table("activity_events")
    op.drop_table("project_reference_links")
    op.drop_table("reference_entities")
    op.drop_table("follow_ups")
    op.drop_table("inbox_items")
    op.drop_constraint("fk_projects_current_next_action_id", "projects", type_="foreignkey")
    op.drop_table("project_actions")
    op.drop_table("projects")
    op.drop_table("users")
    reference_type.drop(op.get_bind(), checkfirst=True)
    follow_up_status.drop(op.get_bind(), checkfirst=True)
    inbox_status.drop(op.get_bind(), checkfirst=True)
    action_status.drop(op.get_bind(), checkfirst=True)
    action_kind.drop(op.get_bind(), checkfirst=True)
    project_status.drop(op.get_bind(), checkfirst=True)
