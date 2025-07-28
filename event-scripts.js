/* 
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
*/

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

function waitForGenesysReady(callback, retries = 30, interval = 100) {
  const check = () => {
    try {
      if (typeof window.Genesys === "function" && window.Genesys("subscribe")) {
        callback();
        return;
      }
    } catch (e) {
      // Genesys may throw if not ready
    }

    if (retries > 0) {
      setTimeout(() => waitForGenesysReady(callback, retries - 1, interval), interval);
    } else {
      console.warn("Genesys not available after waiting.");
    }
  };
  check();
}

console.log("Waiting for Genesys...");
// Use this to safely subscribe to events
waitForGenesysReady(() => {
  console.log("Genesys is ready, subscribing to events...");

  Genesys("subscribe", "Conversations.started", function () {
    dataLayer.push({ event: "chatOpen" });
  });

  Genesys("subscribe", "MessagingService.messagesReceived", function ({ data }) {
    const inbound = data?.messages?.[0]?.direction === "inbound";
    if (!inbound) return; // Only process inbound messages
    const capture = data?.messages?.[0]?.text;
    const hostname = window.location.hostname;
    const isNZ = hostname.includes(".co.nz") || hostname.includes('peninsula-anz-nz');
    const isAU = hostname.includes(".com.au") || hostname.includes('peninsula-anz-au');

    const emailRegex = /[a-zA-Z0-9_.-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    const email = capture?.match(emailRegex);
    if (email) {
      dataLayer.push({ event: "chatEmailCapture", email: email });
    }

    const phoneRegex = /(\+?\d{1,3})?[\s\-]?\(?\d+\)?[\s\-]?\d+[\s\-]?\d+/;
    const phoneMatch = capture?.match(phoneRegex);
    if (phoneMatch) {
      let rawNumber = phoneMatch[0].replace(/[^\d+]/g, "");
      let country = "";
      if (rawNumber.startsWith("0")) {
        if (isAU) rawNumber = "+61" + rawNumber.slice(1), country = "AU";
        else if (isNZ) rawNumber = "+64" + rawNumber.slice(1), country = "NZ";
      } else if (!rawNumber.startsWith("+")) {
        if (isAU) rawNumber = "+61" + rawNumber, country = "AU";
        else if (isNZ) rawNumber = "+64" + rawNumber, country = "NZ";
      }

      dataLayer.push({
        event: "chatPhoneCapture",
        hostname,
        phoneNumber: rawNumber,
        country
      });
    }
  });
});
