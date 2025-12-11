import { Command } from "commander";
import fs from "fs";
import url from "url";
import path from "path";
import process from "process";
import os from "os";
import { chromium, type BrowserContext, type Browser } from "playwright";

const bareIndex = process.argv.indexOf("--");
const hasBare = bareIndex >= 0;
const argv = hasBare ? process.argv.slice(0, bareIndex) : process.argv;
const chromeArgs = hasBare ? process.argv.slice(bareIndex + 1) : [];

import { cursorSetup } from "./cursor.mjs";
import { imageSetup } from "./images.mjs";
import { utils } from "./utils.mjs";

type Options = {
  outputPath: string;
  statePath?: string;
  userDataPath?: string;
  colorScheme?: "dark" | "light";
  executablePath?: string;
};

export function cli() {
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const program = new Command();
  const { version } = JSON.parse(
    fs
      .readFileSync(path.join(__dirname, "..", "package.json"))
      .toString("utf8"),
  );

  const width = 1920;
  const height = 1080;
  const screenWidth = width * 2;
  const screenHeight = height * 2;

  program
    .name("playwright-video")
    .description("Run Playwright scripts and generate videos")
    .version(version);

  program
    .command("export")
    .allowUnknownOption()
    .argument("<path>", "The script file that will be executed")
    .requiredOption(
      "--output-path <path>",
      "The video output path. Must have .webm or .mp4 extension",
    )
    .option(
      "--state-path <path>",
      "Persist state like local storage and cookies",
    )
    .option("--user-data-path <path>", "Set user data directory")
    .option("--color-scheme <scheme>", "Set the browser color scheme", "dark")
    .option(
      "--chrome-path <path>",
      "Set chrome bin path. Can also be set through CHROME_BIN environment variable",
    )
    .action(async (scriptPath, options: Options) => {
      const module = await import(path.resolve(scriptPath));
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "playwright-video-"));

      const colorScheme = options.colorScheme || "dark";

      const executablePath =
        process.env.CHROME_BIN || options.executablePath || undefined;

      // Set environment variable so the patch knows what format to use
      process.env.PLAYWRIGHT_VIDEO_FORMAT = path.extname(options.outputPath);

      // Skip browser download if a custom executable path is provided
      if (executablePath) {
        process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
        process.env.PLAYWRIGHT_BROWSERS_PATH = "0";
      }

      const statePath = options.statePath
        ? path.resolve(options.statePath)
        : undefined;
      const storageState =
        statePath && fs.existsSync(statePath) ? statePath : "";

      const userDataPath = options.userDataPath
        ? path.resolve(options.userDataPath)
        : undefined;

      const launchOptions = {
        headless: true,
        args: ["--disable-dev-shm-usage", "--no-sandbox"],
      };

      if (colorScheme === "dark") {
        launchOptions.args.push(
          "--force-dark-mode",
          "--enable-features=WebUIDarkMode",
        );
      }

      launchOptions.args.push(...chromeArgs);

      if (executablePath) {
        // @ts-expect-error
        launchOptions.executablePath = executablePath;
      }

      let context: BrowserContext;
      let browser: Browser | undefined;
      const contextOptions = {
        storageState,
        colorScheme,
        screen: { width: screenWidth, height: screenHeight },
        viewport: { width, height },
        recordVideo: { dir, size: { width, height } },
        deviceScaleFactor: 2,
      };

      if (userDataPath) {
        context = await chromium.launchPersistentContext(userDataPath, {
          ...launchOptions,
          ...contextOptions,
        });
      } else {
        browser = await chromium.launch(launchOptions);
        context = await browser.newContext(contextOptions);
      }

      const page = await context.newPage();

      page.on("load", imageSetup);
      page.on("load", cursorSetup);

      await module.run(utils(page));
      const videoPath = await page.video()?.path();

      if (statePath) {
        await context.storageState({ path: statePath });
      }

      await context.close();

      if (browser) {
        await browser.close();
      }

      if (videoPath) {
        fs.copyFileSync(videoPath, options.outputPath);
        fs.unlinkSync(videoPath);
      }

      fs.rmSync(dir, { recursive: true, force: true });
    });

  program.parse(argv);
}
