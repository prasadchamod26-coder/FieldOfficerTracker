const UPDATE_API = "https://api.github.com/repos/prasadchamod26-coder/FieldOfficerTracker/releases/latest";
const CURRENT_VERSION = "1.14";

async function checkForUpdates() {
  try {
    const response = await fetch(UPDATE_API, {
      headers: { "Accept": "application/vnd.github+json" },
      cache: "no-store"
    });

    if (!response.ok) throw new Error("GitHub check failed");

    const release = await response.json();
    const latestVersion = release.tag_name.replace(/^v/, "");

    if (latestVersion !== CURRENT_VERSION &&
        release.assets && release.assets.some(a => a.name === "app-release.apk")) {
      const apk = release.assets.find(a => a.name === "app-release.apk");

      if (confirm("අලුත් Update එකක් තිබෙනවා: " + latestVersion +
                  "\nදැන් Download කරන්නද?")) {
        if (window.AndroidBridge && window.AndroidBridge.downloadAndInstallApk) {
          window.AndroidBridge.downloadAndInstallApk(apk.browser_download_url);
        } else {
          window.open(apk.browser_download_url, "_blank");
        }
      }
    }
  } catch (error) {
    console.log("Update check:", error);
  }
}

window.addEventListener("load", () => {
  setTimeout(checkForUpdates, 2500);
});
