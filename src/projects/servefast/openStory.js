// Opens an article in its own browser window rather than a tab, sized to sit
// over the right third of this one. The window is named, so a second story
// lands in the same window instead of piling up.
export default function openStory(event, url) {
  if (!url) return;
  // Leave the browser's own shortcuts alone: ctrl or middle click still makes
  // an ordinary tab.
  if (event?.metaKey || event?.ctrlKey || event?.shiftKey) return;
  event?.preventDefault?.();

  const ownWidth = window.outerWidth || window.screen?.availWidth || 1440;
  const ownHeight = window.outerHeight || window.screen?.availHeight || 900;
  const ownLeft = window.screenX ?? window.screenLeft ?? 0;
  const ownTop = window.screenY ?? window.screenTop ?? 0;
  const width = Math.max(Math.round(ownWidth / 3), 420);

  const features = [
    "popup=yes",
    `width=${width}`,
    `height=${ownHeight}`,
    `left=${ownLeft + ownWidth - width}`,
    `top=${ownTop}`,
    "noopener",
    "noreferrer",
  ].join(",");

  const opened = window.open(url, "servefastReading", features);
  if (!opened) window.open(url, "_blank", "noopener,noreferrer");
  else opened.focus();
}
