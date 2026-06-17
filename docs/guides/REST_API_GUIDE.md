# REST API Guide

REST API design is a structural discipline for Agora na Copa 26.

## Goal

Design HTTP interfaces where clients can infer resource location, operation
semantics, and outcome from the URL, method, and status code alone — without
reading additional documentation for every endpoint.

## In this project

Express API defined in `server.ts`. Current endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/broadcast-guide` | GET | Broadcaster schedule for a match |
| `/api/match-states` | GET | Live match state aggregation |
| `/api/match-overlays` | GET | Overlay data for live match display |
| `/api/match-lineup/:matchId` | GET | Player lineup for a given match |
| `/api/team-view/:teamCode` | GET | Team detail view data |
| `/api/tournament-leaders` | GET | Top scorers and assist leaders |
| `/api/player-incidents/:teamCode/:playerName` | GET | All match incidents for a player, summarized by type |
| `/api/standings` | GET | Group standings |
| `/api/questions` | GET | Fan prediction questions |
| `/api/predict` | POST | Submit a fan prediction |
| `/api/fifa-sync-status` | GET | FIFA API sync health |

**Resilience shape**: every FIFA-sourced response must carry
`source: "fifa" | "fallback"`, a human-readable `note`, and `updatedAt`. Any
new endpoint that calls the FIFA API must follow this shape and fall back
gracefully when the FIFA API is unreachable.

New endpoints should use resource-noun paths (`/api/match-states`, not
`/api/getMatchStates`), return accurate status codes, and keep error shapes
consistent with existing endpoints.

## What REST API Design Means

REST API design means resources are modeled as nouns, HTTP methods carry
explicit semantic meaning, status codes accurately describe the outcome, and
error contracts are consistent across every endpoint.

In practice, it means:

1. URLs identify resources, not actions. Behavior comes from the HTTP method.
2. Collections and items follow a predictable hierarchical path structure.
3. HTTP methods align with the operation's read/write and idempotency
   characteristics.
4. Status codes reflect the actual outcome — not always 200.
5. Error responses follow a single consistent structure the client can handle
   generically.
6. Versioning is explicit, stable, and applied before any breaking change ships.
7. Every endpoint that can produce large result sets paginates them.

It does **not** mean using every HTTP method, status code, or REST convention
for every project. Use as much as the actual contract warrants. A simple CRUD
service does not need the full complexity of a hypermedia API.

## Why It Matters

1. Predictable URL and method patterns reduce integration time for API consumers
   because behavior can be inferred from the contract, not memorized per endpoint.
2. Accurate status codes allow clients to implement generic error handling without
   parsing every response body.
3. A consistent error structure makes debugging faster for both humans and
   automated clients.
4. Explicit versioning lets the API evolve without silently breaking existing
   consumers.
5. Resource-oriented naming makes the API self-documenting at the HTTP layer,
   reducing the need for supplementary reference material.

## REST API Design and Code LLMs

REST API design also improves the quality of LLM-assisted coding.

Code-focused models work better when URL patterns, method semantics, and
response shapes are consistent and predictable. When every endpoint follows the
same conventions for naming, status codes, and error responses, a model
generating a new route or fixing an existing one is less likely to introduce
inconsistencies, wrong status codes, or undocumented error shapes.

This does not replace careful API review. It means a well-designed REST API
helps twice: it reduces ambiguity for human reviewers, and it gives code models
stronger signals for generating correctly shaped endpoints.

### Why LLMs Benefit

- Consistent URL patterns make new routes easy to generate correctly.
- Standardized request and response shapes reduce the space of plausible errors.
- Semantic HTTP methods remove ambiguity about whether an operation is safe or
  idempotent.
- A uniform error structure means generated error-handling code can be generic
  rather than endpoint-specific.
- Explicit versioning rules prevent a model from introducing breaking changes
  without awareness.

### Where Weak Design Hurts LLMs

- Verb-based URLs force a model to learn operation names case by case instead of
  inferring them from resource structure.
- Inconsistent status codes mean generated error-handling code must be
  customized per endpoint.
- Mixed or missing error structures make it impossible to generate reliable
  client-side error handling.
- Undocumented or implicit versioning lets a model introduce breaking changes
  silently.
- Inconsistent field naming (camelCase in one endpoint, snake_case in another)
  causes client-side bugs that are hard to catch without exhaustive testing.

## Required Rules

1. URLs must name resources as plural nouns. HTTP methods carry the action.
   `/orders`, not `/getOrders` or `/createOrder`.
2. Hierarchy must reflect real resource ownership. `/users/{id}/orders` means
   the orders belong to the user. Do not nest resources deeper than one level
   beyond the parent unless the relationship is the resource.
3. HTTP methods must match operation semantics: GET for read, POST for create,
   PUT for full replace, PATCH for partial update, DELETE for removal.
4. GET, PUT, and DELETE must be idempotent. Calling them more than once with
   the same inputs must produce the same result.
5. Status codes must reflect the actual outcome. Never return 200 for an error.
   Never return 500 for a client mistake.
6. Every error response must follow a single, consistent structure. Clients must
   be able to handle any error without inspecting a unique shape per endpoint.
7. Breaking changes require a new API version before they are released to
   consumers. The versioning strategy must be chosen once and applied uniformly.
8. Every endpoint that can return an unbounded number of items must paginate
   results and include pagination metadata in the response.

## Operation Reference

| HTTP Method | Typical path | Safe | Idempotent | Success status | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/resources` | Yes | Yes | 200 | Returns paginated collection |
| GET | `/resources/{id}` | Yes | Yes | 200 | Returns single item or 404 |
| POST | `/resources` | No | No | 201 + Location | Creates; body contains new resource |
| PUT | `/resources/{id}` | No | Yes | 200 or 204 | Full replacement; 404 if not found |
| PATCH | `/resources/{id}` | No | No | 200 or 204 | Partial update; 404 if not found |
| DELETE | `/resources/{id}` | No | Yes | 204 | No body; 404 optional on repeat call |

