## ADDED Requirements

### Requirement: Dashboard metrics support operational scanning

The reports dashboard SHALL use summary metric cards only for existing,
decision-relevant aggregates and SHALL group report entry points separately
from data summaries. Each metric card SHALL include a text label and value;
its visual accent shall not be required to understand the metric.

#### Scenario: Dashboard does not invent an aggregate
- **WHEN** the dashboard is visually refactored
- **THEN** every displayed metric is supplied by an existing supported endpoint
  or existing display shaping permitted by the report specifications
