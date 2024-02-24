chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse): undefined => {
    if (message.loggedIn !== undefined) {
      console.log('Logged in status: ', message.loggedIn);
      // You can perform further actions based on the login status
    }
  }
);

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse): undefined => {
    console.log('Message received', message);
    if (message === 'fetch') {
      fetchCSV();
    }
  }
);

const fetchCSV = async (): Promise<string> => {
  const startDate = '2024-02-21';
  const endDate = '2024-02-24';

  const response = await fetch(
    `https://app.n26.com/download-csv?_csrf=7hRmTxR7-6pGdVWN6lrn8TKRIBhP3fIVwPrU&Start+Date=2024-02-23&End+Date=2024-02-24&startDate=1708642800000&endDate=1708815599999`
  );

  const result = await response.text();

  console.log({ result });

  return result;
};
