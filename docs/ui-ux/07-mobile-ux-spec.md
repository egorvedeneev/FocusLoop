# Mobile UX Spec

[Назад в README](../../README.md)

## Назначение
Этот документ фиксирует мобильный UX для `FocusLoop` как для полноценного клиента с функциональным паритетом относительно веба.

Цель документа:

- зафиксировать мобильную информационную архитектуру;
- описать feature parity с вебом;
- задать состав основных экранов;
- описать ключевые mobile flows;
- зафиксировать принципы Flutter-реализации с точки зрения UX.

## Базовый принцип
Мобильное приложение должно покрывать тот же продуктовый смысл, те же сущности и те же бизнес-правила, что и веб.

При этом:

- мобильный интерфейс не обязан повторять веб по композиции;
- мобильный интерфейс обязан повторять веб по функциям;
- сложные desktop split-view экраны на мобильном раскладываются на последовательные detail/action flows.

Короткая формула:

- `feature parity` — да;
- `layout parity` — нет.

## Мобильные UX-принципы
- `Project-first`: проект остается главной сущностью.
- `Action-first`: любой экран должен подводить к конкретному действию.
- `One primary CTA`: на карточке или экране должен быть один главный call to action.
- `Reason is visible`: если элемент surfaced системой, должно быть видно почему.
- `Vertical composition`: мобильный UI строится вертикальными секциями вместо плотных панелей.
- `Details and flows`: детали и редактирование разводятся по отдельным экранам.

## Feature Parity
Функционально мобильный клиент должен поддерживать:

- `Today`
- `Inbox`
- `Inbox clarify`
- `Projects`
- `Project details`
- `Next action create / replace / complete`
- `Block / unblock project`
- `Follow-up reschedule`
- `Weekly review`
- `Reference`
- `Activity history`
- редактирование основных сущностей

Что не допускается:

- ситуация, когда функцию можно выполнить только в вебе;
- урезание доменных сущностей только ради простоты мобильного UI;
- разъезд бизнес-правил между web и mobile.

## Mobile IA
Top-level navigation:

- `Сегодня`
- `Входящие`
- `Проекты`
- `Review`
- `Еще`

Внутри `Еще`:

- `Reference`
- `History`
- `Settings`

Дополнительные push-экраны:

- `Project details`
- `Inbox item details`
- `Clarify flows`
- `Edit project`
- `Set next action`
- `Block project`
- `Unblock project`
- `Reschedule follow-up`
- `Reference entity details`

## Screen Map
```text
Приложение
├── Сегодня
│   ├── Overdue follow-ups
│   ├── Returned today
│   ├── No next action
│   ├── Stale projects
│   ├── Recommended next actions
│   └── Inbox summary
│
├── Входящие
│   ├── Inbox list
│   ├── Inbox item details
│   ├── Clarify: new project
│   ├── Clarify: next action
│   ├── Clarify: follow-up
│   └── Clarify: reference
│
├── Проекты
│   ├── Active
│   ├── Blocked
│   ├── Done
│   ├── Search
│   └── Project details
│
├── Review
│   ├── Weekly summary
│   ├── Moved forward
│   ├── Still blocked
│   ├── No movement
│   └── Missing next action
│
└── Еще
    ├── Reference list
    ├── Reference entity details
    ├── History
    └── Settings
```

## Основные экраны

## `Сегодня`
Роль:

- главный экран внимания;
- первая точка входа в приложение;
- рабочий ответ на вопрос "что мне сделать сейчас?".

Состав:

1. `Top bar`
2. `Summary card`
3. `Overdue follow-ups`
4. `Returned today`
5. `No next action`
6. `Stale projects`
7. `Recommended next actions`
8. `Inbox summary`

Правила:

- каждая карточка показывает reason label;
- в секции по умолчанию ограниченное число элементов;
- tap ведет либо в details, либо в action flow.

## `Входящие`
Роль:

- вход в capture/clarify workflow;
- полноценная мобильная точка разбора входящего.

Состав:

1. `Inbox list`
2. переключатель режима `Список / По одному`
3. `Inbox item details`
4. clarify actions:
   - `Новый проект`
   - `Добавить next action`
   - `Создать follow-up`
   - `Создать reference`
   - `В архив`

Правила:

- список нужен для parity с вебом;
- one-by-one режим нужен для быстрого sequential clarify;
- формы clarify живут отдельными экранами.

## `Проекты`
Роль:

- рабочий каталог проектов;
- доступ ко всем статусам и деталям.

Состав:

