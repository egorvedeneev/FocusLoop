# REST API Contract

[Назад в README](./README.md)

## Назначение
Этот документ фиксирует черновой REST API контракт для MVP. Его цель — задать единый договор между `FastAPI` backend, `Next.js` web-клиентом и будущим `Flutter` приложением.

## Общие принципы
- Все запросы и ответы — в `JSON`.
- Базовый префикс API: `/api/v1`.
- Для `Today` и `Weekly review` backend возвращает готовые view-model payloads.
- Доменные ограничения проверяются на backend, а не только в UI.

## Формат ошибок
Единый формат:

```json
{
  "error": {
    "code": "PROJECT_REQUIRES_NEXT_ACTION",
    "message": "Active project must have a current next action",
    "details": {}
  }
}
```

Полезные коды:

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `PROJECT_REQUIRES_NEXT_ACTION`
- `BLOCKED_PROJECT_REQUIRES_RETURN_DATE`
- `FOLLOW_UP_NOT_FOUND`
- `INBOX_ITEM_ALREADY_CLARIFIED`

## Projects

### `POST /api/v1/projects`
Создать проект.

Request:
```json
{
  "title": "Payments API migration",
  "description": "Нужно согласовать rollout и доработки API"
}
```

Response:
```json
{
  "id": "proj_123",
  "title": "Payments API migration",
  "description": "Нужно согласовать rollout и доработки API",
  "status": "active",
  "current_next_action_id": null,
  "last_activity_at": "2026-04-15T10:00:00Z",
  "created_at": "2026-04-15T10:00:00Z",
  "updated_at": "2026-04-15T10:00:00Z"
}
```

### `GET /api/v1/projects?status=active`
Получить список проектов по статусу.

Response:
```json
{
  "items": [
    {
      "id": "proj_123",
      "title": "Payments API migration",
      "status": "active",
      "current_next_action": {
        "id": "act_1",
        "title": "Ask infra team for rollout ETA"
      },
      "last_activity_at": "2026-04-15T09:30:00Z",
      "attention_state": "none"
    }
  ],
  "total": 1
}
```

### `GET /api/v1/projects/{project_id}`
Получить детали проекта.

Response:
```json
{
  "id": "proj_123",
  "title": "Payments API migration",
  "description": "Нужно согласовать rollout и доработки API",
  "status": "blocked",
  "current_next_action": {
    "id": "act_1",
    "title": "Ask infra team for rollout ETA",
    "status": "open",
    "kind": "next_action"
  },
  "follow_up": {
    "id": "fu_1",
    "status": "pending",
    "waiting_on_type": "person",
    "waiting_on_label": "Anna Petrova",
    "reason": "Need ETA for API changes",
    "return_at": "2026-04-20T09:00:00Z",
    "suggested_action_text": "Ping Anna in chat"
  },
  "reference_entities": [],
  "activity": [],
  "last_activity_at": "2026-04-15T09:30:00Z"
}
```

### `PATCH /api/v1/projects/{project_id}`
Обновить проект.

Request:
```json
{
  "title": "Payments API rollout",
  "description": "Обновленное описание"
}
```

## Project Actions

### `POST /api/v1/projects/{project_id}/next-action`
Создать или заменить текущий `next action`.

Request:
```json
{
  "title": "Ask infra team for rollout ETA",
  "description": "Уточнить сроки и риски",
  "due_at": "2026-04-16T18:00:00Z"
}
```

Response:
```json
{
  "id": "act_1",
  "project_id": "proj_123",
  "title": "Ask infra team for rollout ETA",
  "description": "Уточнить сроки и риски",
  "kind": "next_action",
  "status": "open",
  "due_at": "2026-04-16T18:00:00Z"
}
```

### `POST /api/v1/project-actions/{action_id}/complete`
Завершить действие.

Response:
```json
{
  "id": "act_1",
  "status": "done",
  "completed_at": "2026-04-15T12:30:00Z"
}
```

