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
