# Getting Started

GAS FIRE (Google Apps Script - Financial Independence Retire Early) is a project designed to help automate your finances using Google Sheets.

## Prerequisites

You will need to install the [clasp](https://developers.google.com/apps-script/guides/clasp) tooling globally or use the one installed via `pnpm`.

```bash
pnpm install
```

First time running clasp? Make sure to login first:

```bash
pnpm exec clasp login
```

## Configure Environment

1. Copy the `.env.sample` and `.clasp.json.sample` files and rename them to `.env` and `.clasp.json`.
2. Add your development and production environment Script IDs in the `.env` file.

To find your Script ID:
- Open your Apps Script project.
- Click "Project Settings".
- Under "IDs", copy the Script ID.

3. Switch between environments easily:

```bash
pnpm switch-env dev
```

## Development

Make your changes and then run the build and publish steps:

```bash
pnpm build
pnpm push
```
