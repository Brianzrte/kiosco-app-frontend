## ADDED Requirements

### Requirement: Report workspace hierarchy

Report screens SHALL present their period/context and filtering controls before
summary metrics, charts and detailed data, using the shared visual language.
Metrics and charts SHALL not be added when no existing backend aggregate
supports them, and data-series colours SHALL remain distinct from decorative
pastels.

#### Scenario: Report explains its data context
- **WHEN** an Admin opens a report
- **THEN** the selected period and filters are visible before or alongside the
  metrics and detailed data they affect
