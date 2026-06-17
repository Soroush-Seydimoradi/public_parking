# Parking Management Project Rules

## General

* Never rewrite working code.
* Keep API contracts stable.
* Preserve current folder structure.
* Preserve Persian RTL UI behavior.
* Minimize file modifications.

## Before Coding

* Analyze the task.
* Explain the implementation plan.
* Identify affected files.
* Wait for approval if more than 5 files are affected.

## Backend

* Django + DRF.
* Keep existing endpoint URLs unchanged.
* Use serializers for validation.
* Avoid business logic duplication.

## Frontend

* React + Vite + TypeScript.
* Keep existing UI unchanged unless requested.
* Use existing design system and shadcn components.
* Do not introduce new state-management libraries.

## Testing

* Run relevant tests/build checks after modifications.
* Verify frontend build succeeds.
* Verify backend starts successfully.

## Security

* Never expose secrets.
* Use proper authentication and authorization.
* Prefer environment variables over hardcoded values.
