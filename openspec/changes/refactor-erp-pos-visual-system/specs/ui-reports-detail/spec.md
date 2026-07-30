## ADDED Requirements

### Requirement: Detail report data remains readable across widths

Each detailed report SHALL retain its filter, summary and dominant table/chart
in a responsive workspace layout. At narrow widths, controls MAY stack and
tables MAY use their existing responsive container, but the report shall not
lose its selected period, essential total or recovery action.

#### Scenario: Narrow report retains context
- **WHEN** an Admin views a detailed report at mobile width
- **THEN** its selected period, essential total and retry/empty action remain
  reachable without horizontal page overflow
