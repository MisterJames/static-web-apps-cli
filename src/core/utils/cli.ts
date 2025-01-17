import path from "path";
import fs from "fs";
import { logger } from "./logger";

/**
 * Parse process.argv and retrieve a specific flag value.
 * Usage:
 * ```
 * // ./server --port 4242
 * let port = argv<number>('--port');
 * ```
 *
 * @param flag the flag name to retrieve from argv, e.g.: --port
 * @returns {T} the value of the corresponding flag:
 * - if flag is --key=value or --key value, returns value as type `T`.
 * - if flag is --key, return a boolean (true if the flag is present, false if not).
 * - if flag is not present, return null.
 *
 */
export function argv<T extends string | number | boolean | null>(flag: string): T {
  const flags = process.argv;
  for (let index = 0; index < flags.length; index++) {
    const entry = flags[index];

    // ex: --key=value
    if (entry.startsWith("--")) {
      if (entry.includes("=")) {
        // ex: [--key, value]
        const [key, value] = entry.split("=");
        if (flag === key.trim()) {
          // ex: --key=value --> value
          // ex: --key=      --> null
          return (!!value ? value.trim() : null) as T;
        }
      }
      // ex: --key value
      // ex: --key
      else if (flag === entry.trim()) {
        const nextEntry = flags[index + 1]?.trim();
        // ex: --key
        if (nextEntry === undefined || nextEntry?.startsWith("--")) {
          return true as T;
        }
        // ex: --key value
        else if (!!nextEntry) {
          return nextEntry as T;
        }
      } else {
        // flag wasn't found
        return false as T;
      }
    }
  }

  return null as T;
}

export const registerProcessExit = (fn: Function) => {
  let terminated = false;

  const wrapper = () => {
    if (!terminated) {
      terminated = true;
      fn();
    }
  };

  process.on("SIGINT", wrapper);
  process.on("SIGTERM", wrapper);
  process.on("exit", wrapper);
};

export const createStartupScriptCommand = (startupScript: string, options: SWACLIConfig) => {
  if (startupScript.includes(":")) {
    const [npmOrYarnBin, ...npmOrYarnScript] = startupScript.split(":");
    if (["npm", "yarn"].includes(npmOrYarnBin)) {
      return `${npmOrYarnBin} run ${npmOrYarnScript.join(":")} --if-present`;
    } else if (["npx"].includes(npmOrYarnBin)) {
      return `${npmOrYarnBin} ${npmOrYarnScript.join(":")}`;
    }
  } else {
    if (!path.isAbsolute(startupScript)) {
      const { appLocation } = options;
      const cwd = appLocation || process.cwd();
      startupScript = path.resolve(cwd, startupScript);
    }

    if (fs.existsSync(startupScript)) {
      return startupScript;
    } else {
      logger.error(`Script file "${startupScript}" was not found.`, true);
    }
  }
  return null;
};
