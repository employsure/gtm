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

function waitForGenesys(callback, retries = 20, interval = 500) {
  const check = () => {
    if (typeof window.Genesys === "function" && window.Genesys.q) {
      callback();
    } else if (retries > 0) {
      setTimeout(() => waitForGenesys(callback, retries - 1, interval), interval);
    } else {
      console.warn("Genesys not available after waiting.");
    }
  };
  check();
}

// Use this to safely subscribe to events
waitForGenesys(() => {
  Genesys("subscribe", "Conversations.started", function () {
    dataLayer.push({ event: "chatOpen" });
  });

  Genesys("subscribe", "MessagingService.messagesReceived", function ({ data }) {
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
