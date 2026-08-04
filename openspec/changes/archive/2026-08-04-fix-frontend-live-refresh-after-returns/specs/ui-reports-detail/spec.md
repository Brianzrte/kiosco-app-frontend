## MODIFIED Requirements

### Requirement: Daily sales report

`/reports/sales` SHALL list one row per calendar day in the selected range, each showing the date, the day's total revenue, how much of it was paid in cash, how much by card, how much by bank transfer, and the cashier. The day grouping and every per-day monetary total SHALL come from a backend aggregation; the frontend SHALL NOT group individual sales by date nor recompute a day's payment amounts client-side. Range-level summary totals SHALL come from backend report aggregations and SHALL NOT be summed from paginated day rows in the client. A payment method the backend does not report for a day SHALL render as zero rather than being omitted, so the columns stay aligned across rows. The day rows SHALL be paginated by the backend, and the report SHALL expose controls to move between available pages. The cashier column SHALL show at most three cashier badges per day; when more than three cashiers exist, it SHALL show an additional `...` badge with the omitted cashier names available through its accessible label and native tooltip. While the sales report screen stays mounted and visible, it SHALL re-fetch the current day-breakdown page and range summary (same range and page already selected) on a fixed interval, so a sale or return registered elsewhere — including from another device — becomes reflected without the Admin navigating away or reloading. A background refresh that fails SHALL be ignored, keeping the previously loaded rows and summary on screen.

#### Scenario: Days listed with payment split
- **WHEN** an Admin opens the sales report for a range
- **THEN** each visible day in the selected backend page appears with its total, its cash, card, and transfer amounts, and its cashier

#### Scenario: Grouping is never done client-side
- **WHEN** the report renders
- **THEN** it consumes rows already grouped by day from the backend, and does not fetch a paginated listing of individual sales to group them

#### Scenario: Method with no sales that day
- **WHEN** a day has no payments of a given method
- **THEN** that column shows zero for that day rather than being blank or absent

#### Scenario: Range with no sales
- **WHEN** the selected range contains no confirmed sales
- **THEN** an empty state explains there are no sales in the period

#### Scenario: Day rows are paginated
- **WHEN** the selected range contains more days than the page size
- **THEN** the frontend requests and displays one backend page at a time and allows navigation to the other pages using the returned total

#### Scenario: Summary is stable across pages
- **WHEN** an Admin changes the day-row page
- **THEN** the range summary cards remain based on the complete backend aggregation for the selected date range and do not change to reflect only the visible page

#### Scenario: Summary appears before filters
- **WHEN** the sales report has loaded data
- **THEN** the summary carousel appears before the filters panel, and the filters panel appears before the daily rows

#### Scenario: Report picks up a change registered elsewhere without navigating
- **WHEN** the sales report stays open on a range and a sale or a return affecting that range is registered by someone else from another device
- **THEN** within one refresh interval the affected day row and the range summary update to reflect the current backend aggregation, without the Admin reloading or navigating away

#### Scenario: Background refresh failure keeps the last good data
- **WHEN** a periodic refresh of the day-breakdown or range summary fails while data from a previous successful load is already shown
- **THEN** the previously loaded rows and summary stay on screen, no error replaces them, and the next interval tick retries

#### Scenario: Background refresh does not reset filters or the current page
- **WHEN** a periodic refresh tick occurs while the Admin has a specific range and day-row page selected
- **THEN** the refresh re-fetches that same range and page, and does not reset the selection to the default range or the first page
