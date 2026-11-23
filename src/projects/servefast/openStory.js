// Opens an article in its own browser window rather than a tab: a quarter of
// this window, bottom right, so it covers exactly one corner of it.
//
// A named window only takes its size and position from the features string
// the first time it is created, so later clicks would land in whatever size
// it had drifted to. We keep the handle and set it every time instead.

let reading = null;

function placement() {
  const screenWidth = window.screen?.availWidth || 1440;
  const screenHeight = window.screen?.availHeight || 900;
  const ownWidth = window.outerWidth || screenWidth;
  const ownHeight = window.outerHeight || screenHeight;
  const ownLeft = window.screenX ?? window.screenLeft ?? 0;
  const ownTop = window.screenY ?? window.screenTop ?? 0;

  // Half the width and half the height is a quarter of the area.
  const width = Math.min(Math.round(ownWidth / 2), screenWidth);
  const height = Math.min(Math.round(ownHeight / 2), screenHeight);
  const left = Math.max(Math.min(ownLeft + ownWidth - width, screenWidth - width), 0);
  const top = Math.max(Math.min(ownTop + ownHeight - height, screenHeight - height), 0);

  return { width, height, left, top };
}

export default function openStory(event, url) {
  if (!url) return;
  // Leave the browser's own shortcuts alone: ctrl or middle click still makes
  // an ordinary tab.
  if (event?.metaKey || event?.ctrlKey || event?.shiftKey) return;
  event?.preventDefault?.();

  const { width, height, left, top } = placement();
  const features = [
    "popup=yes",
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "noreferrer",
  ].join(",");

  try {
    if (reading && !reading.closed) {
      reading.location.href = url;
    } else {
      reading = window.open(url, "servefastReading", features);
    }

    if (!reading) {
      // Popups are blocked. A tab is better than nothing.
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    // Put it back where it belongs, whatever it had drifted to.
    reading.resizeTo(width, height);
    reading.moveTo(left, top);
    reading.focus();
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
