# Expense Dashboard

Build a small personal expense-tracking web application.

The purpose of this project is to exercise the complete Taskflow autonomous development workflow, including parallel task execution, frontend design, automated test writing, code review, fixing, integration, PDF generation, and final validation.

## Core experience

A user can record personal expenses and browse their spending month by month.

The application's primary view is a monthly dashboard.

Transactions must be grouped and viewed by calendar month, for example:

- October 2026
- September 2026
- August 2026

Within a month, transactions are displayed newest first.

## Required features

Users must be able to:

- create a transaction;
- edit a transaction;
- delete a transaction;
- enter a description;
- enter an amount;
- select a category;
- select a transaction date;
- navigate between months;
- view all transactions for the selected month;
- search transactions by description;
- filter transactions by category;
- view total spending for the selected month;
- view spending totals by category;
- generate and download a PDF report for the selected month.

## Monthly PDF report

The user must be able to generate a PDF for the currently selected month.

The report should include:

- month and year;
- total spending for the month;
- totals grouped by category;
- all transactions for that month;
- transaction date;
- description;
- category;
- amount;
- generation date.

The report should be readable and suitable for saving or printing.

The PDF must represent the complete selected month, even if search or category filters are currently active in the UI.

An empty month should still generate a valid report showing that no transactions exist for that month.

The generated filename should clearly identify the month, for example:

`expenses-2026-10.pdf`

## Dashboard

For the currently selected month, show:

- month and year;
- total spending;
- category totals;
- a simple visual representation of category spending;
- transaction list;
- an action to generate the monthly PDF report.

The application must include useful:

- loading states;
- empty states;
- validation messages;
- API error states;
- PDF-generation error feedback.

## Validation

- Amount must be greater than zero.
- Description must not be empty.
- Date must be valid.
- Category must be valid.

## Persistence

Transactions must survive application restarts.

Use SQLite or another lightweight local persistent store appropriate to the selected stack.

## Quality expectations

The interface should be polished and responsive.

For frontend/UI implementation tasks, use the available frontend-design capability where appropriate.

New behavior should have automated tests.

PDF generation should have automated tests for its data/content logic where practical.

The project's `.taskcheck` should validate the complete application quickly enough to run before every Taskflow task is completed.

## Out of scope

Do not implement:

- user accounts;
- authentication;
- cloud deployment;
- bank integrations;
- multiple currencies;
- recurring payments;
- receipt uploads;
- AI categorization.

The project is intentionally scoped as a local single-user application for testing the Taskflow development workflow.