### `GET /api/v1/projects/{project_id}/actions`
Получить список действий проекта.

Response:
```json
{
  "items": [
    {
      "id": "act_1",
      "title": "Ask infra team for rollout ETA",
      "kind": "next_action",
      "status": "done"
    },
    {
      "id": "act_2",
      "title": "Review rollout draft",
      "kind": "supporting",
      "status": "open"
    }
  ]
}
```

## Inbox

### `POST /api/v1/inbox-items`
Создать входящий элемент.

Request:
```json
{
  "source": "manual",
  "raw_text": "Нужно уточнить у Ани сроки по API"
}
```

Response:
```json
{
  "id": "inb_1",
  "source": "manual",
  "raw_text": "Нужно уточнить у Ани сроки по API",
  "status": "new",
  "captured_at": "2026-04-15T11:00:00Z"
}
```

### `GET /api/v1/inbox-items?status=new`
Получить неразобранные входящие.

Response:
```json
{
  "items": [
    {
      "id": "inb_1",
      "source": "manual",
      "raw_text": "Нужно уточнить у Ани сроки по API",
      "status": "new",
      "captured_at": "2026-04-15T11:00:00Z"
    }
  ],
  "total": 1
}
```

### `POST /api/v1/inbox-items/{inbox_item_id}/clarify`
Разобрать входящее.

Request:
```json
{
  "target_type": "follow_up",
  "payload": {
    "project_id": "proj_123",
    "waiting_on_type": "person",
    "waiting_on_label": "Anna Petrova",
    "reason": "Need ETA for API changes",
    "return_at": "2026-04-20T09:00:00Z",
    "suggested_action_text": "Ping Anna in chat"
  }
}
```

Response:
```json
{
  "inbox_item_id": "inb_1",
  "status": "clarified",
  "clarified_as": "follow_up",
  "result_id": "fu_1"
}
```

### `POST /api/v1/inbox-items/{inbox_item_id}/archive`
Архивировать входящее.

## Follow-ups

### `POST /api/v1/projects/{project_id}/block`
Заблокировать проект и создать follow-up.

Request:
```json
{
  "waiting_on_type": "person",
  "waiting_on_label": "Anna Petrova",
  "reason": "Need ETA for API changes",
  "return_at": "2026-04-20T09:00:00Z",
  "suggested_action_text": "Ping Anna in chat"
}
```

Response:
```json
{
  "project_id": "proj_123",
  "project_status": "blocked",
  "follow_up": {
    "id": "fu_1",
    "status": "pending",
    "waiting_on_label": "Anna Petrova",
    "reason": "Need ETA for API changes",
    "return_at": "2026-04-20T09:00:00Z"
  }
}
```

### `POST /api/v1/projects/{project_id}/unblock`
Вернуть проект в `active`.

Request:
```json
{
  "new_next_action_title": "Review Anna's response"
}
```

Response:
```json
{
  "project_id": "proj_123",
  "project_status": "active",
  "current_next_action": {
    "id": "act_3",
    "title": "Review Anna's response",
    "status": "open"
  }
}
```

### `GET /api/v1/follow-ups?state=due`
Получить due и overdue follow-up'ы.

Response:
```json
{
  "items": [
    {
      "id": "fu_1",
      "project_id": "proj_123",
      "project_title": "Payments API migration",
      "state": "overdue",
      "waiting_on_label": "Anna Petrova",
      "reason": "Need ETA for API changes",
      "return_at": "2026-04-20T09:00:00Z",
      "suggested_action_text": "Ping Anna in chat"
    }
  ]
}
```

### `POST /api/v1/follow-ups/{follow_up_id}/reschedule`
Перенести follow-up на другую дату.

Request:
```json
{
  "return_at": "2026-04-22T09:00:00Z"
}
```

## Today / Attention

### `GET /api/v1/today`
Главный endpoint для стартового экрана.