Adjust for project-specific conventions, but keep the safety and idempotency
guarantees consistent with the HTTP semantics above.

## Best Practices

### URL and Resource Naming

1. Use plural nouns: `/users`, `/orders`, `/product-categories`.
2. Use lowercase and hyphens for multi-word segments: `/product-categories`,
   not `/productCategories` or `/product_categories`.
3. Express relationships through nesting one level deep:
   `/users/{id}/addresses`. Do not cascade further.
4. Avoid verbs. If an action does not map cleanly to a resource and CRUD
   method, consider modeling it as a sub-resource or command resource:
   `/orders/{id}/cancellation` (POST to create a cancellation event).
5. Do not include the format in the URL. Prefer `Accept` headers over
   `/users.json`.

### HTTP Method Semantics

1. GET must never produce side effects. It must be cacheable and safe to retry.
2. POST is the correct method for operations that create a new resource or
   trigger a non-idempotent workflow. Return 201 with a `Location` header
   pointing to the new resource.
3. PUT replaces the full resource. The client sends the complete intended state.
   Use PATCH when the client sends only the fields to change.
4. DELETE removes the resource. A repeated DELETE on the same resource may
   return 404 or 204 — pick one and apply it consistently.
5. Do not use GET with a body, POST for reads, or DELETE for updates.

### Status Codes

Use the narrowest accurate status code. Common codes and when to use them:

| Status | When to use |
| --- | --- |
| 200 OK | Successful read, update, or query |
| 201 Created | Resource created; include `Location` header |
| 204 No Content | Success with no response body (delete, some updates) |
| 400 Bad Request | Syntactically invalid input the client must fix |
| 401 Unauthorized | Missing or invalid authentication credentials |
| 403 Forbidden | Authenticated but not authorized for this resource |
| 404 Not Found | Resource does not exist |
| 409 Conflict | State conflict (duplicate key, violated uniqueness constraint) |
| 422 Unprocessable Entity | Syntactically valid but semantically invalid input |
| 429 Too Many Requests | Rate limit exceeded; include `Retry-After` header |
| 500 Internal Server Error | Unexpected server failure not caused by the client |

Never return 500 for client errors. Never return 200 for server errors.

### Error Response Contract

