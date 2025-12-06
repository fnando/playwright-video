import { Command } from "commander";
import fs from "fs";
import url from "url";
import path from "path";
import process from "process";
import os from "os";
import { chromium } from "playwright";

import { cursorSetup } from "./cursor.mjs";
import { imageSetup } from "./images.mjs";
import { utils } from "./utils.mjs";

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
    .argument("<path>", "The script file that will be executed")
    .requiredOption(
      "--output-path <path>",
      "The video output path. Must have .webm or .mp4 extension",
    )
    .option(
      "--state-path <path>",
      "Persist state like local storage and cookies",
    )
    .option("--color-scheme <scheme>", "Set the browser color scheme", "dark")
    .option(
      "--chrome-path <path>",
      "Set chrome bin path. Can also be set through CHROME_BIN environment variable",
    )
    .action(async (scriptPath, options) => {
      const module = await import(path.resolve(scriptPath));
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "playwright-video-"));

      // Set environment variable so the patch knows what format to use
      process.env.PLAYWRIGHT_VIDEO_FORMAT = path.extname(options.outputPath);

      const statePath = options.statePath
        ? path.resolve(options.statePath)
        : undefined;
      const storageState =
        statePath && fs.existsSync(statePath) ? statePath : "";

      const browser = await chromium.launch({
        headless: true,
        executablePath:
          process.env.CHROME_BIN || options.executablePath || undefined,
        args: ["--disable-dev-shm-usage", "--no-sandbox"],
      });

      const context = await browser.newContext({
        storageState,
        screen: { width: screenWidth, height: screenHeight },
        colorScheme: options.colorScheme,
        viewport: { width, height },
        recordVideo: { dir, size: { width, height } },
        deviceScaleFactor: 2,
      });

      const page = await context.newPage();

      page.on("load", imageSetup);
      page.on("load", cursorSetup);

      await module.run(utils(page));
      const videoPath = await page.video()?.path();

      if (statePath) {
        await context.storageState({ path: statePath });
      }

      await context.close();
      await browser.close();

      if (videoPath) {
        fs.copyFileSync(videoPath, options.outputPath);
        fs.unlinkSync(videoPath);
      }

      fs.rmdirSync(dir);
    });

  program.parse();
}