Response:
```json
{
  "summary": {
    "needs_attention_count": 3,
    "overdue_follow_ups_count": 1,
    "missing_next_action_count": 1,
    "stale_projects_count": 1,
    "new_inbox_count": 5
  },
  "sections": [
    {
      "type": "overdue_follow_ups",
      "title": "Needs attention now",
      "items": [
        {
          "project_id": "proj_123",
          "project_title": "Payments API migration",
          "reason_label": "Overdue follow-up",
          "primary_action": {
            "type": "open_project",
            "label": "Send follow-up"
          }
        }
      ]
    },
    {
      "type": "missing_next_action",
      "title": "Projects missing next action",
      "items": [
        {
          "project_id": "proj_456",
          "project_title": "Quarterly roadmap sync",
          "reason_label": "No next action"
        }
      ]
    },
    {
      "type": "recommended_next_actions",
      "title": "Recommended next actions",
      "items": [
        {
          "project_id": "proj_789",
          "project_title": "Billing retry policy research",
          "action_id": "act_5",
          "action_title": "Review retry options draft"
        }
      ]
    }
  ]
}
```

## Weekly Review

### `GET /api/v1/reviews/weekly?week_start=2026-04-13`
Получить weekly review.

Response:
```json
{
  "week_start": "2026-04-13",
  "summary": {
    "moved_projects": 6,
    "blocked_projects": 2,
    "stale_projects": 3
  },
  "sections": [
    {
      "type": "moved_forward",
      "items": [
        {
          "project_id": "proj_1",
          "project_title": "Access policy cleanup",
          "summary": "2 actions completed"
        }
      ]
    },
    {
      "type": "still_blocked",
      "items": [
        {
          "project_id": "proj_123",
          "project_title": "Payments API migration",
          "summary": "Waiting on Anna Petrova"
        }
      ]
    },
    {
      "type": "no_movement",
      "items": [
        {
          "project_id": "proj_456",
          "project_title": "Billing retry policy research",
          "summary": "No movement in 7 days"
        }
      ]
    },
    {
      "type": "missing_next_action",
      "items": [
        {
          "project_id": "proj_789",
          "project_title": "Quarterly roadmap sync",
          "summary": "Needs a new next action"
        }
      ]
    }
  ]
}
```

### `POST /api/v1/reviews/weekly/{week_start}/complete`
Отметить weekly review как завершенный.

## Reference

### `GET /api/v1/reference?type=person`
Получить справочные сущности по типу.

### `POST /api/v1/reference`
Создать справочную сущность.

Request:
```json
{
  "type": "person",
  "title": "Anna Petrova",
  "description": "Backend owner for payments API",
  "url": null,
  "metadata": {
    "telegram": "@anna"
  }
}
```

### `POST /api/v1/projects/{project_id}/reference-links`
Привязать справочную сущность к проекту.

Request:
```json
{
  "reference_entity_id": "ref_1",
  "role": "owner"
}
```

## Activity Log

### `GET /api/v1/projects/{project_id}/activity`
Получить историю событий проекта.

Response:
```json
{
  "items": [
    {
      "id": "evt_1",
      "event_type": "project_created",
      "created_at": "2026-04-15T10:00:00Z",
      "payload": {}
    },
    {
      "id": "evt_2",
      "event_type": "project_blocked",
      "created_at": "2026-04-15T11:00:00Z",
      "payload": {
        "reason": "Need ETA for API changes"
      }
    }
  ]
}
```

## Ключевые endpoints для MVP
Наиболее важные контракты, которые стоит зафиксировать раньше остальных:

1. `POST /api/v1/inbox-items/{id}/clarify`
2. `GET /api/v1/today`
3. `POST /api/v1/projects/{id}/block`
4. `POST /api/v1/projects/{id}/unblock`
5. `GET /api/v1/reviews/weekly`

## Практический вывод
Для MVP не нужно описывать весь API до последнего поля. На старте достаточно стабилизировать контракты для:

- `Projects`
- `Project Actions`
- `Inbox`
- `Follow-ups`
- `Today`
- `Weekly review`
