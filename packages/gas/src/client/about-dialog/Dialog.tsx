import { Application } from '../Application';

export const Dialog = () => {
  return (
    <Application>
      <p>Thank you for using Firesheet</p>
      <p>The code for this Google Apps Script can be found here:</p>
      <a target="_blank" href="https://github.com/melledijkstra/gas-fire">
        @melledijkstra/gas-fire
      </a>
    </Application>
  );
};
