# Propley Backend API Requirements

This document outlines the required backend API improvements necessary to fully support the frontend features and bug fixes recently implemented.

## 1. Presentations List Pagination & Search

Currently, the presentations registry (`/meetings`) fetches all meetings via a single flat list, which required implementing pagination and search purely on the client-side. To ensure scalability, the backend must support these operations natively.

**Endpoint:** `GET /api/v1/meetings/all`

### Required Query Parameters:
- `page` (integer): The page number to fetch.
- `limit` (integer): The number of records per page.
- `search` (string): A search term to filter records by `client` name or `property` name.
- `status` (string): Filter by meeting status (e.g., `Live`, `Scheduled`, `Completed`).

### Expected Response Format:
```json
{
  "data": [
    { /* Meeting Object */ }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 124,
    "totalPages": 13
  }
}
```

## 2. Dashboard Analytics & Filters

The frontend dashboard now includes a date-range filter, an export button, and a recent activity feed. The backend must provide data tailored to these parameters.

**Endpoint 1:** `GET /api/dashboard/summary` (KPIs)
**Endpoint 2:** `GET /api/dashboard/funnel` (Pipeline Chart)
**Endpoint 3:** `GET /api/dashboard/lead-sources` (Sources Chart)

### Required Query Parameters:
- `date_range` (string): Enum values like `all_time`, `today`, `this_week`, `this_month`.

The backend should filter the aggregated counts based on the `date_range` provided.

## 3. Data Export Endpoint

To support the newly added "Export Data" button on the dashboard, a dedicated endpoint is needed to generate and stream an export file (CSV or Excel).

**Endpoint:** `GET /api/dashboard/export`

### Required Query Parameters:
- `date_range` (string): Filter the exported data based on the selected range.
- `format` (string): e.g., `csv` or `xlsx`.

### Expected Response:
- A downloadable file stream with appropriate `Content-Disposition` headers.

## 4. CRM Client Deduplication

A critical bug was found where duplicate client records exist with the exact same email and phone number (e.g., "Tapaswin Padhy" appearing twice). 

**Endpoint:** `POST /api/v1/customers`

### Required Implementation:
- Add strict validation to check if a customer with the same `email` or `phone` already exists.
- Return a `409 Conflict` HTTP status code if a duplicate is detected, along with an error message so the frontend can prompt the user to merge or edit the existing profile instead.

## 5. Live Stream Participant Data

The Live Stream activity feed currently lacks consistent participant engagement counts. Some sessions show `—` for participants. 

**Endpoint:** `GET /api/v1/events/live-stream`
- Ensure that the backend reliably logs and returns the exact number of active participants and correctly closes the sessions (status change from `Live` to `Completed`) to prevent stale "Live" sessions.

## 6. Pipeline: Update Deal Stage Validation

The backend must recognize `closed_lost` as a valid deal stage enum string to support the new Closed-Lost column on the Pipeline board.

- **Affected Endpoints:** 
  - `POST /api/v1/clients`
  - `PUT /api/v1/clients/:id`
- **Change:** Allow `deal_stage: "closed_lost"` in the request body payload.

## 7. Pipeline: Update Funnel Stats Payload

The funnel statistics endpoint needs to include the new column count so the Dashboard charts render accurately.

- **Affected Endpoint:** `GET /api/dashboard/funnel`
- **Change:** Ensure the JSON response includes the `closed_lost` key:
  ```json
  {
    "inquiry": 4,
    "vsv_scheduled": 2,
    "vsv_done": 0,
    "offer": 0,
    "negotiation": 0,
    "closed_won": 0,
    "closed_lost": 0
  }
  ```

## 8. Pipeline: Support Deal Tracking Fields

The frontend pipeline cards now render `dealValue` and `followUpDate` fields, and the "Update Info" modal allows users to set them. The backend needs to capture these fields on the CRM endpoints:

- **Affected Endpoints:** 
  - `POST /api/v1/clients`
  - `PUT /api/v1/clients/:id`
  - `GET /api/v1/clients`
- **Change:** Support the optional `deal_value` (integer) and `follow_up_date` (string e.g. "12 Jun 2026") fields in payloads and responses.

## 9. Seed Later-Stage Mock Data

The later-stage columns (`vsv_done`, `negotiation`, `closed_won`, `closed_lost`) were entirely empty in the UI because no clients in the database had reached those stages.
- **Action:** Please seed the backend database with at least 1-2 mock clients in each of the later stages (`vsv_done`, `offer`, `negotiation`, `closed_won`, and `closed_lost`). This will allow us to meaningfully test the drag-and-drop mechanics and chart rendering for the entire funnel.

## 10. Advisor Name Normalization

A bug was observed where some advisors in the presentations registry are displayed as email addresses (e.g., `srn@gmail.com`) instead of their full display names.

**Endpoint:** `GET /api/v1/meetings/all` (and anywhere advisor details are returned)

### Required Implementation:
- Ensure the backend properly normalizes the `sales_member` or `advisor` object to always include a valid `display_name` (e.g., "Srini N") instead of falling back to the email address.

## 11. Team Access Module API

The "Team Access" page is currently a dead button. To support team management, the backend needs to provide endpoints for fetching and managing team members.

**Endpoints:**
- `GET /api/v1/team`: Fetch a list of team members with their roles and statuses.
- `POST /api/v1/team/invite`: Invite a new team member.
- `PUT /api/v1/team/:id/role`: Update a team member's role.

## 12. Participant View Sync State

A bug was reported where the participant view (`/participant/{id}`) fails to load the slide content (shows "Loading Presentation...").

**Architecture / Real-time Layer:**
- Ensure the backend WebSocket or polling mechanism correctly broadcasts the active slide and presentation state to connected participants. The `GET /api/v1/events/live-stream` or related session endpoint must include the current slide deck URL and active slide index upon initial load for the participant view to render correctly.
