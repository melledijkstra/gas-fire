import { Config } from './config';

// Functions to setup the initial UI
export * from './ui';

// Remote procedure calls made by the client UI or triggers executed on the server
export * from './remote-calls';

// Custom functions that can be used within the Spreadsheet UI
export { MD5, GET_PROJECT_VERSION } from './exposed_functions';

export function test() {
  Config._loadConfigurations();
}