1. `Status segmented control`
2. `Search`
3. `Project list`
4. `Project details`

Карточка проекта должна содержать:

- название;
- статус;
- current next action или warning;
- reason badge;
- компактную metadata row.

## `Project details`
Роль:

- главный экран доменной сущности;
- основной экран принятия решений по проекту.

Состав:

1. `Project header`
2. `Current next action card`
3. `Follow-up card`, если проект blocked
4. `Project actions`
5. `History`
6. `Linked references`
7. `Notes`
8. `All actions`

Главные CTA:

- `Сделано`
- `Изменить`
- `Заменить`
- `Поставить на ожидание`

## `Review`
Роль:

- недельный обзор без функциональных ограничений по сравнению с вебом.

Состав:

1. `Week selector`
2. `Review summary`
3. `Moved forward`
4. `Still blocked`
5. `No movement`
6. `Missing next action`
7. `Complete review`

Правила:

- экран может быть длинным, но должен оставаться структурированным;
- quick fixes допустимы прямо из review;
- review остается проектно-ориентированным, а не task-only.

## `Reference`
Роль:

- полноценный справочник, доступный с мобильного;
- не top-level бизнес-фокус, но полный по функциям.

Состав:

- list by type;
- details screen;
- create / edit flow;
- link reference to project.

## Action Flows
Часть функций веба на мобильном оформляется как отдельные экраны:

- `Create project`
- `Edit project`
- `Set next action`
- `Replace next action`
- `Block project`
- `Unblock project`
- `Reschedule follow-up`
- `Create reference`
- `Link reference`

Правило:

- если действие требует формы, лучше выделить ему отдельный screen или full-screen flow;
- не пытаться повторить desktop inline editing на маленьком экране.

## Ключевые mobile flows

## `Today -> Project`
1. Пользователь открывает `Сегодня`.
2. Видит секцию внимания.
3. Тапает в карточку.
4. Переходит в `Project details`.
5. Выполняет одно из основных действий.

## `Capture -> Inbox`
1. Пользователь нажимает `Capture`.
2. Вводит короткий текст.
3. Сохраняет.
4. Элемент попадает в `Inbox`.

## `Inbox -> Clarify`
1. Пользователь открывает входящее.
2. Выбирает clarify outcome.
3. Попадает на форму.
4. Сохраняет результат.
5. Возвращается к inbox list или следующему item.

## `Project -> Blocked`
1. Пользователь открывает `Project details`.
2. Нажимает `Поставить на ожидание`.
3. Заполняет blocker flow.
4. Проект уходит в blocked.
5. Позже возвращается через `Today` или `Projects > Blocked`.

## `Review -> Fix`
1. Пользователь открывает `Review`.
2. Доходит до проблемной секции.
3. Нажимает quick fix.
4. Открывает нужный проект или flow.
5. Возвращается в review.

## Mobile UI Rules
- Один основной CTA на экран или карточку.
- Вторичный контент должен сворачиваться или уезжать глубже.
- Reason labels обязательны:
  - `Просрочено`
  - `Вернулось сегодня`
  - `Нет следующего шага`
  - `Без движения 7 дней`
- Основной контент должен быть above the fold.
- Split-view заменяется на `list -> details -> action flow`.

## Flutter Mapping
С точки зрения Flutter мобильный UX удобно маппить на:

- top-level tab navigation;
- push navigation для details;
- modal sheet или full-screen form для коротких action flows;
- shared widget library для карточек, секций, форм и badges.

Критические экраны для первой проработки:

- `TodayScreen`
- `InboxItemDetailsScreen`
- `ProjectDetailsScreen`
- `ReviewScreen`

Критические action flows:

- `ClarifyToFollowUpScreen`
- `ClarifyToProjectScreen`
- `SetNextActionScreen`
- `BlockProjectScreen`

## Критерии качества
Mobile UX считается удачным, если:

- все ключевые сценарии веба доступны и на телефоне;
- пользователь может выполнить важные действия без веба;
- любой surfaced элемент объясняет причину появления;
- проектный экран остается action-first;
- weekly review остается полноценным, а не декоративным.

## Связанные артефакты
- `docs/ui-ux/01-ia-navigation.md`
- `docs/ui-ux/02-core-user-flows.md`
- `docs/ui-ux/03-critical-screen-wireframes.md`
- `docs/ui-ux/04-states-and-attention-rules.md`
- `docs/ui-ux/05-lowfi-prototype.html`
- `docs/ui-ux/06-mobile-lowfi-prototype.html`
