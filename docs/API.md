# API Reference

## Base URL

```
http://localhost:3001/api/v1
```

## Implemented Endpoints (Day 1)

### Health Check

```
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

## Planned Endpoints

Authentication, players, worlds, challenges, duels, admin, and more will be documented as they are implemented on subsequent days.

## Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message"
  },
  "meta": {
    "timestamp": "2026-07-26T00:00:00.000Z"
  }
}
```
