from datetime import date
from uuid import UUID

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app import schemas, services
from app.config import get_settings
from app.db import get_db
from app.errors import ApiError, api_error_handler
from app.models import InboxStatus, ProjectStatus, ReferenceType


settings = get_settings()

app = FastAPI(title="FocusLoop API", version="0.1.0")
app.add_exception_handler(ApiError, api_error_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/projects", response_model=schemas.ProjectOut)
def create_project(data: schemas.ProjectCreate, db: Session = Depends(get_db)):
    return services.create_project(db, data)


@app.get("/api/v1/projects", response_model=schemas.ProjectListOut)
def list_projects(status: ProjectStatus | None = Query(default=None), db: Session = Depends(get_db)):
    return services.list_projects(db, status)


@app.get("/api/v1/projects/{project_id}", response_model=schemas.ProjectDetailOut)
def get_project(project_id: UUID, db: Session = Depends(get_db)):
    return services.project_detail(db, project_id)


@app.patch("/api/v1/projects/{project_id}", response_model=schemas.ProjectOut)
def patch_project(project_id: UUID, data: schemas.ProjectPatch, db: Session = Depends(get_db)):
    return services.patch_project(db, project_id, data)


@app.delete("/api/v1/projects/{project_id}", status_code=204)
def delete_project(project_id: UUID, db: Session = Depends(get_db)) -> None:
    services.delete_project(db, project_id)


@app.post("/api/v1/projects/{project_id}/next-action", response_model=schemas.ProjectActionOut)
def set_next_action(project_id: UUID, data: schemas.NextActionCreate, db: Session = Depends(get_db)):
    return services.set_next_action(db, project_id, data)


@app.post("/api/v1/project-actions/{action_id}/complete", response_model=schemas.ProjectActionOut)
def complete_action(action_id: UUID, db: Session = Depends(get_db)):
    return services.complete_action(db, action_id)


@app.get("/api/v1/projects/{project_id}/actions")
def list_project_actions(project_id: UUID, db: Session = Depends(get_db)):
    return {"items": services.list_project_actions(db, project_id)}


@app.post("/api/v1/inbox-items", response_model=schemas.InboxItemOut)
def create_inbox_item(data: schemas.InboxItemCreate, db: Session = Depends(get_db)):
    return services.create_inbox_item(db, data)


@app.get("/api/v1/inbox-items", response_model=schemas.InboxListOut)
def list_inbox_items(status: InboxStatus | None = Query(default=None), db: Session = Depends(get_db)):
    return services.list_inbox_items(db, status)


@app.post("/api/v1/inbox-items/{inbox_item_id}/clarify", response_model=schemas.InboxClarifyOut)
def clarify_inbox_item(inbox_item_id: UUID, data: schemas.InboxClarifyRequest, db: Session = Depends(get_db)):
    return services.clarify_inbox_item(db, inbox_item_id, data)


@app.post("/api/v1/inbox-items/{inbox_item_id}/archive", response_model=schemas.InboxClarifyOut)
def archive_inbox_item(inbox_item_id: UUID, db: Session = Depends(get_db)):
    return services.archive_inbox_item(db, inbox_item_id)


@app.post("/api/v1/projects/{project_id}/block", response_model=schemas.BlockProjectOut)
def block_project(project_id: UUID, data: schemas.BlockProjectRequest, db: Session = Depends(get_db)):
    return services.block_project(db, project_id, data)


@app.post("/api/v1/projects/{project_id}/unblock", response_model=schemas.UnblockProjectOut)
def unblock_project(project_id: UUID, data: schemas.UnblockProjectRequest, db: Session = Depends(get_db)):
    return services.unblock_project(db, project_id, data)


@app.get("/api/v1/follow-ups", response_model=schemas.FollowUpListOut)
def list_follow_ups(state: str | None = Query(default=None), db: Session = Depends(get_db)):
    return services.list_follow_ups(db, state)


@app.post("/api/v1/follow-ups/{follow_up_id}/reschedule", response_model=schemas.FollowUpOut)
def reschedule_follow_up(follow_up_id: UUID, data: schemas.RescheduleFollowUpRequest, db: Session = Depends(get_db)):
    return services.reschedule_follow_up(db, follow_up_id, data)


@app.get("/api/v1/today", response_model=schemas.TodayOut)
def get_today(db: Session = Depends(get_db)):
    return services.get_today(db)


@app.get("/api/v1/reviews/weekly", response_model=schemas.WeeklyReviewOut)
def get_weekly_review(week_start: date | None = Query(default=None), db: Session = Depends(get_db)):
    return services.get_weekly_review(db, week_start)


@app.post("/api/v1/reviews/weekly/{week_start}/complete", response_model=schemas.WeeklyReviewCompleteOut)
def complete_weekly_review(week_start: date, db: Session = Depends(get_db)):
    return services.complete_weekly_review(db, week_start)


@app.get("/api/v1/reference", response_model=schemas.ReferenceListOut)
def list_references(type: ReferenceType | None = Query(default=None), db: Session = Depends(get_db)):
    return services.list_references(db, type)


@app.post("/api/v1/reference", response_model=schemas.ReferenceEntityOut)
def create_reference(data: schemas.ReferenceCreate, db: Session = Depends(get_db)):
    return services.to_reference(services.create_reference(db, data))


@app.post("/api/v1/projects/{project_id}/reference-links", response_model=schemas.ReferenceLinkOut)
def link_reference(project_id: UUID, data: schemas.ReferenceLinkCreate, db: Session = Depends(get_db)):
    return services.link_reference(db, project_id, data)


@app.get("/api/v1/projects/{project_id}/activity", response_model=schemas.ActivityListOut)
def list_activity(project_id: UUID, db: Session = Depends(get_db)):
    return services.list_activity(db, project_id)
