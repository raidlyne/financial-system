# FinancialSystem

`FinancialSystem` — это учебное приложение для учета личных финансов. В проекте есть:

- backend на **ASP.NET Core**;
- frontend на **React + TypeScript**;
- база данных **PostgreSQL**.

## Что умеет проект

- добавление и редактирование трат;
- управление бюджетами по категориям;
- просмотр статистики расходов;
- работа через веб-интерфейс и API.

## Как скачать репозиторий

```bash
git clone https://github.com/raidlyne/financial-system.git
cd FinancialSystem
```

## Запуск через Docker

Перед запуском убедитесь, что у вас установлены:

- Docker;
- Docker Compose.

В корне проекта выполните:

```bash
docker compose up --build
```

После старта будут доступны сервисы:

- **Frontend** — http://localhost:5173
- **Backend API** — http://localhost:5192
- **PostgreSQL** — порт `5432`

## Полезные замечания

- Для базы данных используются переменные окружения `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.
- Данные PostgreSQL сохраняются в папке `finance-data`.
- Если какие-то порты уже заняты на вашем компьютере, измените их в `docker-compose.yml`.

## Структура запуска

- `docker-compose.yml` — описание всех сервисов.
- `FinancialSystem/Dockerfile` — сборка backend.
- `frontend/Dockerfile` — сборка frontend.

