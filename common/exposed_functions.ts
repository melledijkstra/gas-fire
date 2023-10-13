/**
 * Imports JSON data to your spreadsheet
 * @param url URL of your JSON data as string
 * @param xpath simplified xpath as string
 * @customfunction
 */
function IMPORTJSON(url: string, xpath: string) {
  try {
    // /rates/EUR
    var res = UrlFetchApp.fetch(url);
    var content = res.getContentText();
    var json = JSON.parse(content);

    var patharray = xpath.split('.');
    //Logger.log(patharray);

    for (let i = 0; i < patharray.length; i++) {
      json = json[patharray[i]];
    }

    if (typeof json === 'undefined') {
      return 'Node Not Available';
    } else if (typeof json === 'object') {
      var tempArr = [];

      for (var obj in json) {
        tempArr.push([obj, json[obj]]);
      }
      return tempArr;
    } else if (typeof json !== 'object') {
      return json;
    }
  } catch (err) {
    return 'Error getting data';
  }
}

/**
 * MD5 function for GAS(GoogleAppsScript)
 *
 * You can get a MD5 hash value
 * ------------------------------------------
 * Usage1:
 *   `=MD5("YourStringToHash")`
 *     or
 *   `=MD5( A1 )`
 *   to use the A1 cell value as the argument of MD5.
 *
 *   result:
 *     `FCE7453B7462D9DE0C56AFCCFB756193`
 *
 *     For your sure-ness you can verify it locally in your terminal as below.
 *     `$ md5 -s "YourStringToHash"`
 *
 * Usage2:
 *   `=MD5("YourStringToHash", true)` for short Hash
 *
 *   result:
 *     `6MQH`
 *     Note that it has more conflict probability.
 *
 * How to install:
 *   Copy the scipt, pase it at [Extensions]-[Apps Script]-[Editor]-[<YourProject>.gs]
 *   or go to https://script.google.com and paste it.
 *   For more details go:
 *     https://developers.google.com/apps-script/articles/
 *
 * License: WTFPL (But mentioning the URL to the latest version is recommended)
 *
 * Version: 1.1.0.2022-11-24
 * Latest version:
 *   https://gist.github.com/KEINOS/78cc23f37e55e848905fc4224483763d
 *
 * Author/Collaborator/Contributor:
 *   KEINOS @ https://github.com/keinos
 *   Alex Ivanov @ https://github.com/contributorpw
 *   Curtis Doty @ https://github.com/dotysan
 *   Haruo Nakayama @ https://github.com/harupong
 *
 * References and thanks to:
 *   https://stackoverflow.com/questions/7994410/hash-of-a-cell-text-in-google-spreadsheet
 *   https://gist.github.com/KEINOS/78cc23f37e55e848905fc4224483763d#gistcomment-3129967
 *   https://gist.github.com/dotysan/36b99217fdc958465b62f84f66903f07
 *   https://developers.google.com/apps-script/reference/utilities/utilities#computedigestalgorithm-value
 *   https://cloud.google.com/dataprep/docs/html/Logical-Operators_57344671
 *   https://gist.github.com/KEINOS/78cc23f37e55e848905fc4224483763d#gistcomment-3441818
 * ------------------------------------------
 *
 * @param {string} input    The value to hash.
 * @return {string}         The hashed input value.
 * @customfunction
 */
function MD5(input: string): string {
  var txtHash = '';
  var rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    input,
    Utilities.Charset.UTF_8 // Multibyte encoding env compatibility
  );

  for (let i = 0; i < rawHash.length; i++) {
    var hashVal = rawHash[i];

    if (hashVal < 0) {
      hashVal += 256;
    }
    if (hashVal.toString(16).length == 1) {
      txtHash += '0';
    }
    txtHash += hashVal.toString(16);
  }

  return txtHash;
}
