# GAS - FIRE

[![Build Check](https://github.com/melledijkstra/gas-fire/actions/workflows/main.yml/badge.svg)](https://github.com/melledijkstra/gas-fire/actions/workflows/main.yml)

The title stands for Google Apps Script - Financial Independence Retire Early.
This project helps with google sheets tasks and is used to keep my finances automated.

More info can be found here:
https://developers.google.com/apps-script/guides/typescript

## Development

You will need to install the clasp tooling (@google/clasp)

1. > npm install

First time running clasp? make sure to login first, follow this guide:
https://developers.google.com/apps-script/guides/clasp

### Configure clasp environment

2. Copy the `.env.sample` & `.clasp.json.sample` examples and rename then to `.env` and `.clasp.json`.

In the `.env` you will want to add your development and production environment Script IDs.
You can choose to use just one environment if that is what is you have.

To find the Google Apps Script ID for your project:
- Open Apps Script project
- click "Project Settings"
- Under "IDs", copy the Script ID

<br />

3. Then run `npm run switch-env <env>` to switch between environments.
It will simply update your `.clasp.json` with the script ID for that environment.

4. Then you are ready to make changes make your changes
5. > npm run build
6. > npm run publish (or manually "clasp push")
