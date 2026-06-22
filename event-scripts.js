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

// Init dataLayer if it doesn't exist
window.dataLayer = window.dataLayer || [];

// Collect All Forms
let forms = document.querySelectorAll("form");
// Listen for Interaction With All Forms
forms.forEach(function (form) {
    form.addEventListener("click", formClick);
    // Push Engagement Event and Stop Listening
    function formClick() {
        window.dataLayer.push({ event: "formEngagement" });
        form.removeEventListener("click", formClick);
    }
});

const PHONE_LIB_URL =
    "https://cdn.jsdelivr.net/npm/libphonenumber-js@1.13.6/bundle/libphonenumber-max.js";
let phoneLibPromise;

function getPhoneContext(hostname) {
    const isNZ =
        hostname.includes(".co.nz") || hostname.includes("peninsula-anz-nz");
    const isAU =
        hostname.includes(".com.au") || hostname.includes("peninsula-anz-au");

    return {
        isAU,
        isNZ,
        defaultCountry: isAU ? "AU" : isNZ ? "NZ" : undefined,
    };
}

function loadPhoneLibrary() {
    if (window.libphonenumber?.parsePhoneNumberFromString) {
        return Promise.resolve(window.libphonenumber);
    }

    if (phoneLibPromise) {
        return phoneLibPromise;
    }

    phoneLibPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector(
            `script[src="${PHONE_LIB_URL}"]`,
        );

        if (existingScript) {
            existingScript.addEventListener(
                "load",
                () => resolve(window.libphonenumber),
                { once: true },
            );
            existingScript.addEventListener(
                "error",
                () => reject(new Error("Failed to load phone library.")),
                { once: true },
            );
            return;
        }

        const script = document.createElement("script");
        script.src = PHONE_LIB_URL;
        script.async = true;
        script.onload = () => resolve(window.libphonenumber);
        script.onerror = () =>
            reject(new Error("Failed to load phone library."));
        document.head.appendChild(script);
    }).catch((error) => {
        console.warn("Phone validation library unavailable.", error);
        return null;
    });

    return phoneLibPromise;
}

function normalizePhoneFallback(candidate, phoneContext) {
    let phoneNumber = candidate.replace(/(?!^)\+/g, "").replace(/[^\d+]/g, "");
    let country = "";

    if (!phoneNumber) {
        return null;
    }

    if (phoneNumber.startsWith("0")) {
        if (phoneContext.isAU) {
            phoneNumber = "+61" + phoneNumber.slice(1);
            country = "AU";
        } else if (phoneContext.isNZ) {
            phoneNumber = "+64" + phoneNumber.slice(1);
            country = "NZ";
        }
    } else if (!phoneNumber.startsWith("+")) {
        if (phoneContext.isAU) {
            phoneNumber = "+61" + phoneNumber;
            country = "AU";
        } else if (phoneContext.isNZ) {
            phoneNumber = "+64" + phoneNumber;
            country = "NZ";
        }
    } else if (phoneNumber.startsWith("+61")) {
        country = "AU";
    } else if (phoneNumber.startsWith("+64")) {
        country = "NZ";
    }

    const phoneLength = phoneNumber.length;
    const isValidLength =
        phoneLength <= 15 &&
        ((country === "AU" && phoneLength >= 11) ||
            (country === "NZ" && phoneLength >= 11));

    if (!isValidLength) {
        return null;
    }

    return { phoneNumber, country };
}

function extractPhoneCandidates(text) {
    if (!text) {
        return [];
    }

    const matches = text.match(/(?:\+?\d[\d\s().-]{6,}\d)/g) || [];
    return matches.map((match) => match.trim());
}

async function resolveValidPhone(input, phoneContext) {
    const candidates = Array.isArray(input) ? input : [input];
    const phoneLib = await loadPhoneLibrary();

    for (const candidate of candidates) {
        if (!candidate) {
            continue;
        }

        if (phoneLib?.parsePhoneNumberFromString) {
            try {
                const parsedPhone = phoneLib.parsePhoneNumberFromString(
                    candidate,
                    phoneContext.defaultCountry,
                );
                if (parsedPhone?.isValid()) {
                    return {
                        phoneNumber: parsedPhone.number,
                        country:
                            parsedPhone.country ||
                            phoneContext.defaultCountry ||
                            "",
                    };
                }
            } catch (error) {
                console.warn("Phone parsing failed for candidate.", error);
            }
        }

        const fallbackPhone = normalizePhoneFallback(candidate, phoneContext);
        if (fallbackPhone) {
            return fallbackPhone;
        }
    }

    return null;
}

function waitForGenesysReady(callback, retries = 100, interval = 250) {
    const check = () => {
        try {
            if (
                typeof window.Genesys === "function" &&
                window.Genesys("subscribe")
            ) {
                callback();
                return;
            }
        } catch (e) {
            // Genesys may throw if not ready
        }

        if (retries > 0) {
            setTimeout(
                () => waitForGenesysReady(callback, retries - 1, interval),
                interval,
            );
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
        window.dataLayer.push({ event: "chatOpen" });
    });

    // Primary: Subscribe to SessionDataUpdated to capture phone from participant data
    Genesys("subscribe", "genesys-messenger-event", async function (event) {
        if (event?.data?.type === "SessionDataUpdated") {
            const participantData = event?.data?.participantData;
            if (participantData?.phoneNumber) {
                const hostname = window.location.hostname;
                const phoneContext = getPhoneContext(hostname);
                const phone = await resolveValidPhone(
                    participantData.phoneNumber,
                    phoneContext,
                );

                if (phone) {
                    window.dataLayer.push({
                        event: "chatPhoneCapture",
                        hostname,
                        phoneNumber: phone.phoneNumber,
                        country: phone.country,
                        source: "SessionDataUpdated",
                    });
                }
            }
        }
    });

    // Fallback: Keep existing regex logic for messagesReceived
    Genesys(
        "subscribe",
        "MessagingService.messagesReceived",
        async function ({ data }) {
            const inbound = data?.messages?.[0]?.direction == "Inbound";
            if (!inbound) return; // Only process inbound messages
            const capture = data?.messages?.[0]?.text;
            const hostname = window.location.hostname;
            const phoneContext = getPhoneContext(hostname);

            const emailRegex =
                /[a-zA-Z0-9_.-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
            const email = capture?.match(emailRegex);
            if (email) {
                window.dataLayer.push({ event: "chatEmailCapture", email: email });
            }

            const phone = await resolveValidPhone(
                extractPhoneCandidates(capture),
                phoneContext,
            );
            if (phone) {
                window.dataLayer.push({
                    event: "chatPhoneCapture",
                    hostname,
                    phoneNumber: phone.phoneNumber,
                    country: phone.country,
                    source: "messagesReceived",
                });
            }
        },
    );

    Genesys("subscribe", "Database.updated", function (event) {
        console.log("Custom event received:", event);
        const attributes = event.data.messaging.customAttributes;

        // Check if the target phone number attribute exists in the event payload
        if (attributes && attributes.intPhoneNumber) {
            const phone = attributes.intPhoneNumber;
            const country = attributes.countryCode || "";
            const hostname = window.location.hostname;

            const dlEvent = {
                event: "chatPhoneCapture",
                hostname,
                phoneNumber: phone,
                country: country,
                source: "databaseUpdated",
            };

            window.dataLayer = window.dataLayer || [];
            // window.dataLayer.push(dlEvent);

            console.log("Custom phone capture event:", dlEvent);
        }
    });
});
