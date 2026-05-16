// script.js

// Get the icon and feedback message elements.
const copyRssButton = document.getElementById('copyRssButton');
const copyMessage = document.getElementById('copyMessage');
const rssValue = document.getElementById('rssValue');

// RSS link.
const rssLink = `https://feed.xyzfm.space/d6gnt9hx86fv`;

if (rssValue) {
  rssValue.textContent = rssLink;
}

// Copy the RSS link to the clipboard when the icon is clicked.
async function copyRssLink() {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(rssLink);
      return;
    } catch (error) {
      // Fall back to the legacy copy path when clipboard permission is denied.
    }
  }

  // Create a temporary input.
  const tempInput = document.createElement('input');
  tempInput.style.position = 'absolute';
  tempInput.style.left = '-9999px'; // Hide the input.
  tempInput.value = rssLink;

  // Add the temporary input to the page.
  document.body.appendChild(tempInput);

  // Select the input content.
  tempInput.select();
  tempInput.setSelectionRange(0, 99999); // Mobile support.

  // Copy the content to the clipboard.
  document.execCommand('copy');

  // Remove the temporary input.
  document.body.removeChild(tempInput);
}

if (copyRssButton && copyMessage) {
  copyRssButton.addEventListener('click', async () => {
    await copyRssLink();
  
    // Show the copy success message.
    copyMessage.hidden = false;

    // Hide the success message after 2 seconds.
    setTimeout(() => {
      copyMessage.hidden = true;
    }, 2000);
  });
}
