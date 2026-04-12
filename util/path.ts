import path from "path";
import os from "os";

/**
 * Resolves a user-provided path
 */
export function resolvePath(filePath: string): string {
  // Handle tilde expansion
  if (filePath.startsWith("~")) {
    return path.join(os.homedir(), filePath.slice(1));
  }

  // Resolve relative to CWD
  return path.resolve(filePath);
}
