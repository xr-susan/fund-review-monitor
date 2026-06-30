# Security Policy

This project is intended for personal fund review and research workflows. It is not investment advice and should not be used as the only source for trading decisions.

## Reporting a vulnerability

Please open a GitHub issue with reproduction steps and mark clearly that it is security related. Do not include real passwords, API keys, tokens, or private financial data.

## Production notes

- Set a strong `JWT_SECRET`.
- Change the default admin password before exposing the service.
- Restrict `CORS_ORIGIN` to your frontend origin.
- Keep the SQLite database and exported CSV files out of public repositories.
