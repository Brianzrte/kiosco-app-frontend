---
name: frontend-kiosco-app
description: Build the Kiosco App frontend in Next.js with fast operational UX, clear admin screens, and strict alignment with backend specs and API contracts.
---

# Kiosco App Frontend

Use this skill when designing or implementing frontend screens, components, flows, or client-side behavior for the Kiosco App.

This frontend is not a marketing site.  
It is an operational web application for a kiosk / small retail business.

Primary goals:

- speed of daily operation
- clarity of information
- low interaction friction
- predictable behavior
- alignment with backend rules and specs

Tech context:

- Next.js
- App Router
- backend API in Go
- modular backend with specs-driven contracts
- barcode reader behaves as keyboard input
- admin + point-of-sale style workflows

---

# Product Priorities

Always prioritize:

1. operational speed
2. readability
3. low error rate
4. simple navigation
5. consistency with backend rules

Visual polish is welcome, but it must never reduce usability.

Do not optimize for “fancy” UI over efficient workflows.

---

# Main Frontend Areas

Expected screens include:

- login
- dashboard / overview
- product list
- product create/edit form
- stock management
- sales / POS screen
- sales history
- reporting screens

Each screen must be optimized for its job.

Examples:

- sales screen → fast input, keyboard-friendly, immediate feedback
- product form → clear validation and compact layout
- reporting → readable filters and tables
- stock screens → precise quantities, visible reasons, safe actions

---

# UX Rules

## General UX

Design for real daily usage.

Prefer:

- clear layouts
- compact but readable forms
- visible actions
- explicit labels
- obvious success/error states
- low cognitive load

Avoid:

- oversized decorative cards
- unnecessary animations
- hidden critical actions
- ambiguous icons without labels
- excessive modal usage
- overloaded layouts

---

## POS / Sales Screen UX

This is one of the most critical screens.

It must prioritize:

- fast barcode input
- immediate product addition
- very clear cart state
- visible totals
- easy quantity changes
- fast confirmation
- explicit feedback on errors

Assume barcode readers behave as keyboard input.

The barcode entry flow should be optimized for continuous scanning.

Important behaviors:

- focused scan/input area when appropriate
- instant visual confirmation when a product is found
- clear error when barcode is unknown
- repeated scans should increment quantity when that is the defined behavior
- no unnecessary steps between scan and sale confirmation

---

## Forms UX

Forms must be:

- compact
- readable
- easy to validate
- explicit about required fields
- consistent across the app

Validation should exist in the frontend for usability, but backend remains the source of truth.

Always show actionable validation errors.

Avoid vague messages like:
- "Invalid input"

Prefer:
- "Price must be greater than 0"
- "Barcode is already assigned to another product"

---

## Tables and Lists

Many screens in this app are operational and should prefer tables over decorative layouts.

Use tables or dense list layouts for:

- product lists
- stock movements
- sales history
- reporting results

Tables should support, when relevant:

- search
- filters
- sorting
- pagination
- empty states
- loading states

Keep actions discoverable.

---

# Architecture and Data Rules

The frontend must align with backend API contracts and project specs.

Do not invent business rules in the frontend.

Frontend responsibilities:

- render data
- capture user input
- perform UI-level validation
- call backend APIs
- display loading, success, and error states

Backend responsibilities:

- business rules
- authorization decisions
- data integrity
- stock and sales consistency
- final validation

If the backend spec and UI expectation conflict, prefer the backend spec and surface the mismatch clearly.

---

# State Management

Prefer the simplest state management approach that fits the feature.

Guidelines:

- keep state local when possible
- avoid global state unless clearly needed
- separate server data from transient UI state
- avoid overengineering

Examples of transient UI state:

- current barcode input
- modal visibility
- selected filters
- form dirty state

Examples of server-backed state:

- products
- stock values
- sale history
- reports

Do not introduce complex state libraries unless the feature truly requires them.

---

# Component Design

Prefer small, composable, reusable components.

Separate:

- screen-level containers
- domain-specific UI sections
- reusable form fields
- tables
- feedback components

Good component characteristics:

- explicit props
- predictable behavior
- minimal hidden side effects
- accessible labels and actions

Avoid giant components that mix:
- layout
- fetching
- business transformations
- form handling
- modal logic
- table rendering

---

# Navigation

Navigation must be simple and operationally obvious.

Primary sections should be easy to reach:

- Sales
- Products
- Stock
- Reports
- Users / Sessions (if exposed in UI)

Avoid deep nesting unless it clearly improves usability.

Users should not need many clicks to reach common tasks.

---

# Error and Empty States

Always design explicit states for:

- loading
- empty data
- request failure
- validation failure
- success feedback

Errors must help the user recover.

Good examples:

- "Product not found for scanned barcode"
- "Sale could not be confirmed because stock update failed"
- "You do not have permission to adjust stock"

Bad examples:

- "Something went wrong"
- silent failures
- disappearing actions with no explanation

---

# Permissions and Security UX

The frontend must respect permission-based access.

Guidelines:

- hide or disable unauthorized actions when appropriate
- never rely on the frontend alone for authorization
- show clear feedback when an action is forbidden
- avoid exposing sensitive admin-only controls unnecessarily

---

# Reporting UX

Reporting screens should prioritize:

- readable filters
- clear date ranges
- understandable totals
- tabular results
- export-friendly layouts if needed later

Do not overload dashboards with unnecessary widgets.

For this project, useful and readable beats impressive.

---

# Performance Guidance

Optimize for perceived speed in common workflows.

Important areas:

- sales screen responsiveness
- product lookup speed
- smooth filtering/search in operational views

Prefer:

- clear loading states
- incremental rendering when appropriate
- avoiding unnecessary re-renders
- lightweight client behavior

Do not add complexity before there is evidence of a performance problem.

---

# Accessibility and Input Clarity

Use accessible labels and semantic controls.

Prioritize:

- keyboard usability
- visible focus states
- readable font sizes
- clear contrast
- obvious action labels

This is especially important in operational screens used repeatedly during the day.

---

# Testing Guidance

When creating frontend tests, prioritize:

- user-observable behavior
- form validation
- interaction flows
- loading / error / empty states
- sales flow behavior on the screen

Do not test implementation details of UI libraries.

Do not overuse snapshots.

---

# Design Tone

The UI should feel:

- professional
- clean
- efficient
- trustworthy
- calm under daily operational use

It should not feel like:
- a marketing landing page
- an experimental dashboard
- a toy interface

---

# When Not To Use This Skill

Do not use this skill for:

- backend implementation
- database design
- business rule definition
- infrastructure provisioning