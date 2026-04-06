const DEFAULT_BASE_URL = "http://localhost:6060";
const DOT_ENV_PATHS = [".env", "../../../../.env"];

function loadDotEnvFile() {
  for (const path of DOT_ENV_PATHS) {
    try {
      return open(path);
    } catch (error) {
      // Try the next likely repo-relative path.
    }
  }

  return "";
}

function parseDotEnv(contents) {
  const parsed = {};

  if (!hasValue(contents)) {
    return parsed;
  }

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) {
      parsed[key] = value;
    }
  }

  return parsed;
}

const fileEnv = parseDotEnv(loadDotEnvFile());

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function getOptionalEnv(name, fallback = "") {
  const value = __ENV[name] ?? fileEnv[name];
  return hasValue(value) ? value.trim() : fallback;
}

export function getRequiredEnv(name, fallbackName) {
  const value = getOptionalEnv(name);
  if (value) {
    return value;
  }

  if (fallbackName) {
    const fallback = getOptionalEnv(fallbackName);
    if (fallback) {
      return fallback;
    }
  }

  throw new Error(
    `Missing required environment variable: ${name}${fallbackName ? ` (or ${fallbackName})` : ""}`
  );
}

export function getNumberEnv(name, fallback) {
  const value = __ENV[name] ?? fileEnv[name];
  if (!hasValue(value)) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be numeric. Received "${value}".`);
  }

  return parsed;
}

export function getBooleanEnv(name, fallback = false) {
  const value = getOptionalEnv(name);
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getBaseUrl() {
  return getOptionalEnv("BASE_URL", DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export function getJsonEnv(name, fallback) {
  const value = getOptionalEnv(name);
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Environment variable ${name} must contain valid JSON.`);
  }
}

export function getStringListEnv(name, fallback = []) {
  const value = getOptionalEnv(name);
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