Every error response must use the same envelope regardless of endpoint, HTTP
method, or error type. Example structure:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Order 'ord-42' was not found.",
    "details": [
      {
        "field": "id",
        "issue": "No order exists with this identifier."
      }
    ]
  }
}
```

- `code` — machine-readable string constant the client can branch on.
- `message` — human-readable description safe to surface in logs or developer
  tools. Not a user-facing UI string.
- `details` — optional array for field-level or item-level sub-errors. Include
  when the client can take corrective action per field (validation failures,
  partial batch errors).

### Versioning

1. Choose one versioning strategy and apply it uniformly across the entire API.
2. URL prefix versioning (`/v1/`, `/v2/`) is the most discoverable and the
   simplest to route: prefer it unless the project has a strong reason to use
   headers.
3. Introduce a new version only for breaking changes: removed fields, changed
   field types, changed semantics, or removed endpoints.
4. Additive changes — new optional fields, new endpoints — do not require a new
   version.
5. Maintain at least one previous major version until all consumers have
   migrated and a formal deprecation window has passed.
6. Communicate deprecations through a `Deprecation` response header and release
   notes before removing anything.

### Pagination

1. Every collection endpoint that can return more than a bounded, small number
   of items must paginate.
2. Prefer cursor-based pagination for large or frequently changing datasets.
   Prefer offset-based pagination only when clients need random access by page
   number.
3. Return pagination metadata in the response body alongside the items:

```json
{
  "data": [],
  "pagination": {
    "cursor": "eyJpZCI6IjQyIn0",
    "hasNextPage": true,
    "pageSize": 20
  }
}
```

4. Do not rely on HTTP headers alone for pagination metadata — body metadata is
   easier for clients to consume without custom header parsing.
5. Honor a `pageSize` (or equivalent) parameter from the client but enforce a
   server-side maximum to prevent abuse.

## Review Heuristics

### URL Inference Test

Could a new consumer locate any resource in the API by following the URL
structure alone, without reading the documentation for each endpoint? If no, the
URL design has verbs, inconsistent nesting, or unexplained deviations from the
resource model.

### Method Semantics Test

Does the HTTP method used for each operation match its safe and idempotency
guarantees? A GET that modifies state, a POST for reads, or a DELETE that
returns a body all violate the semantic contract clients rely on.

### Status Code Test

Does the status code returned for each outcome reflect what actually happened?
A 200 for a not-found resource, a 500 for a client mistake, or a 200 for a
created resource all break client assumptions built on HTTP semantics.

### Error Consistency Test

Can a client handle every possible error response from any endpoint using the
same parsing logic? If error shapes differ between endpoints — different field
names, different top-level keys, inconsistent `code` formats — clients cannot
write generic error handling.

### Idempotency Test

Are all GET, PUT, and DELETE operations safe to call more than once with the
same inputs? If a second PUT changes state beyond what the first did, or a
second DELETE fails differently than a client expects, the idempotency guarantee
is broken.

### Breaking Change Test

Does the proposed change remove a field, change a field type, change a status
code's meaning, or remove an endpoint that existing consumers depend on? If yes,
a new version is required before the change ships.

### Pagination Test

Can any collection endpoint return an unbounded number of items without
pagination? If yes, the endpoint is a latency and reliability risk at scale.

## Positive Signals

- URLs are nouns in plural form; no verbs appear in path segments.
- Hierarchical paths reflect real ownership relationships.
- Status codes match the actual outcome on every endpoint.
- All error responses share the same envelope structure.
- New optional fields are added without a version bump; breaking changes get a
  new version.
- Collection endpoints paginate and document their pagination parameters.
- Idempotent operations can be retried safely by clients and proxies.
- A `Location` header is returned on every 201 response.

## Warning Signs

- Verbs in URLs: `/getUser`, `/createOrder`, `/processPayment`.
- A 200 status code returned for error conditions.
- Different error shapes from different endpoints.
- No versioning strategy, or versioning added reactively after a breaking change
  ships.
- Collection endpoints returning all records in a single response with no limit.
- GET endpoints with bodies or side effects.
- POST used for reads, or GET used for state changes.
- Field names inconsistent across endpoints (camelCase in one, snake_case in
  another).
- Nested resources more than one level deep from the parent (e.g.
  `/users/{id}/orders/{id}/items/{id}/details`).
- Authentication state stored server-side per session rather than validated
  per-request.

## Related Guides

- [LOW_COUPLING_GUIDE.md](./LOW_COUPLING_GUIDE.md) for keeping HTTP adapter
  logic thin and separate from the business rules it delegates to.
- [HIGH_COHESION_GUIDE.md](./HIGH_COHESION_GUIDE.md) for keeping each endpoint
  handler focused on one resource operation.
- [LIGHTWEIGHT_DDD_GUIDE.md](./LIGHTWEIGHT_DDD_GUIDE.md) for naming endpoints
  and responses in the domain's ubiquitous language rather than the FIFA API's
  vocabulary.

## Summary Checklist

- [ ] URLs use plural nouns; no verbs appear in path segments.
- [ ] Hierarchy reflects real resource ownership, nested at most one level deep.
- [ ] HTTP methods match operation semantics and idempotency guarantees.
- [ ] GET, PUT, and DELETE are safe to call multiple times with the same inputs.
- [ ] Status codes accurately reflect the outcome on every endpoint.
- [ ] All error responses use the same envelope structure with a `code` field.
- [ ] 201 responses include a `Location` header pointing to the created resource.
- [ ] Breaking changes are shipped under a new version, not silently in place.
- [ ] Collection endpoints paginate results and include pagination metadata.
- [ ] Field naming convention is consistent across all endpoints.
- [ ] Authentication is stateless and validated per request.
