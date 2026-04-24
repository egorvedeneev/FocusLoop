from datetime import datetime, timezone
import sys

from sqlalchemy import delete, func, select

from app.db import SessionLocal
from app.models import (
    ActionKind,
    ActionStatus,
    ActivityEvent,
    FollowUp,
    InboxItem,
    Project,
    ProjectAction,
    ProjectReferenceLink,
    ProjectStatus,
    ReferenceEntity,
    ReferenceType,
    User,
    now_utc,
)
from app.services import get_default_user


def dt(year: int, month: int, day: int, hour: int = 9, minute: int = 0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)


def reset(db) -> None:
    for table in (
        ProjectReferenceLink,
        ActivityEvent,
        FollowUp,
        InboxItem,
        ProjectAction,
        Project,
        ReferenceEntity,
        User,
    ):
        db.execute(delete(table))
    db.commit()


def seed() -> None:
    db = SessionLocal()
    try:
        should_reset = "--reset" in sys.argv
        existing_projects = db.scalar(select(func.count()).select_from(Project)) or 0
        if existing_projects and not should_reset:
            print("Seed data already exists; skipping. Use --reset to recreate demo data.")
            return
        if should_reset:
            reset(db)
        user = get_default_user(db)

        references = {
            "Sarah Chen": ReferenceEntity(user_id=user.id, title="Сара Чен", type=ReferenceType.person, description="Руководитель IT", metadata_json={"email": "sarah.chen@company.com"}),
            "Alex Kumar": ReferenceEntity(user_id=user.id, title="Алекс Кумар", type=ReferenceType.person, description="Customer success", metadata_json={"email": "alex.kumar@company.com"}),
            "Maria Rodriguez": ReferenceEntity(user_id=user.id, title="Мария Родригес", type=ReferenceType.person, description="Дизайнер", metadata_json={"email": "maria@company.com"}),
            "Marketing Team": ReferenceEntity(user_id=user.id, title="Маркетинг", type=ReferenceType.team, description="Команда роста и бренда", metadata_json={}),
            "IT Team": ReferenceEntity(user_id=user.id, title="IT-команда", type=ReferenceType.team, description="Инфраструктура и безопасность", metadata_json={}),
            "Design Team": ReferenceEntity(user_id=user.id, title="Дизайн-команда", type=ReferenceType.team, description="Продуктовый дизайн и UX", metadata_json={}),
            "Google Analytics": ReferenceEntity(user_id=user.id, title="Google Analytics", type=ReferenceType.service, description="Платформа веб-аналитики", metadata_json={}),
            "Zendesk": ReferenceEntity(user_id=user.id, title="Zendesk", type=ReferenceType.service, description="Платформа поддержки клиентов", metadata_json={}),
            "Brand Guidelines": ReferenceEntity(user_id=user.id, title="Бренд-гайд", type=ReferenceType.document, description="Обновление за Q1 2026", metadata_json={}),
        }
        db.add_all(references.values())
        db.flush()

        def add_project(title: str, status: ProjectStatus, description: str | None = None, last_activity_at: datetime | None = None) -> Project:
            project = Project(
                user_id=user.id,
                title=title,
                description=description,
                status=status,
                last_activity_at=last_activity_at or now_utc(),
                created_at=last_activity_at or now_utc(),
                updated_at=last_activity_at or now_utc(),
            )
            db.add(project)
            db.flush()
            db.add(ActivityEvent(user_id=user.id, entity_type="project", entity_id=project.id, event_type="project_created", payload_json={"title": title}))
            return project

        def set_action(project: Project, title: str, due_at: datetime | None = None) -> None:
            action = ProjectAction(
                project_id=project.id,
                user_id=user.id,
                title=title,
                kind=ActionKind.next_action,
                status=ActionStatus.open,
                source="seed",
                due_at=due_at,
            )
            db.add(action)
            db.flush()
            project.current_next_action_id = action.id
            db.add(ActivityEvent(user_id=user.id, entity_type="project", entity_id=project.id, event_type="next_action_set", payload_json={"title": title}))

        def link(project: Project, *names: str) -> None:
            for name in names:
                db.add(ProjectReferenceLink(project_id=project.id, reference_entity_id=references[name].id, role=None))

        p1 = add_project("Планирование маркетинговой кампании Q2", ProjectStatus.active, "Фокус на соцсетях и email-каналах", dt(2026, 4, 22))
        set_action(p1, "Назначить kickoff-встречу с креативной командой", dt(2026, 4, 24))
        link(p1, "Marketing Team", "Design Team")

        p2 = add_project("Миграция аналитики на GA4", ProjectStatus.blocked, None, dt(2026, 4, 18))
        set_action(p2, "Настроить кастомные события в GA4")
        p2.blocked_at = dt(2026, 4, 18)
        db.add(FollowUp(user_id=user.id, project_id=p2.id, waiting_on_type="person", waiting_on_label="Сара Чен (IT)", reason="Ждём, пока IT заведёт аккаунт GA4", return_at=dt(2026, 4, 22), suggested_action_text="Напомнить Саре про статус аккаунта GA4"))
        link(p2, "Sarah Chen", "IT Team", "Google Analytics")

        p3 = add_project("Обновить документы по онбордингу сотрудников", ProjectStatus.active, "Последнее обновление было в Q4 2025, нужен refresh", dt(2026, 4, 10))
        link(p3, "Brand Guidelines")

        p4 = add_project("Редизайн страницы тарифов", ProjectStatus.active, None, dt(2026, 4, 23))
        set_action(p4, "Посмотреть страницы тарифов конкурентов", dt(2026, 4, 23))
        link(p4, "Design Team", "Maria Rodriguez")

        p5 = add_project("Процесс разбора клиентского фидбэка", ProjectStatus.blocked, None, dt(2026, 4, 15))
        p5.blocked_at = dt(2026, 4, 15)
        db.add(FollowUp(user_id=user.id, project_id=p5.id, waiting_on_type="person", waiting_on_label="Алекс Кумар", reason="Ждём экспорт из Zendesk от Алекса", return_at=dt(2026, 4, 24), suggested_action_text="Уточнить у Алекса статус экспорта Zendesk"))
        link(p5, "Alex Kumar", "Zendesk")

        p6 = add_project("Запуск продуктовой рассылки", ProjectStatus.done, None, dt(2026, 4, 20))
        p6.completed_at = dt(2026, 4, 20)
        link(p6, "Marketing Team")

        for raw_text, captured_at in [
            ("Разобрать Q1 sales performance с revenue-командой", dt(2026, 4, 23, 9, 30)),
            ("Посмотреть интеграцию Slack для клиентских уведомлений", dt(2026, 4, 23, 11, 15)),
            ("Подарок на день рождения для Марии", dt(2026, 4, 22, 16, 45)),
            ("Проверить готовность design system v2 к handoff", dt(2026, 4, 22, 14, 20)),
            ("Изучить конкурентов с AI-функциями", dt(2026, 4, 21, 10, 0)),
        ]:
            db.add(InboxItem(user_id=user.id, source="manual", raw_text=raw_text, captured_at=captured_at))

        db.commit()
        print("Seeded FocusLoop demo data.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
