const checkLoginStatus = () => {
  // Example: Check for a specific DOM element that indicates logged-in status
  const isLoggedIn = document.querySelector('[title="My Account"]') !== null;

  return isLoggedIn;
};

chrome.runtime.sendMessage({
  message: 'loginState',
  loggedIn: checkLoginStatus(),
});
