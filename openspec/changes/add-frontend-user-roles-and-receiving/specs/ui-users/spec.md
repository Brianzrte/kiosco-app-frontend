# ui-users

## ADDED Requirements

### Requirement: User row opens the user detail
The frontend SHALL make each row of the user list activate the user's detail at `/users/[id]`, by pointer and by keyboard, with a visible focus state. The row SHALL NOT swallow the activation of controls nested inside it: the deactivation action stays reachable without navigating.

#### Scenario: Row opens the detail
- **WHEN** an Admin activates a user row
- **THEN** the frontend navigates to that user's detail

#### Scenario: Reachable by keyboard
- **WHEN** an Admin tabs to a user row and presses Enter
- **THEN** the same navigation happens, and the row shows a visible focus indicator

#### Scenario: Nested action does not navigate
- **WHEN** an Admin activates the deactivation control inside a row
- **THEN** the deactivation flow opens and no navigation occurs

### Requirement: User detail
The frontend SHALL render a user detail at `/users/[id]`, restricted to Admin, showing username, roles, active state, creation date and profile data (first name, last name, phone, address). Username and password SHALL be displayed as non-editable, because the backend exposes no flow to change them; the detail SHALL state this rather than render a disabled field with no explanation. The screen SHALL handle loading, empty and error states explicitly.

#### Scenario: Admin opens a user
- **WHEN** an Admin opens `/users/[id]` for an existing user
- **THEN** the user's username, roles, state, creation date and profile data are shown

#### Scenario: Non-Admin is kept out
- **WHEN** a user without role `admin` navigates directly to `/users/[id]`
- **THEN** they are redirected away and no user data is requested

#### Scenario: Unknown user
- **WHEN** the backend responds `404` for the requested id
- **THEN** the screen states that the user does not exist and offers returning to the list

### Requirement: Edit profile data
The frontend SHALL allow an Admin to edit a user's profile data — first name, last name, phone and address — from the detail, submitting to `PUT /users/{id}`. Every field is optional; an empty value is valid and is sent as an empty string. The submit action SHALL be disabled while the request is in flight, backend errors SHALL be shown inline near the offending field, and a success toast SHALL confirm the save.

#### Scenario: Successful edit
- **WHEN** an Admin changes the phone and saves
- **THEN** the request is sent, the detail shows the updated value, and a success toast confirms it

#### Scenario: Clearing a field
- **WHEN** an Admin empties the address and saves
- **THEN** the field is sent as an empty string and is accepted

#### Scenario: Backend rejects the edit
- **WHEN** the backend responds with an error
- **THEN** the `message` is shown inline in the form and no toast is raised

### Requirement: Assign multiple roles to a user
The frontend SHALL allow an Admin to assign one or more roles to a user from the detail, submitting the full set to `PUT /users/{id}/roles`. Roles are presented as a multiple-selection control listing every role with its description, not as free text and not as a single exclusive choice. The frontend SHALL prevent submitting an empty set, stating that a user must keep at least one role. Role gating in the UI SHALL treat permissions as the union of the assigned roles. The frontend SHALL NOT enforce any other role rule — such as whether the last Admin may lose the role — because that is a backend decision; it SHALL surface the backend's `message` when it rejects.

#### Scenario: Assign a second role
- **WHEN** an Admin adds role `receiving` to a user who already holds `cashier` and saves
- **THEN** both roles are submitted, the detail shows both, and a success toast confirms it

#### Scenario: Empty set is refused client-side
- **WHEN** an Admin clears every role
- **THEN** the save action is disabled and the form states that at least one role is required

#### Scenario: Backend refuses the change
- **WHEN** the backend rejects the new set, for instance because it would leave no active Admin
- **THEN** the backend's `message` is shown inline and the previously assigned roles remain displayed

#### Scenario: Admin removes their own Admin role
- **WHEN** an Admin edits their own user and removes role `admin`
- **THEN** the frontend warns, before confirming, that they will lose access to the administration sections

#### Scenario: Roles drive the union of permissions
- **WHEN** a user holds `cashier` and `receiving`
- **THEN** the navigation shows the sections of both roles and neither role's sections are hidden by the other

### Requirement: Roles are listed as a set
The frontend SHALL display a user's roles as a set of badges in the user list and in the detail, never as a single value. Every role SHALL render with a Spanish label, including `receiving` as "Recepción", described as loading stock and receiving supplier orders without editing the catalog.

#### Scenario: User with several roles in the list
- **WHEN** the list contains a user holding two roles
- **THEN** both roles are shown as badges in that row

#### Scenario: Receiving role is described
- **WHEN** the role selection control is displayed
- **THEN** role `receiving` appears labelled "Recepción" with a description stating it loads stock and receives orders but does not edit the catalog
