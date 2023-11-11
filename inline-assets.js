const fs = require('fs/promises');
const path = require('path');
const { JSDOM } = require('jsdom');

const SCRIPT_SELECTOR = 'script[src]';
const STYLE_SELECTOR = 'link[rel="stylesheet"]';

const acceptedTags = ['script', 'link'];

/**
 * @param {string} dirPath
 * @param {boolean} removeAssets
 */
const inlineAssets = async (dirPath, removeAssets) => {
  try {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
      // ignore files that are not HTML files
      if (!file.endsWith('.html')) {
        continue;
      }

      // 1. Find needed HTML files
      console.log('Processing:', file);
      const filePath = path.join(dirPath, file);
      const htmlContent = await fs.readFile(filePath, 'utf8');

      // 2. retrieve contents and parse their HTML
      const dom = new JSDOM(htmlContent);
      const { document: htmlDocument } = dom.window;

      // 3. find any javascript && css files inside the HTML
      const assetTags = [
        ...htmlDocument.querySelectorAll(SCRIPT_SELECTOR),
        ...htmlDocument.querySelectorAll(STYLE_SELECTOR),
      ];

      for (const tag of assetTags) {
        const tagUrl = tag.getAttribute(
          tag.tagName === 'LINK' ? 'href' : 'src'
        );
        if (
          // ignore tags that are not assets
          !acceptedTags.includes(tag.tagName.toLowerCase()) ||
          // or that have external assets which we don't want to process
          tagUrl.startsWith('http')
        ) {
          continue;
        }

        const assetPath = path.join(
          dirPath,
          tag.getAttribute(tag.tagName === 'LINK' ? 'href' : 'src')
        );

        // make sure asset exists
        if (!(await exists(assetPath))) {
          console.warn(
            '\x1b[33m%s\x1b[0m',
            `\tAsset: ${assetPath} does not exist`
          );
          continue;
        }

        // 4. extract assets contents
        console.log(`\t${assetPath}`);
        const content = await fs.readFile(assetPath, 'utf8');
        const elem = htmlDocument.createElement(
          tag.tagName === 'LINK' ? 'style' : 'script'
        );
        elem.textContent = content;
        tag.replaceWith(elem);

        if (removeAssets) {
          await fs.unlink(assetPath);
        }
      }

      // write HTML back to the file
      await fs.writeFile(filePath, dom.serialize());
    }
  } catch (err) {
    console.error('Error processing directory:', err);
  }
};

/**
 * @param {import("fs").PathLike} filePath
 */
const exists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

(async () => {
  console.log('--- Asset Inliner Started ---');

  // Command-line arguments handling
  const [, , relativeDirPath, deleteFlag] = process.argv;

  if (!relativeDirPath) {
    throw Error('Please specify a directory!');
  }

  const dirPath = path.resolve(relativeDirPath);
  const deleteAssets = deleteFlag === '--delete';

  // Usage: node inline-assets.js <directory-path> [--delete]
  // Make sure to input a directory relative to where the script is running
  await inlineAssets(dirPath, deleteAssets);

  console.log('-----------------------------');
})();
