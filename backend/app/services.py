from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.errors import ApiError
from app.models import (
    ActionKind,
    ActionStatus,
    ActivityEvent,
    FollowUp,
    FollowUpStatus,
    InboxItem,
    InboxStatus,
    Project,
    ProjectAction,
    ProjectReferenceLink,
    ProjectStatus,
    ReferenceEntity,
    ReferenceType,
    User,
    now_utc,
)
from app import schemas


STALE_AFTER_DAYS = 7


def get_default_user(db: Session) -> User:
    settings = get_settings()
    user = db.scalar(select(User).where(User.email == settings.default_user_email))
    if user:
        return user
    user = User(email=settings.default_user_email, name=settings.default_user_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_project_or_404(db: Session, project_id: UUID) -> Project:
    project = db.scalar(
        select(Project)
        .options(
            selectinload(Project.actions),
            selectinload(Project.follow_ups),
            selectinload(Project.reference_links).selectinload(ProjectReferenceLink.reference_entity),
        )
        .where(Project.id == project_id)
    )
    if not project:
        raise ApiError("NOT_FOUND", "Project not found", 404)
    return project


def get_inbox_or_404(db: Session, inbox_item_id: UUID) -> InboxItem:
    item = db.get(InboxItem, inbox_item_id)
    if not item:
        raise ApiError("NOT_FOUND", "Inbox item not found", 404)
    return item


def get_follow_up_or_404(db: Session, follow_up_id: UUID) -> FollowUp:
    follow_up = db.get(FollowUp, follow_up_id)
    if not follow_up:
        raise ApiError("FOLLOW_UP_NOT_FOUND", "Follow-up not found", 404)
    return follow_up


def add_activity(db: Session, user_id: UUID, entity_type: str, entity_id: UUID, event_type: str, payload: dict[str, Any] | None = None) -> None:
    db.add(
        ActivityEvent(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            event_type=event_type,
            payload_json=payload or {},
        )
    )


def current_follow_up(project: Project) -> FollowUp | None:
    pending = [fu for fu in project.follow_ups if fu.status == FollowUpStatus.pending]
    if not pending:
        return None
    return sorted(pending, key=lambda fu: fu.return_at)[-1]


def to_current_action(action: ProjectAction | None) -> schemas.CurrentNextAction | None:
    if not action:
        return None
    return schemas.CurrentNextAction(id=action.id, title=action.title, status=action.status, kind=action.kind)


def to_follow_up(follow_up: FollowUp | None) -> schemas.FollowUpOut | None:
    if not follow_up:
        return None
    return schemas.FollowUpOut.model_validate(follow_up)


def to_reference(reference: ReferenceEntity) -> schemas.ReferenceEntityOut:
    return schemas.ReferenceEntityOut(
        id=reference.id,
        type=reference.type,
        title=reference.title,
        description=reference.description,
        url=reference.url,
        metadata=reference.metadata_json or {},
    )


def to_activity(event: ActivityEvent) -> schemas.ActivityEventOut:
    return schemas.ActivityEventOut(
        id=event.id,
        event_type=event.event_type,
        created_at=event.created_at,
        payload=event.payload_json or {},
    )


def attention_state(project: Project, today: datetime | None = None) -> str:
    today = today or now_utc()
    follow_up = current_follow_up(project)
    if project.status == ProjectStatus.blocked and follow_up:
        if follow_up.return_at.date() < today.date():
            return "overdue_follow_up"
        if follow_up.return_at.date() == today.date():
            return "returned_today"
    if project.status == ProjectStatus.active and not project.current_next_action:
        return "no_next_action"
    if project.status == ProjectStatus.active and project.last_activity_at < today - timedelta(days=STALE_AFTER_DAYS):
        return "stale_project"
    return "none"


def create_project(db: Session, data: schemas.ProjectCreate) -> Project:
    user = get_default_user(db)
    project = Project(user_id=user.id, title=data.title, description=data.description, status=ProjectStatus.active)
    db.add(project)
    db.flush()
    add_activity(db, user.id, "project", project.id, "project_created", {"title": project.title})
    db.commit()
    db.refresh(project)
    return project


def list_projects(db: Session, status: ProjectStatus | None = None) -> schemas.ProjectListOut:
    stmt = select(Project).options(selectinload(Project.actions), selectinload(Project.follow_ups)).order_by(Project.updated_at.desc())
    if status:
        stmt = stmt.where(Project.status == status)
    projects = list(db.scalars(stmt))
    items = [
        schemas.ProjectListItem(
            id=project.id,
            title=project.title,
            status=project.status,
            current_next_action=to_current_action(project.current_next_action),
            last_activity_at=project.last_activity_at,
            attention_state=attention_state(project),
        )
        for project in projects
    ]
    return schemas.ProjectListOut(items=items, total=len(items))


def project_detail(db: Session, project_id: UUID) -> schemas.ProjectDetailOut:
    project = get_project_or_404(db, project_id)
    events = list(
        db.scalars(
            select(ActivityEvent)
            .where(ActivityEvent.entity_type == "project", ActivityEvent.entity_id == project.id)
            .order_by(ActivityEvent.created_at.desc())
        )
    )
    return schemas.ProjectDetailOut(
        id=project.id,
        title=project.title,
        description=project.description,
        status=project.status,
        current_next_action=to_current_action(project.current_next_action),
        follow_up=to_follow_up(current_follow_up(project)),
        reference_entities=[to_reference(link.reference_entity) for link in project.reference_links],
        activity=[to_activity(event) for event in events],
        last_activity_at=project.last_activity_at,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


def patch_project(db: Session, project_id: UUID, data: schemas.ProjectPatch) -> Project:
    project = get_project_or_404(db, project_id)
    if data.title is not None:
        project.title = data.title
    if data.description is not None:
        project.description = data.description
    project.updated_at = now_utc()
    add_activity(db, project.user_id, "project", project.id, "project_updated", data.model_dump(exclude_none=True))
    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project_id: UUID) -> None:
    project = get_project_or_404(db, project_id)
    db.execute(
        delete(ActivityEvent).where(
            ActivityEvent.entity_type == "project",
            ActivityEvent.entity_id == project_id,
        )
    )
    project.current_next_action_id = None
    db.flush()
    db.delete(project)
    db.commit()


def set_next_action(db: Session, project_id: UUID, data: schemas.NextActionCreate, source: str = "manual") -> ProjectAction:
    project = get_project_or_404(db, project_id)
    if project.current_next_action:
        project.current_next_action.status = ActionStatus.done
        project.current_next_action.completed_at = now_utc()
    action = ProjectAction(
        project_id=project.id,
        user_id=project.user_id,
        title=data.title,
        description=data.description,
        due_at=data.due_at,
        kind=ActionKind.next_action,
        source=source,
    )
    db.add(action)
    db.flush()
    project.current_next_action_id = action.id
    project.status = ProjectStatus.active
    project.last_activity_at = now_utc()
    add_activity(db, project.user_id, "project", project.id, "next_action_set", {"action_id": str(action.id), "title": action.title})
    db.commit()
    db.refresh(action)
    return action


def complete_action(db: Session, action_id: UUID) -> ProjectAction:
    action = db.get(ProjectAction, action_id)
    if not action:
        raise ApiError("NOT_FOUND", "Project action not found", 404)
    action.status = ActionStatus.done
    action.completed_at = now_utc()
    action.project.last_activity_at = now_utc()
    if action.project.current_next_action_id == action.id:
        action.project.current_next_action_id = None
    add_activity(db, action.user_id, "project", action.project_id, "next_action_completed", {"action_id": str(action.id), "title": action.title})
    db.commit()
    db.refresh(action)
    return action


def list_project_actions(db: Session, project_id: UUID) -> list[ProjectAction]:
    get_project_or_404(db, project_id)
    return list(db.scalars(select(ProjectAction).where(ProjectAction.project_id == project_id).order_by(ProjectAction.created_at.desc())))


def create_inbox_item(db: Session, data: schemas.InboxItemCreate) -> InboxItem:
    user = get_default_user(db)
    item = InboxItem(user_id=user.id, source=data.source, raw_text=data.raw_text)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def list_inbox_items(db: Session, status: InboxStatus | None = None) -> schemas.InboxListOut:
    stmt = select(InboxItem).order_by(InboxItem.captured_at.desc())
    if status:
        stmt = stmt.where(InboxItem.status == status)
    items = list(db.scalars(stmt))
    return schemas.InboxListOut(items=items, total=len(items))


def clarify_inbox_item(db: Session, inbox_item_id: UUID, data: schemas.InboxClarifyRequest) -> schemas.InboxClarifyOut:
    item = get_inbox_or_404(db, inbox_item_id)
    if item.status != InboxStatus.new:
        raise ApiError("INBOX_ITEM_ALREADY_CLARIFIED", "Inbox item is already processed", 409)
    payload = data.payload
    result_id: UUID | None = None
    if data.target_type == "archive":
        item.status = InboxStatus.archived
        item.clarified_as = "archived"
    elif data.target_type == "project":
        project = create_project(
            db,
            schemas.ProjectCreate(
                title=payload.get("title") or item.raw_text[:80],
                description=payload.get("description"),
            ),
        )
        if payload.get("next_action_title"):
            set_next_action(db, project.id, schemas.NextActionCreate(title=payload["next_action_title"]), source="inbox")
        result_id = project.id
        item.clarified_project_id = project.id
        item.status = InboxStatus.clarified
        item.clarified_as = "project"
    elif data.target_type == "next_action":
        project_id = payload.get("project_id")
        if not project_id:
            raise ApiError("VALIDATION_ERROR", "project_id is required", 422)
        action = set_next_action(
            db,
            UUID(str(project_id)),
            schemas.NextActionCreate(title=payload.get("title") or item.raw_text, description=payload.get("description")),
            source="inbox",
        )
        result_id = action.id
        item.clarified_action_id = action.id
        item.status = InboxStatus.clarified
        item.clarified_as = "next_action"
    elif data.target_type == "follow_up":
        block = block_project(
            db,
            UUID(str(payload["project_id"])),
            schemas.BlockProjectRequest(
                waiting_on_type=payload.get("waiting_on_type", "person"),
                waiting_on_label=payload["waiting_on_label"],
                reason=payload.get("reason") or item.raw_text,
                return_at=payload["return_at"],
                suggested_action_text=payload.get("suggested_action_text"),
            ),
        )
        result_id = block.follow_up.id
        item.clarified_follow_up_id = block.follow_up.id
        item.status = InboxStatus.clarified
        item.clarified_as = "follow_up"
    elif data.target_type == "reference":
        reference = create_reference(
            db,
            schemas.ReferenceCreate(
                type=ReferenceType(payload.get("type", "document")),
                title=payload.get("title") or item.raw_text[:80],
                description=payload.get("description"),
                url=payload.get("url"),
                metadata=payload.get("metadata") or {},
            ),
        )
        result_id = reference.id
        item.clarified_reference_id = reference.id
        item.status = InboxStatus.clarified
        item.clarified_as = "reference"
    db.add(item)
    db.commit()
    return schemas.InboxClarifyOut(inbox_item_id=item.id, status=item.status, clarified_as=item.clarified_as or data.target_type, result_id=result_id)


def archive_inbox_item(db: Session, inbox_item_id: UUID) -> schemas.InboxClarifyOut:
    item = get_inbox_or_404(db, inbox_item_id)
    item.status = InboxStatus.archived
    item.clarified_as = "archived"
    db.commit()
    return schemas.InboxClarifyOut(inbox_item_id=item.id, status=item.status, clarified_as="archived")


def block_project(db: Session, project_id: UUID, data: schemas.BlockProjectRequest) -> schemas.BlockProjectOut:
    project = get_project_or_404(db, project_id)
    follow_up = FollowUp(
        project_id=project.id,
        user_id=project.user_id,
        waiting_on_type=data.waiting_on_type,
        waiting_on_label=data.waiting_on_label,
        reason=data.reason,
        return_at=data.return_at,
        suggested_action_text=data.suggested_action_text,
    )
    project.status = ProjectStatus.blocked
    project.blocked_at = now_utc()
    project.last_activity_at = now_utc()
    db.add(follow_up)
    db.flush()
    add_activity(db, project.user_id, "project", project.id, "project_blocked", {"follow_up_id": str(follow_up.id), "reason": follow_up.reason})
    db.commit()
    db.refresh(follow_up)
    return schemas.BlockProjectOut(project_id=project.id, project_status=project.status, follow_up=schemas.FollowUpOut.model_validate(follow_up))


def unblock_project(db: Session, project_id: UUID, data: schemas.UnblockProjectRequest) -> schemas.UnblockProjectOut:
    project = get_project_or_404(db, project_id)
    follow_up = current_follow_up(project)
    if follow_up:
        follow_up.status = FollowUpStatus.resolved
        follow_up.resolved_at = now_utc()
    action = set_next_action(db, project.id, schemas.NextActionCreate(title=data.new_next_action_title), source="unblock")
    project.status = ProjectStatus.active
    project.blocked_at = None
    add_activity(db, project.user_id, "project", project.id, "project_unblocked", {"action_id": str(action.id)})
    db.commit()
    return schemas.UnblockProjectOut(project_id=project.id, project_status=project.status, current_next_action=to_current_action(action))


def list_follow_ups(db: Session, state: str | None = None) -> schemas.FollowUpListOut:
    today = now_utc().date()
    rows = db.execute(
        select(FollowUp, Project.title)
        .join(Project, Project.id == FollowUp.project_id)
        .where(FollowUp.status == FollowUpStatus.pending)
        .order_by(FollowUp.return_at.asc())
    ).all()
    items: list[schemas.FollowUpListItem] = []
    for follow_up, project_title in rows:
        item_state = "upcoming"
        if follow_up.return_at.date() < today:
            item_state = "overdue"
        elif follow_up.return_at.date() == today:
            item_state = "due_today"
        if state == "due" and item_state == "upcoming":
            continue
        if state and state != "due" and item_state != state:
            continue
        items.append(
            schemas.FollowUpListItem(
                id=follow_up.id,
                project_id=follow_up.project_id,
                project_title=project_title,
                state=item_state,
                waiting_on_label=follow_up.waiting_on_label,
                reason=follow_up.reason,
                return_at=follow_up.return_at,
                suggested_action_text=follow_up.suggested_action_text,
            )
        )
    return schemas.FollowUpListOut(items=items)


def reschedule_follow_up(db: Session, follow_up_id: UUID, data: schemas.RescheduleFollowUpRequest) -> FollowUp:
    follow_up = get_follow_up_or_404(db, follow_up_id)
    follow_up.return_at = data.return_at
    follow_up.updated_at = now_utc()
    add_activity(db, follow_up.user_id, "project", follow_up.project_id, "follow_up_rescheduled", {"return_at": data.return_at.isoformat()})
    db.commit()
    db.refresh(follow_up)
    return follow_up


def get_today(db: Session) -> schemas.TodayOut:
    project_list = list(db.scalars(select(Project).options(selectinload(Project.actions), selectinload(Project.follow_ups))))
    inbox_count = db.scalar(select(func.count()).select_from(InboxItem).where(InboxItem.status == InboxStatus.new)) or 0
    buckets: dict[str, list[Project]] = {
        "overdue_follow_ups": [],
        "returned_today": [],
        "missing_next_action": [],
        "stale_projects": [],
        "recommended_next_actions": [],
    }
    for project in project_list:
        state = attention_state(project)
        if state == "overdue_follow_up":
            buckets["overdue_follow_ups"].append(project)
        elif state == "returned_today":
            buckets["returned_today"].append(project)
        elif state == "no_next_action":
            buckets["missing_next_action"].append(project)
        elif state == "stale_project":
            buckets["stale_projects"].append(project)
        elif project.status == ProjectStatus.active and project.current_next_action:
            buckets["recommended_next_actions"].append(project)

    def project_item(project: Project, label: str) -> schemas.TodayItem:
        return schemas.TodayItem(
            project_id=project.id,
            project_title=project.title,
            reason_label=label,
            action_id=project.current_next_action.id if project.current_next_action else None,
            action_title=project.current_next_action.title if project.current_next_action else None,
            primary_action=schemas.TodayAction(type="open_project", label="Open project"),
        )

    sections = [
        schemas.TodaySection(type="overdue_follow_ups", title="Needs attention now", items=[project_item(p, "Overdue follow-up") for p in buckets["overdue_follow_ups"]]),
        schemas.TodaySection(type="returned_today", title="Returned today", items=[project_item(p, "Returned today") for p in buckets["returned_today"]]),
        schemas.TodaySection(type="missing_next_action", title="Projects missing next action", items=[project_item(p, "No next action") for p in buckets["missing_next_action"]]),
        schemas.TodaySection(type="stale_projects", title="Stale projects", items=[project_item(p, "No movement 7 days") for p in buckets["stale_projects"]]),
        schemas.TodaySection(type="recommended_next_actions", title="Recommended next actions", items=[project_item(p, "Recommended") for p in buckets["recommended_next_actions"][:3]]),
    ]
    return schemas.TodayOut(
        summary=schemas.TodaySummary(
            needs_attention_count=sum(len(buckets[key]) for key in ("overdue_follow_ups", "returned_today", "missing_next_action", "stale_projects")),
            overdue_follow_ups_count=len(buckets["overdue_follow_ups"]),
            missing_next_action_count=len(buckets["missing_next_action"]),
            stale_projects_count=len(buckets["stale_projects"]),
            new_inbox_count=inbox_count,
        ),
        sections=[section for section in sections if section.items],
    )


def get_weekly_review(db: Session, week_start: date | None = None) -> schemas.WeeklyReviewOut:
    today = now_utc().date()
    week_start = week_start or (today - timedelta(days=today.weekday()))
    start_dt = datetime.combine(week_start, time.min, tzinfo=timezone.utc)
    projects = list(db.scalars(select(Project).options(selectinload(Project.actions), selectinload(Project.follow_ups))))
    moved = [p for p in projects if p.last_activity_at >= start_dt and p.status == ProjectStatus.active]
    blocked = [p for p in projects if p.status == ProjectStatus.blocked]
    stale = [p for p in projects if p.status == ProjectStatus.active and p.last_activity_at < now_utc() - timedelta(days=STALE_AFTER_DAYS)]
    missing = [p for p in projects if p.status == ProjectStatus.active and not p.current_next_action]

    sections = [
        schemas.WeeklyReviewSection(type="moved_forward", items=[schemas.WeeklyReviewItem(project_id=p.id, project_title=p.title, summary="Moved this week") for p in moved]),
        schemas.WeeklyReviewSection(type="still_blocked", items=[schemas.WeeklyReviewItem(project_id=p.id, project_title=p.title, summary=f"Waiting on {current_follow_up(p).waiting_on_label if current_follow_up(p) else 'someone'}") for p in blocked]),
        schemas.WeeklyReviewSection(type="no_movement", items=[schemas.WeeklyReviewItem(project_id=p.id, project_title=p.title, summary=f"No movement in {STALE_AFTER_DAYS}+ days") for p in stale]),
        schemas.WeeklyReviewSection(type="missing_next_action", items=[schemas.WeeklyReviewItem(project_id=p.id, project_title=p.title, summary="Needs a new next action") for p in missing]),
    ]
    return schemas.WeeklyReviewOut(
        week_start=week_start,
        summary=schemas.WeeklyReviewSummary(moved_projects=len(moved), blocked_projects=len(blocked), stale_projects=len(stale)),
        sections=[section for section in sections if section.items],
    )


def complete_weekly_review(_: Session, week_start: date) -> schemas.WeeklyReviewCompleteOut:
    return schemas.WeeklyReviewCompleteOut(week_start=week_start, status="completed")


def list_references(db: Session, type_: ReferenceType | None = None) -> schemas.ReferenceListOut:
    stmt = select(ReferenceEntity).order_by(ReferenceEntity.title.asc())
    if type_:
        stmt = stmt.where(ReferenceEntity.type == type_)
    references = list(db.scalars(stmt))
    return schemas.ReferenceListOut(items=[to_reference(reference) for reference in references], total=len(references))


def create_reference(db: Session, data: schemas.ReferenceCreate) -> ReferenceEntity:
    user = get_default_user(db)
    reference = ReferenceEntity(
        user_id=user.id,
        type=data.type,
        title=data.title,
        description=data.description,
        url=data.url,
        metadata_json=data.metadata,
    )
    db.add(reference)
    db.commit()
    db.refresh(reference)
    return reference


def link_reference(db: Session, project_id: UUID, data: schemas.ReferenceLinkCreate) -> ProjectReferenceLink:
    project = get_project_or_404(db, project_id)
    reference = db.get(ReferenceEntity, data.reference_entity_id)
    if not reference:
        raise ApiError("NOT_FOUND", "Reference entity not found", 404)
    link = ProjectReferenceLink(project_id=project.id, reference_entity_id=reference.id, role=data.role)
    db.add(link)
    add_activity(db, project.user_id, "project", project.id, "reference_linked", {"reference_id": str(reference.id)})
    db.commit()
    db.refresh(link)
    return link


def list_activity(db: Session, project_id: UUID) -> schemas.ActivityListOut:
    get_project_or_404(db, project_id)
    events = list(
        db.scalars(
            select(ActivityEvent)
            .where(ActivityEvent.entity_type == "project", ActivityEvent.entity_id == project_id)
            .order_by(ActivityEvent.created_at.desc())
        )
    )
    return schemas.ActivityListOut(items=[to_activity(event) for event in events])
