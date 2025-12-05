/**
 * Built utilities bound to `page`.
 *
 * @param  {import("playwright").Page} page - The Playwright page instance
 * @return {object} Utility functions for interacting with the page
 */
export function utils(page) {
  let currentMouseX = 0,
    currentMouseY = 0;

  /**
   * Convert selector/text options to a Playwright locator
   * @param {object} options - Options with either selector or text
   * @returns {import("playwright").Locator}
   */
  function optionsToLocator({ selector = null, text = null }) {
    if (!selector && !text) {
      throw new Error("Must provide either selector or text");
    }
    return text
      ? page.getByText(text, { exact: true }).first()
      : page.locator(selector);
  }

  /**
   * Sleep for a specified duration
   * @param  {number} duration Duration in milliseconds
   * @return {Promise<void>}
   */
  function sleep(duration) {
    return new Promise((resolve) => {
      setTimeout(resolve, duration);
    });
  }

  /**
   * Wait until a condition is satisfied or timeout occurs.
   *
   * @param  {Function} callback A function that must return a truthy/falsy
   *                             value.
   * @param  {Number}   timeout  Timeout in milliseconds (default: 2000ms)
   * @return {Promise<void>}
   */
  async function waitUntilSatisfied(callback, timeout = 2000) {
    while (timeout > 0) {
      const result = await callback();

      if (result) {
        return;
      } else {
        await sleep(10);
        timeout -= 10;
      }
    }

    throw new Error("Timeout!");
  }

  /**
   * Set the cursor type.
   *
   * @param {string} type - The cursor type ('default' or 'hand')
   */
  function setCursor(type) {
    page.evaluate(`
      window.__cursor.className = 'playwright-cursor ${type}';
    `);
  }

  /**
   * Move mouse to specified coordinates with speed control.
   *
   * @param  {number} x             The x-coordinate to move to.
   * @param  {number} y             The y-coordinate to move to.
   * @param  {number} options.speed Speed of mouse movement (pixels per step).
   * @return {Promise<void>}
   */
  async function moveMouseTo(x, y, { speed = 10 } = {}) {
    setCursor("default");
    let mouseX = currentMouseX;
    let mouseY = currentMouseY;
    await page.mouse.move(mouseX, mouseY);

    const dx = x - mouseX;
    const dy = y - mouseY;
    const distance = Math.sqrt(dx ** 2 + dy ** 2);

    if (distance === 0) {
      return;
    }

    const steps = Math.ceil(distance / speed);
    const xIncr = dx / steps;
    const yIncr = dy / steps;

    for (let index = 0; index < steps; index++) {
      mouseX += xIncr;
      mouseY += yIncr;
      await page.mouse.move(Math.round(mouseX), Math.round(mouseY));
      await sleep(1);
    }

    await page.mouse.move(x, y);
    currentMouseX = x;
    currentMouseY = y;
  }

  /**
   * Scroll to an element with animation.
   *
   * @param  {string} options.selector The selector of the element to scroll to.
   * @param  {string} options.text     The text of the element to scroll to.
   * @param  {import("playwright").Locator} options.locator  The locator of the
   *                                                         element to scroll
   *                                                         to.
   * @param  {Number} options.duration  Duration of the scroll animation in
   *                                    milliseconds.
   * @return {Promise<void>}
   */
  async function scrollToElement({
    selector = null,
    text = null,
    locator = null,
    duration = 500,
  } = {}) {
    const element = locator || optionsToLocator({ selector, text });

    const box = await element.boundingBox();

    if (!box) {
      throw new Error("Element not found");
    }

    await page.evaluate(
      async ({ elementBox, dur }) => {
        const elementCenterAbsolute = elementBox.y + elementBox.height / 2;
        const viewportCenterAbsolute = window.scrollY + window.innerHeight / 2;
        const scrollDistance = elementCenterAbsolute - viewportCenterAbsolute;

        // Create scroll indicator
        const indicator = document.createElement("div");
        indicator.className = "playwright-scroll-indicator";
        const isScrollingUp = scrollDistance < 0;
        indicator.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        width: 30px;
        height: 83px;
        pointer-events: none;
        z-index: 99999;
        background-size: contain;
        background-repeat: no-repeat;
        background-image: var(--playwright-scroll-${isScrollingUp ? "up" : "down"}-image);
        opacity: 0;
        transition: opacity 500ms ease-in-out;
      `;
        document.body.appendChild(indicator);

        // Trigger fade-in
        requestAnimationFrame(() => {
          indicator.style.opacity = "1";
        });

        const startScroll = window.scrollY;
        const startTime = performance.now();

        return new Promise((resolve) => {
          function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / dur, 1);

            // Ease in-out function
            const eased =
              progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            const currentScroll = startScroll + scrollDistance * eased;
            window.scrollTo(0, currentScroll);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              // Fade out and remove indicator after animation completes
              indicator.style.opacity = "0";
              setTimeout(() => {
                indicator.remove();
                resolve();
              }, 500);
            }
          }

          requestAnimationFrame(animate);
        });
      },
      { elementBox: box, dur: duration },
    );
  }

  /**
   * Move mouse to an element specified by selector, text or locator.
   *
   * @param  {string} options.selector The selector of the element to move to.
   * @param  {string} options.text     The text of the element to move to.
   * @param  {import("playwright").Locator} options.locator  The locator of the
   *                                                         element to move to.
   * @param  {Number} options.speed    The speed of mouse movement (pixels per
   *                                   step).
   * @return {Promise<void>}
   */
  async function moveMouseToElement({
    selector = null,
    text = null,
    locator = null,
    speed = 10,
  } = {}) {
    setCursor("default");

    const element = locator || optionsToLocator({ selector, text });

    const box = await element.boundingBox();

    if (!box) {
      throw new Error("Element not found");
    }

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    await moveMouseTo(centerX, centerY, { speed });
  }

  /**
   * Click at the current mouse position.
   * @return {Promise<void>}
   */
  async function click() {
    await page.mouse.click(currentMouseX, currentMouseY);
  }

  /**
   * Click a link specified by selector or text, scrolling to it if necessary.
   *
   * @param  {Number}    options.delay          The delay before clicking.
   * @param  {Number}    options.mouseSpeed     The speed of mouse movement.
   * @param  {Number}    options.scrollDuration The duration of the scroll
   *                                            animation.
   * @param  {string} options.selector The selector of the element to move to.
   * @param  {string} options.text     The text of the element to move to.
   * @param  {import("playwright").Locator} options.locator  The locator of the
   *                                                         element to move to.
   * @return {Promise<void>}
   */
  async function clickLink({
    delay,
    mouseSpeed = 10,
    scrollDuration = 500,
    ...options
  } = {}) {
    // Create locator once and reuse it
    const locator = optionsToLocator(options);

    let box = await locator.boundingBox();

    if (!box) {
      throw new Error("Element not found");
    }

    // Get viewport info
    const { viewportHeight, scrollY } = await page.evaluate(() => ({
      viewportHeight: window.innerHeight,
      scrollY: window.scrollY,
    }));

    const viewportTop = scrollY;
    const viewportBottom = scrollY + viewportHeight;
    const elementTop = box.y;
    const elementBottom = box.y + box.height;

    // Check if element is outside viewport
    const isOffScreen =
      elementBottom < viewportTop || elementTop > viewportBottom;

    if (isOffScreen) {
      await scrollToElement({ locator, duration: scrollDuration });
      await sleep(100);
    }

    box = await locator.boundingBox();

    if (!box) {
      throw new Error("Element not found");
    }

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    setCursor("default");
    await moveMouseTo(centerX, centerY, { speed: mouseSpeed });
    setCursor("hand");
    await sleep(delay || 500);
    click();
  }

  /**
   * Fill in text into an input field specified by selector.
   *
   * @param  {string} options.selector The selector of the input field.
   * @param  {string} options.text     The text to fill in.
   * @param  {number} options.delay    The speed of typing (delay between
   *                                   keystrokes).
   * @return {Promise<void>}
   */
  async function fillIn({ selector, text, delay = 100 } = {}) {
    await page.locator(selector).pressSequentially(text, { delay });
  }

  /**
   * Visit a URL with optional navigation options.
   *
   * @param  {string} url     The URL to visit.
   * @param  {Object} options The same options as in `page.goto(url, options)`.
   * @return {Promise<void>}
   */
  async function visit(url, options) {
    await page.goto(url, { waitUntil: "load", ...options });
  }

  /**
   * Check if an element exists on the page.
   *
   * @param  {text} selector The selector of the element to check.
   * @return {Promise<bool>}
   */
  async function exists(selector) {
    return (await page.locator(selector).first().count()) > 0;
  }

  return {
    page,
    clickLink,
    exists,
    fillIn,
    moveMouseTo,
    moveMouseToElement,
    scrollToElement,
    setCursor,
    sleep,
    visit,
    waitUntilSatisfied,
  };
}
