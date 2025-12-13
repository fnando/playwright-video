# playwright-video

Run [Playwright](https://playwright.dev/) scripts and generate videos.

## Installation

```bash
npm install -g @fnando/playwright-video
```

### Usage

```bash
playwright-video export path/to/your/script.mjs \
  --output-path path/to/output/video.mp4 \
  --state-path path/to/state.json \
  --color-scheme dark
```

You can also provide additional arguments to Chrome via `--`.

```bash
playwright-video export path/to/your/script.mjs \
  --output-path path/to/output/video.mp4 \
  --state-path path/to/state.json \
  --color-scheme dark \
  -- --autoplay-policy=no-user-gesture-required \
     --disable-popup-blocking \
     --disable-gpu
```

Your script must export a `run(options)` function. Here's an example:

```javascript
/**
 * @param  {import("@fnando/playwright-video").Utils} options Utilities
 */
export async function run({ visit, sleep, clickLink, pause, resume }) {
  await visit("https://nandovieira.com");

  resume(); // Start recording
  await sleep(1000);
  await clickLink({ text: "Using PostgreSQL and jsonb with Ruby on Rails" });
  await sleep(5000);
  pause(); // Stop recording
}
```

#### Utility Functions

The `options` object passed to the `run` function includes several utility
functions:

##### `sleep(duration)`

Sleep for a specified duration.

- `duration` (number): Duration in milliseconds

##### `waitUntilSatisfied(callback, timeout = 2000)`

Wait until a condition is satisfied or timeout occurs.

- `callback` (Function): A function that must return a truthy/falsy value
- `timeout` (Number): Timeout in milliseconds (default: 2000ms)

##### `setCursor(type)`

Set the cursor type.

- `type` (string): The cursor type ('default' or 'hand')

##### `moveMouseTo(x, y, { speed = 10 })`

Move mouse to specified coordinates with speed control.

- `x` (number): The x-coordinate to move to
- `y` (number): The y-coordinate to move to
- `speed` (number): Speed of mouse movement (pixels per step)

##### `scrollToElement({ selector, text, locator, duration = 500 })`

Scroll to an element with animation.

- `selector` (string): The selector of the element to scroll to
- `text` (string): The text of the element to scroll to
- `locator` (Locator): The locator of the element to scroll to
- `duration` (number): Duration of the scroll animation in milliseconds

##### `moveMouseToElement({ selector, text, locator, speed = 10 })`

Move mouse to an element specified by selector, text or locator.

- `selector` (string): The selector of the element to move to
- `text` (string): The text of the element to move to
- `locator` (Locator): The locator of the element to move to
- `speed` (number): The speed of mouse movement (pixels per step)

##### `clickLink({ selector, text, locator, delay, mouseSpeed = 10, scrollDuration = 500 })`

Click a link specified by selector or text, scrolling to it if necessary.

- `selector` (string): The selector of the element to click
- `text` (string): The text of the element to click
- `locator` (Locator): The locator of the element to click
- `delay` (number): The delay before clicking
- `mouseSpeed` (number): The speed of mouse movement
- `scrollDuration` (number): The duration of the scroll animation

##### `fillIn({ selector, text, delay = 100 })`

Fill in text into an input field specified by selector.

- `selector` (string): The selector of the input field
- `text` (string): The text to fill in
- `delay` (number): The speed of typing (delay between keystrokes)

##### `visit(url, options)`

Visit a URL with optional navigation options.

- `url` (string): The URL to visit
- `options` (Object): The same options as in `page.goto(url, options)`

##### `exists(selector)`

Check if an element exists on the page.

- `selector` (string): The selector of the element to check

Returns: `Promise<boolean>`

##### `pause()`

Pause video recording. Any actions performed after calling `pause()` will not be
included in the final video until `resume()` is called.

##### `resume()`

Resume video recording. Actions performed after calling `resume()` will be
included in the final video until `pause()` is called again.

#### Video Segmentation

By default, recording starts in a paused state. Use `resume()` and `pause()` to
control which parts of your script are included in the final video. The video
will only include segments between `resume()` and `pause()` calls.

If you have multiple pause/resume segments, they will be seamlessly concatenated
using ffmpeg. If you don't use pause/resume or only have a single segment, the
full video will be saved without processing.

Example:

```javascript
export async function run({ visit, sleep, pause, resume, clickLink }) {
  await visit("https://example.com");

  // Start recording
  resume();
  await clickLink({ text: "Login" });
  await sleep(1000);
  pause();

  // This part won't be in the video
  await sleep(5000);

  // Resume recording
  resume();
  await clickLink({ text: "Dashboard" });
  await sleep(2000);
  pause();
}
```

The final video will only contain the two segments where recording was active,
skipping the 5-second wait in between.

## Notes

- This package patches Playwright to enable .mp4 support,
- This package patches Playwright to enable `FFMPEG_BIN` and `CHROME_BIN`
  environment variables.

## Maintainer

- Nando Vieira - https://nandovieira.com

## Contributors

- https://github.com/fnando/browser/contributors

## License

(The MIT License)

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
