// Create YouTube iFrame API
let ytAPI = document.createElement("script");
ytAPI.src = "https://www.youtube.com/iframe_api";
ytAPI.onload = function () {
  // The script has loaded.
  window.onYouTubeIframeAPIReady = function () {
    // The YouTube object is now available.
    loopThroughYouTubeEmbeds();
  };
};
document.body.appendChild(ytAPI);

async function loopThroughYouTubeEmbeds() {
  // Get all of the YouTube embeds on the page.
  const embeds = document.querySelectorAll('iframe[src*="youtube.com/embed/"]');
  // Loop through the embeds and set up event listeners.
  for (const embed of embeds) {
    // Add the ?enablejsapi=1 parameter to the embed.
    await addEnableJsapiParameter(embed);
    // Create a new YouTube player object.
    const player = new YT.Player(embed, {
      events: {
        onStateChange: onStateChange,
      },
    });

    // Set up event listeners for play, pause, and stop.
    function onStateChange(event) {
      switch (event.data) {
        case YT.PlayerState.PLAYING:
          dataLayer.push({ event: "videoPlay" });
          break;
        case YT.PlayerState.PAUSED:
          dataLayer.push({ event: "videoPause" });
          break;
        case YT.PlayerState.ENDED:
          dataLayer.push({ event: "videoEnded" });
          break;
      }
    }
  }
}
async function addEnableJsapiParameter(iframe) {
  // Get the src attribute of the iframe.
  let src = iframe.getAttribute("src");
  // Collect url for origin.
  let host = "https://" + location.host;
  // Check if the src attribute already contains the ?enablejsapi=1 parameter.
  if (!src.includes("?enablejsapi=1&origin=" + host)) {
    // Add the ?enablejsapi=1 parameter to the src attribute.
    src += "?enablejsapi=1&origin=" + host;
    // Set the src attribute of the iframe to the new value.
    iframe.setAttribute("src", src);
  }
}

// Collect All Forms
let forms = document.querySelectorAll("form");
// Listen for Interaction With All Forms
forms.forEach(function (form) {
  form.addEventListener("click", formClick);
  // Push Engagement Event and Stop Listening
  function formClick() {
    dataLayer.push({ event: "formEngagement" });
    form.removeEventListener("click", formClick);
  }
});

if(window.drift) {
// Push Conversion Start Event
window.drift.on("startConversation", function () {
  dataLayer.push({ event: "chatOpen" });
});
// Push Email Capture Event
window.drift.on("emailCapture", function () {
  dataLayer.push({ event: "chatEmailCapture" });
});
// Push Phone Capture Event
window.drift.on("phoneCapture", function () {
  dataLayer.push({ event: "chatPhoneCapture" });
});
}

if(window.Genesys) {
// PureCloud Conversation Start Event
Genesys("subscribe", "Conversations.started", function () {
  dataLayer.push({ event: "chatOpen" });
});
// Capture incoming messages
Genesys("subscribe", "MessagingService.messagesReceived", function ({ data }) {
  // Store json into object variable
  const jsonObject = data;
  // Pull response text into variable
  const capture = jsonObject.messages[0].text;
  // Regex for Email
  const emailRegex = /[a-zA-Z0-9_.-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  // Check string if it matches regex
  const email = capture.match(emailRegex);
  // If true console log
  if (email) {
    dataLayer.push({ event: "chatEmailCapture" });
  }
  // Regex for Phone number both local and mobile
  const phoneRegex =
    /^(\+?61|\d)?(0?[2-9]\d{2}|\d{3})([- ]?)?\d{7}|^(\+?61|\d)?\d{10}$/;
  // Check string if it matches regex
  const phone = capture.match(phoneRegex);
  // If true console log
  if (phone) {
    dataLayer.push({ event: "chatPhoneCapture" });
  }
});
}

// Collect all phone number links on the page
let phoneButtons = document.querySelectorAll("a[href^='tel:']");
phoneButtons.forEach(function(phoneButton) {
  // Watch each phone number for clicks
  phoneButton.addEventListener("click", function() {
    console.log("Fired Event");
    // When clicked fire event
    dataLayer.push({ event: "phoneButtonClick" });
  })
});
