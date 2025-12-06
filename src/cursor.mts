import type { Page } from "playwright";

/**
 * Set up cursor emulation on headless chrome.
 *
 * @param {Page} page The page instance.
 */
export async function cursorSetup(page: Page) {
  const source = `
    const style = document.createElement("style");
    style.textContent = \`
      .playwright-cursor {
        position: fixed;
        width: 32px;
        height: 32px;
        pointer-events: none;
        z-index: 99999;
        background-size: contain;
      }
      .playwright-cursor.default {
        background-image: var(--playwright-default-cursor-image);
        transform: translate(-10px, -7px);
      }
      .playwright-cursor.hand {
        background-image: var(--playwright-hand-cursor-image);
        transform: translate(-9px, -8px);
      }
    \`;
    document.head.appendChild(style);

    const cursor = document.createElement("div");
    cursor.className = "playwright-cursor default";
    document.body.appendChild(cursor);
    window.__cursor = cursor;

    document.addEventListener("mousemove", (e) => {
      cursor.style.left = e.clientX + "px";
      cursor.style.top = e.clientY + "px";
    });
  `;

  await page.evaluate(source);
}
