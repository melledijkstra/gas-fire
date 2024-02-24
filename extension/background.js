chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.loggedIn !== undefined) {
    console.log('Logged in status: ', message.loggedIn);
    // You can perform further actions based on the login status
  }
});
