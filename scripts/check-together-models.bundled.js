var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/dotenv/package.json
var require_package = __commonJS({
  "node_modules/dotenv/package.json"(exports, module) {
    module.exports = {
      name: "dotenv",
      version: "17.2.3",
      description: "Loads environment variables from .env file",
      main: "lib/main.js",
      types: "lib/main.d.ts",
      exports: {
        ".": {
          types: "./lib/main.d.ts",
          require: "./lib/main.js",
          default: "./lib/main.js"
        },
        "./config": "./config.js",
        "./config.js": "./config.js",
        "./lib/env-options": "./lib/env-options.js",
        "./lib/env-options.js": "./lib/env-options.js",
        "./lib/cli-options": "./lib/cli-options.js",
        "./lib/cli-options.js": "./lib/cli-options.js",
        "./package.json": "./package.json"
      },
      scripts: {
        "dts-check": "tsc --project tests/types/tsconfig.json",
        lint: "standard",
        pretest: "npm run lint && npm run dts-check",
        test: "tap run tests/**/*.js --allow-empty-coverage --disable-coverage --timeout=60000",
        "test:coverage": "tap run tests/**/*.js --show-full-coverage --timeout=60000 --coverage-report=text --coverage-report=lcov",
        prerelease: "npm test",
        release: "standard-version"
      },
      repository: {
        type: "git",
        url: "git://github.com/motdotla/dotenv.git"
      },
      homepage: "https://github.com/motdotla/dotenv#readme",
      funding: "https://dotenvx.com",
      keywords: [
        "dotenv",
        "env",
        ".env",
        "environment",
        "variables",
        "config",
        "settings"
      ],
      readmeFilename: "README.md",
      license: "BSD-2-Clause",
      devDependencies: {
        "@types/node": "^18.11.3",
        decache: "^4.6.2",
        sinon: "^14.0.1",
        standard: "^17.0.0",
        "standard-version": "^9.5.0",
        tap: "^19.2.0",
        typescript: "^4.8.4"
      },
      engines: {
        node: ">=12"
      },
      browser: {
        fs: false
      }
    };
  }
});

// node_modules/dotenv/lib/main.js
var require_main = __commonJS({
  "node_modules/dotenv/lib/main.js"(exports, module) {
    var fs = __require("fs");
    var path3 = __require("path");
    var os = __require("os");
    var crypto = __require("crypto");
    var packageJson = require_package();
    var version = packageJson.version;
    var TIPS = [
      "\u{1F510} encrypt with Dotenvx: https://dotenvx.com",
      "\u{1F510} prevent committing .env to code: https://dotenvx.com/precommit",
      "\u{1F510} prevent building .env in docker: https://dotenvx.com/prebuild",
      "\u{1F4E1} add observability to secrets: https://dotenvx.com/ops",
      "\u{1F465} sync secrets across teammates & machines: https://dotenvx.com/ops",
      "\u{1F5C2}\uFE0F backup and recover secrets: https://dotenvx.com/ops",
      "\u2705 audit secrets and track compliance: https://dotenvx.com/ops",
      "\u{1F504} add secrets lifecycle management: https://dotenvx.com/ops",
      "\u{1F511} add access controls to secrets: https://dotenvx.com/ops",
      "\u{1F6E0}\uFE0F  run anywhere with `dotenvx run -- yourcommand`",
      "\u2699\uFE0F  specify custom .env file path with { path: '/custom/path/.env' }",
      "\u2699\uFE0F  enable debug logging with { debug: true }",
      "\u2699\uFE0F  override existing env vars with { override: true }",
      "\u2699\uFE0F  suppress all logs with { quiet: true }",
      "\u2699\uFE0F  write to custom object with { processEnv: myObject }",
      "\u2699\uFE0F  load multiple .env files with { path: ['.env.local', '.env'] }"
    ];
    function _getRandomTip() {
      return TIPS[Math.floor(Math.random() * TIPS.length)];
    }
    function parseBoolean(value) {
      if (typeof value === "string") {
        return !["false", "0", "no", "off", ""].includes(value.toLowerCase());
      }
      return Boolean(value);
    }
    function supportsAnsi() {
      return process.stdout.isTTY;
    }
    function dim(text) {
      return supportsAnsi() ? `\x1B[2m${text}\x1B[0m` : text;
    }
    var LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
    function parse(src) {
      const obj = {};
      let lines = src.toString();
      lines = lines.replace(/\r\n?/mg, "\n");
      let match;
      while ((match = LINE.exec(lines)) != null) {
        const key = match[1];
        let value = match[2] || "";
        value = value.trim();
        const maybeQuote = value[0];
        value = value.replace(/^(['"`])([\s\S]*)\1$/mg, "$2");
        if (maybeQuote === '"') {
          value = value.replace(/\\n/g, "\n");
          value = value.replace(/\\r/g, "\r");
        }
        obj[key] = value;
      }
      return obj;
    }
    function _parseVault(options) {
      options = options || {};
      const vaultPath = _vaultPath(options);
      options.path = vaultPath;
      const result = DotenvModule.configDotenv(options);
      if (!result.parsed) {
        const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
        err.code = "MISSING_DATA";
        throw err;
      }
      const keys = _dotenvKey(options).split(",");
      const length = keys.length;
      let decrypted;
      for (let i = 0; i < length; i++) {
        try {
          const key = keys[i].trim();
          const attrs = _instructions(result, key);
          decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);
          break;
        } catch (error) {
          if (i + 1 >= length) {
            throw error;
          }
        }
      }
      return DotenvModule.parse(decrypted);
    }
    function _warn(message) {
      console.error(`[dotenv@${version}][WARN] ${message}`);
    }
    function _debug(message) {
      console.log(`[dotenv@${version}][DEBUG] ${message}`);
    }
    function _log(message) {
      console.log(`[dotenv@${version}] ${message}`);
    }
    function _dotenvKey(options) {
      if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
        return options.DOTENV_KEY;
      }
      if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
        return process.env.DOTENV_KEY;
      }
      return "";
    }
    function _instructions(result, dotenvKey) {
      let uri;
      try {
        uri = new URL(dotenvKey);
      } catch (error) {
        if (error.code === "ERR_INVALID_URL") {
          const err = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        }
        throw error;
      }
      const key = uri.password;
      if (!key) {
        const err = new Error("INVALID_DOTENV_KEY: Missing key part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environment = uri.searchParams.get("environment");
      if (!environment) {
        const err = new Error("INVALID_DOTENV_KEY: Missing environment part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
      const ciphertext = result.parsed[environmentKey];
      if (!ciphertext) {
        const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
        err.code = "NOT_FOUND_DOTENV_ENVIRONMENT";
        throw err;
      }
      return { ciphertext, key };
    }
    function _vaultPath(options) {
      let possibleVaultPath = null;
      if (options && options.path && options.path.length > 0) {
        if (Array.isArray(options.path)) {
          for (const filepath of options.path) {
            if (fs.existsSync(filepath)) {
              possibleVaultPath = filepath.endsWith(".vault") ? filepath : `${filepath}.vault`;
            }
          }
        } else {
          possibleVaultPath = options.path.endsWith(".vault") ? options.path : `${options.path}.vault`;
        }
      } else {
        possibleVaultPath = path3.resolve(process.cwd(), ".env.vault");
      }
      if (fs.existsSync(possibleVaultPath)) {
        return possibleVaultPath;
      }
      return null;
    }
    function _resolveHome(envPath) {
      return envPath[0] === "~" ? path3.join(os.homedir(), envPath.slice(1)) : envPath;
    }
    function _configVault(options) {
      const debug = parseBoolean(process.env.DOTENV_CONFIG_DEBUG || options && options.debug);
      const quiet = parseBoolean(process.env.DOTENV_CONFIG_QUIET || options && options.quiet);
      if (debug || !quiet) {
        _log("Loading env from encrypted .env.vault");
      }
      const parsed = DotenvModule._parseVault(options);
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      DotenvModule.populate(processEnv, parsed, options);
      return { parsed };
    }
    function configDotenv(options) {
      const dotenvPath = path3.resolve(process.cwd(), ".env");
      let encoding = "utf8";
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      let debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || options && options.debug);
      let quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || options && options.quiet);
      if (options && options.encoding) {
        encoding = options.encoding;
      } else {
        if (debug) {
          _debug("No encoding is specified. UTF-8 is used by default");
        }
      }
      let optionPaths = [dotenvPath];
      if (options && options.path) {
        if (!Array.isArray(options.path)) {
          optionPaths = [_resolveHome(options.path)];
        } else {
          optionPaths = [];
          for (const filepath of options.path) {
            optionPaths.push(_resolveHome(filepath));
          }
        }
      }
      let lastError;
      const parsedAll = {};
      for (const path4 of optionPaths) {
        try {
          const parsed = DotenvModule.parse(fs.readFileSync(path4, { encoding }));
          DotenvModule.populate(parsedAll, parsed, options);
        } catch (e) {
          if (debug) {
            _debug(`Failed to load ${path4} ${e.message}`);
          }
          lastError = e;
        }
      }
      const populated = DotenvModule.populate(processEnv, parsedAll, options);
      debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || debug);
      quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || quiet);
      if (debug || !quiet) {
        const keysCount = Object.keys(populated).length;
        const shortPaths = [];
        for (const filePath of optionPaths) {
          try {
            const relative = path3.relative(process.cwd(), filePath);
            shortPaths.push(relative);
          } catch (e) {
            if (debug) {
              _debug(`Failed to load ${filePath} ${e.message}`);
            }
            lastError = e;
          }
        }
        _log(`injecting env (${keysCount}) from ${shortPaths.join(",")} ${dim(`-- tip: ${_getRandomTip()}`)}`);
      }
      if (lastError) {
        return { parsed: parsedAll, error: lastError };
      } else {
        return { parsed: parsedAll };
      }
    }
    function config2(options) {
      if (_dotenvKey(options).length === 0) {
        return DotenvModule.configDotenv(options);
      }
      const vaultPath = _vaultPath(options);
      if (!vaultPath) {
        _warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`);
        return DotenvModule.configDotenv(options);
      }
      return DotenvModule._configVault(options);
    }
    function decrypt(encrypted, keyStr) {
      const key = Buffer.from(keyStr.slice(-64), "hex");
      let ciphertext = Buffer.from(encrypted, "base64");
      const nonce = ciphertext.subarray(0, 12);
      const authTag = ciphertext.subarray(-16);
      ciphertext = ciphertext.subarray(12, -16);
      try {
        const aesgcm = crypto.createDecipheriv("aes-256-gcm", key, nonce);
        aesgcm.setAuthTag(authTag);
        return `${aesgcm.update(ciphertext)}${aesgcm.final()}`;
      } catch (error) {
        const isRange = error instanceof RangeError;
        const invalidKeyLength = error.message === "Invalid key length";
        const decryptionFailed = error.message === "Unsupported state or unable to authenticate data";
        if (isRange || invalidKeyLength) {
          const err = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        } else if (decryptionFailed) {
          const err = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
          err.code = "DECRYPTION_FAILED";
          throw err;
        } else {
          throw error;
        }
      }
    }
    function populate(processEnv, parsed, options = {}) {
      const debug = Boolean(options && options.debug);
      const override = Boolean(options && options.override);
      const populated = {};
      if (typeof parsed !== "object") {
        const err = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
        err.code = "OBJECT_REQUIRED";
        throw err;
      }
      for (const key of Object.keys(parsed)) {
        if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
          if (override === true) {
            processEnv[key] = parsed[key];
            populated[key] = parsed[key];
          }
          if (debug) {
            if (override === true) {
              _debug(`"${key}" is already defined and WAS overwritten`);
            } else {
              _debug(`"${key}" is already defined and was NOT overwritten`);
            }
          }
        } else {
          processEnv[key] = parsed[key];
          populated[key] = parsed[key];
        }
      }
      return populated;
    }
    var DotenvModule = {
      configDotenv,
      _configVault,
      _parseVault,
      config: config2,
      decrypt,
      parse,
      populate
    };
    module.exports.configDotenv = DotenvModule.configDotenv;
    module.exports._configVault = DotenvModule._configVault;
    module.exports._parseVault = DotenvModule._parseVault;
    module.exports.config = DotenvModule.config;
    module.exports.decrypt = DotenvModule.decrypt;
    module.exports.parse = DotenvModule.parse;
    module.exports.populate = DotenvModule.populate;
    module.exports = DotenvModule;
  }
});

// node_modules/together-ai/internal/tslib.mjs
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

// node_modules/together-ai/internal/utils/uuid.mjs
var uuid4 = function() {
  const { crypto } = globalThis;
  if (crypto?.randomUUID) {
    uuid4 = crypto.randomUUID.bind(crypto);
    return crypto.randomUUID();
  }
  const u8 = new Uint8Array(1);
  const randomByte = crypto ? () => crypto.getRandomValues(u8)[0] : () => Math.random() * 255 & 255;
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ randomByte() & 15 >> +c / 4).toString(16));
};

// node_modules/together-ai/internal/errors.mjs
function isAbortError(err) {
  return typeof err === "object" && err !== null && // Spec-compliant fetch implementations
  ("name" in err && err.name === "AbortError" || // Expo fetch
  "message" in err && String(err.message).includes("FetchRequestCanceledException"));
}
var castToError = (err) => {
  if (err instanceof Error)
    return err;
  if (typeof err === "object" && err !== null) {
    try {
      if (Object.prototype.toString.call(err) === "[object Error]") {
        const error = new Error(err.message, err.cause ? { cause: err.cause } : {});
        if (err.stack)
          error.stack = err.stack;
        if (err.cause && !error.cause)
          error.cause = err.cause;
        if (err.name)
          error.name = err.name;
        return error;
      }
    } catch {
    }
    try {
      return new Error(JSON.stringify(err));
    } catch {
    }
  }
  return new Error(err);
};

// node_modules/together-ai/core/error.mjs
var TogetherError = class extends Error {
};
var APIError = class _APIError extends TogetherError {
  constructor(status, error, message, headers) {
    super(`${_APIError.makeMessage(status, error, message)}`);
    this.status = status;
    this.headers = headers;
    this.error = error;
  }
  static makeMessage(status, error, message) {
    const msg = error?.message ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
    if (status && msg) {
      return `${status} ${msg}`;
    }
    if (status) {
      return `${status} status code (no body)`;
    }
    if (msg) {
      return msg;
    }
    return "(no status code or body)";
  }
  static generate(status, errorResponse, message, headers) {
    if (!status || !headers) {
      return new APIConnectionError({ message, cause: castToError(errorResponse) });
    }
    const error = errorResponse;
    if (status === 400) {
      return new BadRequestError(status, error, message, headers);
    }
    if (status === 401) {
      return new AuthenticationError(status, error, message, headers);
    }
    if (status === 403) {
      return new PermissionDeniedError(status, error, message, headers);
    }
    if (status === 404) {
      return new NotFoundError(status, error, message, headers);
    }
    if (status === 409) {
      return new ConflictError(status, error, message, headers);
    }
    if (status === 422) {
      return new UnprocessableEntityError(status, error, message, headers);
    }
    if (status === 429) {
      return new RateLimitError(status, error, message, headers);
    }
    if (status >= 500) {
      return new InternalServerError(status, error, message, headers);
    }
    return new _APIError(status, error, message, headers);
  }
};
var APIUserAbortError = class extends APIError {
  constructor({ message } = {}) {
    super(void 0, void 0, message || "Request was aborted.", void 0);
  }
};
var APIConnectionError = class extends APIError {
  constructor({ message, cause }) {
    super(void 0, void 0, message || "Connection error.", void 0);
    if (cause)
      this.cause = cause;
  }
};
var APIConnectionTimeoutError = class extends APIConnectionError {
  constructor({ message } = {}) {
    super({ message: message ?? "Request timed out." });
  }
};
var BadRequestError = class extends APIError {
};
var AuthenticationError = class extends APIError {
};
var PermissionDeniedError = class extends APIError {
};
var NotFoundError = class extends APIError {
};
var ConflictError = class extends APIError {
};
var UnprocessableEntityError = class extends APIError {
};
var RateLimitError = class extends APIError {
};
var InternalServerError = class extends APIError {
};

// node_modules/together-ai/internal/utils/values.mjs
var startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
var isAbsoluteURL = (url) => {
  return startsWithSchemeRegexp.test(url);
};
var isArray = (val) => (isArray = Array.isArray, isArray(val));
var isReadonlyArray = isArray;
function isEmptyObj(obj) {
  if (!obj)
    return true;
  for (const _k in obj)
    return false;
  return true;
}
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
var validatePositiveInteger = (name, n) => {
  if (typeof n !== "number" || !Number.isInteger(n)) {
    throw new TogetherError(`${name} must be an integer`);
  }
  if (n < 0) {
    throw new TogetherError(`${name} must be a positive integer`);
  }
  return n;
};
var safeJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return void 0;
  }
};

// node_modules/together-ai/internal/utils/sleep.mjs
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// node_modules/together-ai/version.mjs
var VERSION = "0.32.0";

// node_modules/together-ai/internal/detect-platform.mjs
function getDetectedPlatform() {
  if (typeof Deno !== "undefined" && Deno.build != null) {
    return "deno";
  }
  if (typeof EdgeRuntime !== "undefined") {
    return "edge";
  }
  if (Object.prototype.toString.call(typeof globalThis.process !== "undefined" ? globalThis.process : 0) === "[object process]") {
    return "node";
  }
  return "unknown";
}
var getPlatformProperties = () => {
  const detectedPlatform = getDetectedPlatform();
  if (detectedPlatform === "deno") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(Deno.build.os),
      "X-Stainless-Arch": normalizeArch(Deno.build.arch),
      "X-Stainless-Runtime": "deno",
      "X-Stainless-Runtime-Version": typeof Deno.version === "string" ? Deno.version : Deno.version?.deno ?? "unknown"
    };
  }
  if (typeof EdgeRuntime !== "undefined") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": `other:${EdgeRuntime}`,
      "X-Stainless-Runtime": "edge",
      "X-Stainless-Runtime-Version": globalThis.process.version
    };
  }
  if (detectedPlatform === "node") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(globalThis.process.platform ?? "unknown"),
      "X-Stainless-Arch": normalizeArch(globalThis.process.arch ?? "unknown"),
      "X-Stainless-Runtime": "node",
      "X-Stainless-Runtime-Version": globalThis.process.version ?? "unknown"
    };
  }
  const browserInfo = getBrowserInfo();
  if (browserInfo) {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": "unknown",
      "X-Stainless-Runtime": `browser:${browserInfo.browser}`,
      "X-Stainless-Runtime-Version": browserInfo.version
    };
  }
  return {
    "X-Stainless-Lang": "js",
    "X-Stainless-Package-Version": VERSION,
    "X-Stainless-OS": "Unknown",
    "X-Stainless-Arch": "unknown",
    "X-Stainless-Runtime": "unknown",
    "X-Stainless-Runtime-Version": "unknown"
  };
};
function getBrowserInfo() {
  if (typeof navigator === "undefined" || !navigator) {
    return null;
  }
  const browserPatterns = [
    { key: "edge", pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "chrome", pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "firefox", pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "safari", pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ }
  ];
  for (const { key, pattern } of browserPatterns) {
    const match = pattern.exec(navigator.userAgent);
    if (match) {
      const major = match[1] || 0;
      const minor = match[2] || 0;
      const patch = match[3] || 0;
      return { browser: key, version: `${major}.${minor}.${patch}` };
    }
  }
  return null;
}
var normalizeArch = (arch) => {
  if (arch === "x32")
    return "x32";
  if (arch === "x86_64" || arch === "x64")
    return "x64";
  if (arch === "arm")
    return "arm";
  if (arch === "aarch64" || arch === "arm64")
    return "arm64";
  if (arch)
    return `other:${arch}`;
  return "unknown";
};
var normalizePlatform = (platform) => {
  platform = platform.toLowerCase();
  if (platform.includes("ios"))
    return "iOS";
  if (platform === "android")
    return "Android";
  if (platform === "darwin")
    return "MacOS";
  if (platform === "win32")
    return "Windows";
  if (platform === "freebsd")
    return "FreeBSD";
  if (platform === "openbsd")
    return "OpenBSD";
  if (platform === "linux")
    return "Linux";
  if (platform)
    return `Other:${platform}`;
  return "Unknown";
};
var _platformHeaders;
var getPlatformHeaders = () => {
  return _platformHeaders ?? (_platformHeaders = getPlatformProperties());
};

// node_modules/together-ai/internal/shims.mjs
function getDefaultFetch() {
  if (typeof fetch !== "undefined") {
    return fetch;
  }
  throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new Together({ fetch })` or polyfill the global, `globalThis.fetch = fetch`");
}
function makeReadableStream(...args) {
  const ReadableStream = globalThis.ReadableStream;
  if (typeof ReadableStream === "undefined") {
    throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
  }
  return new ReadableStream(...args);
}
function ReadableStreamFrom(iterable) {
  let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
  return makeReadableStream({
    start() {
    },
    async pull(controller) {
      const { done, value } = await iter.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    async cancel() {
      await iter.return?.();
    }
  });
}
function ReadableStreamToAsyncIterable(stream) {
  if (stream[Symbol.asyncIterator])
    return stream;
  const reader = stream.getReader();
  return {
    async next() {
      try {
        const result = await reader.read();
        if (result?.done)
          reader.releaseLock();
        return result;
      } catch (e) {
        reader.releaseLock();
        throw e;
      }
    },
    async return() {
      const cancelPromise = reader.cancel();
      reader.releaseLock();
      await cancelPromise;
      return { done: true, value: void 0 };
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
async function CancelReadableStream(stream) {
  if (stream === null || typeof stream !== "object")
    return;
  if (stream[Symbol.asyncIterator]) {
    await stream[Symbol.asyncIterator]().return?.();
    return;
  }
  const reader = stream.getReader();
  const cancelPromise = reader.cancel();
  reader.releaseLock();
  await cancelPromise;
}

// node_modules/together-ai/internal/request-options.mjs
var FallbackEncoder = ({ headers, body }) => {
  return {
    bodyHeaders: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
};

// node_modules/together-ai/internal/uploads.mjs
var checkFileSupport = () => {
  if (typeof File === "undefined") {
    const { process: process2 } = globalThis;
    const isOldNode = typeof process2?.versions?.node === "string" && parseInt(process2.versions.node.split(".")) < 20;
    throw new Error("`File` is not defined as a global, which is required for file uploads." + (isOldNode ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ""));
  }
};
function makeFile(fileBits, fileName, options) {
  checkFileSupport();
  return new File(fileBits, fileName ?? "unknown_file", options);
}
function getName(value) {
  return (typeof value === "object" && value !== null && ("name" in value && value.name && String(value.name) || "url" in value && value.url && String(value.url) || "filename" in value && value.filename && String(value.filename) || "path" in value && value.path && String(value.path)) || "").split(/[\\/]/).pop() || void 0;
}
var isAsyncIterable = (value) => value != null && typeof value === "object" && typeof value[Symbol.asyncIterator] === "function";
var multipartFormRequestOptions = async (opts, fetch2) => {
  return { ...opts, body: await createForm(opts.body, fetch2) };
};
var supportsFormDataMap = /* @__PURE__ */ new WeakMap();
function supportsFormData(fetchObject) {
  const fetch2 = typeof fetchObject === "function" ? fetchObject : fetchObject.fetch;
  const cached = supportsFormDataMap.get(fetch2);
  if (cached)
    return cached;
  const promise = (async () => {
    try {
      const FetchResponse = "Response" in fetch2 ? fetch2.Response : (await fetch2("data:,")).constructor;
      const data = new FormData();
      if (data.toString() === await new FetchResponse(data).text()) {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  })();
  supportsFormDataMap.set(fetch2, promise);
  return promise;
}
var createForm = async (body, fetch2) => {
  if (!await supportsFormData(fetch2)) {
    throw new TypeError("The provided fetch function does not support file uploads with the current global FormData class.");
  }
  const form = new FormData();
  await Promise.all(Object.entries(body || {}).map(([key, value]) => addFormValue(form, key, value)));
  return form;
};
var isNamedBlob = (value) => value instanceof Blob && "name" in value;
var addFormValue = async (form, key, value) => {
  if (value === void 0)
    return;
  if (value == null) {
    throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    form.append(key, String(value));
  } else if (value instanceof Response) {
    form.append(key, makeFile([await value.blob()], getName(value)));
  } else if (isAsyncIterable(value)) {
    form.append(key, makeFile([await new Response(ReadableStreamFrom(value)).blob()], getName(value)));
  } else if (isNamedBlob(value)) {
    form.append(key, value, getName(value));
  } else if (Array.isArray(value)) {
    await Promise.all(value.map((entry) => addFormValue(form, key + "[]", entry)));
  } else if (typeof value === "object") {
    await Promise.all(Object.entries(value).map(([name, prop]) => addFormValue(form, `${key}[${name}]`, prop)));
  } else {
    throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
  }
};

// node_modules/together-ai/internal/to-file.mjs
var isBlobLike = (value) => value != null && typeof value === "object" && typeof value.size === "number" && typeof value.type === "string" && typeof value.text === "function" && typeof value.slice === "function" && typeof value.arrayBuffer === "function";
var isFileLike = (value) => value != null && typeof value === "object" && typeof value.name === "string" && typeof value.lastModified === "number" && isBlobLike(value);
var isResponseLike = (value) => value != null && typeof value === "object" && typeof value.url === "string" && typeof value.blob === "function";
async function toFile(value, name, options) {
  checkFileSupport();
  value = await value;
  if (isFileLike(value)) {
    if (value instanceof File) {
      return value;
    }
    return makeFile([await value.arrayBuffer()], value.name);
  }
  if (isResponseLike(value)) {
    const blob = await value.blob();
    name || (name = new URL(value.url).pathname.split(/[\\/]/).pop());
    return makeFile(await getBytes(blob), name, options);
  }
  const parts = await getBytes(value);
  name || (name = getName(value));
  if (!options?.type) {
    const type = parts.find((part) => typeof part === "object" && "type" in part && part.type);
    if (typeof type === "string") {
      options = { ...options, type };
    }
  }
  return makeFile(parts, name, options);
}
async function getBytes(value) {
  let parts = [];
  if (typeof value === "string" || ArrayBuffer.isView(value) || // includes Uint8Array, Buffer, etc.
  value instanceof ArrayBuffer) {
    parts.push(value);
  } else if (isBlobLike(value)) {
    parts.push(value instanceof Blob ? value : await value.arrayBuffer());
  } else if (isAsyncIterable(value)) {
    for await (const chunk of value) {
      parts.push(...await getBytes(chunk));
    }
  } else {
    const constructor = value?.constructor?.name;
    throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ""}${propsForError(value)}`);
  }
  return parts;
}
function propsForError(value) {
  if (typeof value !== "object" || value === null)
    return "";
  const props = Object.getOwnPropertyNames(value);
  return `; props: [${props.map((p) => `"${p}"`).join(", ")}]`;
}

// node_modules/together-ai/core/resource.mjs
var APIResource = class {
  constructor(client) {
    this._client = client;
  }
};

// node_modules/together-ai/internal/headers.mjs
var brand_privateNullableHeaders = /* @__PURE__ */ Symbol("brand.privateNullableHeaders");
function* iterateHeaders(headers) {
  if (!headers)
    return;
  if (brand_privateNullableHeaders in headers) {
    const { values, nulls } = headers;
    yield* values.entries();
    for (const name of nulls) {
      yield [name, null];
    }
    return;
  }
  let shouldClear = false;
  let iter;
  if (headers instanceof Headers) {
    iter = headers.entries();
  } else if (isReadonlyArray(headers)) {
    iter = headers;
  } else {
    shouldClear = true;
    iter = Object.entries(headers ?? {});
  }
  for (let row of iter) {
    const name = row[0];
    if (typeof name !== "string")
      throw new TypeError("expected header name to be a string");
    const values = isReadonlyArray(row[1]) ? row[1] : [row[1]];
    let didClear = false;
    for (const value of values) {
      if (value === void 0)
        continue;
      if (shouldClear && !didClear) {
        didClear = true;
        yield [name, null];
      }
      yield [name, value];
    }
  }
}
var buildHeaders = (newHeaders) => {
  const targetHeaders = new Headers();
  const nullHeaders = /* @__PURE__ */ new Set();
  for (const headers of newHeaders) {
    const seenHeaders = /* @__PURE__ */ new Set();
    for (const [name, value] of iterateHeaders(headers)) {
      const lowerName = name.toLowerCase();
      if (!seenHeaders.has(lowerName)) {
        targetHeaders.delete(name);
        seenHeaders.add(lowerName);
      }
      if (value === null) {
        targetHeaders.delete(name);
        nullHeaders.add(lowerName);
      } else {
        targetHeaders.append(name, value);
        nullHeaders.delete(lowerName);
      }
    }
  }
  return { [brand_privateNullableHeaders]: true, values: targetHeaders, nulls: nullHeaders };
};

// node_modules/together-ai/resources/audio/speech.mjs
var Speech = class extends APIResource {
  create(body, options) {
    return this._client.post("/audio/speech", {
      body,
      ...options,
      headers: buildHeaders([{ Accept: "application/octet-stream" }, options?.headers]),
      stream: body.stream ?? false,
      __binaryResponse: true
    });
  }
};

// node_modules/together-ai/resources/audio/transcriptions.mjs
var Transcriptions = class extends APIResource {
  /**
   * Transcribes audio into text
   *
   * @example
   * ```ts
   * const transcription =
   *   await client.audio.transcriptions.create({
   *     file: fs.createReadStream('path/to/file'),
   *   });
   * ```
   */
  create(body, options) {
    return this._client.post("/audio/transcriptions", multipartFormRequestOptions({ body, ...options }, this._client));
  }
};

// node_modules/together-ai/resources/audio/translations.mjs
var Translations = class extends APIResource {
  /**
   * Translates audio into English
   *
   * @example
   * ```ts
   * const translation = await client.audio.translations.create({
   *   file: fs.createReadStream('path/to/file'),
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/audio/translations", multipartFormRequestOptions({ body, ...options }, this._client));
  }
};

// node_modules/together-ai/resources/audio/voices.mjs
var Voices = class extends APIResource {
  /**
   * Fetch available voices for each model
   *
   * @example
   * ```ts
   * const voices = await client.audio.voices.list();
   * ```
   */
  list(options) {
    return this._client.get("/voices", options);
  }
};

// node_modules/together-ai/resources/audio/audio.mjs
var Audio = class extends APIResource {
  constructor() {
    super(...arguments);
    this.speech = new Speech(this._client);
    this.voices = new Voices(this._client);
    this.transcriptions = new Transcriptions(this._client);
    this.translations = new Translations(this._client);
  }
};
Audio.Speech = Speech;
Audio.Voices = Voices;
Audio.Transcriptions = Transcriptions;
Audio.Translations = Translations;

// node_modules/together-ai/internal/utils/path.mjs
function encodeURIPath(str2) {
  return str2.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
var EMPTY = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
var createPathTagFunction = (pathEncoder = encodeURIPath) => function path3(statics, ...params) {
  if (statics.length === 1)
    return statics[0];
  let postPath = false;
  const invalidSegments = [];
  const path4 = statics.reduce((previousValue, currentValue, index) => {
    if (/[?#]/.test(currentValue)) {
      postPath = true;
    }
    const value = params[index];
    let encoded = (postPath ? encodeURIComponent : pathEncoder)("" + value);
    if (index !== params.length && (value == null || typeof value === "object" && // handle values from other realms
    value.toString === Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY) ?? EMPTY)?.toString)) {
      encoded = value + "";
      invalidSegments.push({
        start: previousValue.length + currentValue.length,
        length: encoded.length,
        error: `Value of type ${Object.prototype.toString.call(value).slice(8, -1)} is not a valid path parameter`
      });
    }
    return previousValue + currentValue + (index === params.length ? "" : encoded);
  }, "");
  const pathOnly = path4.split(/[?#]/, 1)[0];
  const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
  let match;
  while ((match = invalidSegmentPattern.exec(pathOnly)) !== null) {
    invalidSegments.push({
      start: match.index,
      length: match[0].length,
      error: `Value "${match[0]}" can't be safely passed as a path parameter`
    });
  }
  invalidSegments.sort((a, b) => a.start - b.start);
  if (invalidSegments.length > 0) {
    let lastEnd = 0;
    const underline = invalidSegments.reduce((acc, segment) => {
      const spaces = " ".repeat(segment.start - lastEnd);
      const arrows = "^".repeat(segment.length);
      lastEnd = segment.start + segment.length;
      return acc + spaces + arrows;
    }, "");
    throw new TogetherError(`Path parameters result in path with invalid segments:
${invalidSegments.map((e) => e.error).join("\n")}
${path4}
${underline}`);
  }
  return path4;
};
var path = /* @__PURE__ */ createPathTagFunction(encodeURIPath);

// node_modules/together-ai/resources/batches.mjs
var Batches = class extends APIResource {
  /**
   * Create a new batch job with the given input file and endpoint
   *
   * @example
   * ```ts
   * const batch = await client.batches.create({
   *   endpoint: '/v1/chat/completions',
   *   input_file_id: 'file-abc123def456ghi789',
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/batches", { body, ...options });
  }
  /**
   * Get details of a batch job by ID
   *
   * @example
   * ```ts
   * const batchJob = await client.batches.retrieve(
   *   'batch_job_abc123def456',
   * );
   * ```
   */
  retrieve(id, options) {
    return this._client.get(path`/batches/${id}`, options);
  }
  /**
   * List all batch jobs for the authenticated user
   *
   * @example
   * ```ts
   * const batchJobs = await client.batches.list();
   * ```
   */
  list(options) {
    return this._client.get("/batches", options);
  }
  /**
   * Cancel a batch job by ID
   *
   * @example
   * ```ts
   * const batchJob = await client.batches.cancel(
   *   'batch_job_abc123def456',
   * );
   * ```
   */
  cancel(id, options) {
    return this._client.post(path`/batches/${id}/cancel`, options);
  }
};

// node_modules/together-ai/lib/RunnableFunction.mjs
function isRunnableFunctionWithParse(fn) {
  return typeof fn.parse === "function";
}

// node_modules/together-ai/lib/chatCompletionUtils.mjs
var isAssistantMessage = (message) => {
  return message?.role === "assistant";
};
var isFunctionMessage = (message) => {
  return message?.role === "function";
};
var isToolMessage = (message) => {
  return message?.role === "tool";
};

// node_modules/together-ai/lib/AbstractChatCompletionRunner.mjs
var _AbstractChatCompletionRunner_instances;
var _AbstractChatCompletionRunner_connectedPromise;
var _AbstractChatCompletionRunner_resolveConnectedPromise;
var _AbstractChatCompletionRunner_rejectConnectedPromise;
var _AbstractChatCompletionRunner_endPromise;
var _AbstractChatCompletionRunner_resolveEndPromise;
var _AbstractChatCompletionRunner_rejectEndPromise;
var _AbstractChatCompletionRunner_listeners;
var _AbstractChatCompletionRunner_ended;
var _AbstractChatCompletionRunner_errored;
var _AbstractChatCompletionRunner_aborted;
var _AbstractChatCompletionRunner_catchingPromiseCreated;
var _AbstractChatCompletionRunner_getFinalContent;
var _AbstractChatCompletionRunner_getFinalMessage;
var _AbstractChatCompletionRunner_getFinalFunctionCall;
var _AbstractChatCompletionRunner_getFinalFunctionCallResult;
var _AbstractChatCompletionRunner_calculateTotalUsage;
var _AbstractChatCompletionRunner_handleError;
var _AbstractChatCompletionRunner_validateParams;
var _AbstractChatCompletionRunner_stringifyFunctionCallResult;
var DEFAULT_MAX_CHAT_COMPLETIONS = 10;
var AbstractChatCompletionRunner = class {
  constructor() {
    _AbstractChatCompletionRunner_instances.add(this);
    this.controller = new AbortController();
    _AbstractChatCompletionRunner_connectedPromise.set(this, void 0);
    _AbstractChatCompletionRunner_resolveConnectedPromise.set(this, () => {
    });
    _AbstractChatCompletionRunner_rejectConnectedPromise.set(this, () => {
    });
    _AbstractChatCompletionRunner_endPromise.set(this, void 0);
    _AbstractChatCompletionRunner_resolveEndPromise.set(this, () => {
    });
    _AbstractChatCompletionRunner_rejectEndPromise.set(this, () => {
    });
    _AbstractChatCompletionRunner_listeners.set(this, {});
    this._chatCompletions = [];
    this.messages = [];
    _AbstractChatCompletionRunner_ended.set(this, false);
    _AbstractChatCompletionRunner_errored.set(this, false);
    _AbstractChatCompletionRunner_aborted.set(this, false);
    _AbstractChatCompletionRunner_catchingPromiseCreated.set(this, false);
    _AbstractChatCompletionRunner_handleError.set(this, (error) => {
      __classPrivateFieldSet(this, _AbstractChatCompletionRunner_errored, true, "f");
      if (error instanceof Error && error.name === "AbortError") {
        error = new APIUserAbortError();
      }
      if (error instanceof APIUserAbortError) {
        __classPrivateFieldSet(this, _AbstractChatCompletionRunner_aborted, true, "f");
        return this._emit("abort", error);
      }
      if (error instanceof TogetherError) {
        return this._emit("error", error);
      }
      if (error instanceof Error) {
        const TogetherError2 = new TogetherError2(error.message);
        TogetherError2.cause = error;
        return this._emit("error", TogetherError2);
      }
      return this._emit("error", new TogetherError(String(error)));
    });
    __classPrivateFieldSet(this, _AbstractChatCompletionRunner_connectedPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _AbstractChatCompletionRunner_resolveConnectedPromise, resolve, "f");
      __classPrivateFieldSet(this, _AbstractChatCompletionRunner_rejectConnectedPromise, reject, "f");
    }), "f");
    __classPrivateFieldSet(this, _AbstractChatCompletionRunner_endPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _AbstractChatCompletionRunner_resolveEndPromise, resolve, "f");
      __classPrivateFieldSet(this, _AbstractChatCompletionRunner_rejectEndPromise, reject, "f");
    }), "f");
    __classPrivateFieldGet(this, _AbstractChatCompletionRunner_connectedPromise, "f").catch(() => {
    });
    __classPrivateFieldGet(this, _AbstractChatCompletionRunner_endPromise, "f").catch(() => {
    });
  }
  _run(executor) {
    setTimeout(() => {
      executor().then(() => {
        this._emitFinal();
        this._emit("end");
      }, __classPrivateFieldGet(this, _AbstractChatCompletionRunner_handleError, "f"));
    }, 0);
  }
  _addChatCompletion(chatCompletion) {
    this._chatCompletions.push(chatCompletion);
    this._emit("chatCompletion", chatCompletion);
    const message = chatCompletion.choices[0]?.message;
    if (message)
      this._addMessage(message);
    return chatCompletion;
  }
  _addMessage(message, emit = true) {
    if (!("content" in message))
      message.content = null;
    this.messages.push(message);
    if (emit) {
      this._emit("message", message);
      if ((isFunctionMessage(message) || isToolMessage(message)) && message.content) {
        this._emit("functionCallResult", message.content);
      } else if (isAssistantMessage(message) && message.function_call) {
        this._emit("functionCall", message.function_call);
      } else if (isAssistantMessage(message) && message.tool_calls) {
        for (const tool_call of message.tool_calls) {
          if (tool_call.type === "function") {
            this._emit("functionCall", tool_call.function);
          }
        }
      }
    }
  }
  _connected() {
    if (this.ended)
      return;
    __classPrivateFieldGet(this, _AbstractChatCompletionRunner_resolveConnectedPromise, "f").call(this);
    this._emit("connect");
  }
  get ended() {
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_ended, "f");
  }
  get errored() {
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_errored, "f");
  }
  get aborted() {
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_aborted, "f");
  }
  abort() {
    this.controller.abort();
  }
  /**
   * Adds the listener function to the end of the listeners array for the event.
   * No checks are made to see if the listener has already been added. Multiple calls passing
   * the same combination of event and listener will result in the listener being added, and
   * called, multiple times.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  on(event, listener) {
    const listeners = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_listeners, "f")[event] || (__classPrivateFieldGet(this, _AbstractChatCompletionRunner_listeners, "f")[event] = []);
    listeners.push({ listener });
    return this;
  }
  /**
   * Removes the specified listener from the listener array for the event.
   * off() will remove, at most, one instance of a listener from the listener array. If any single
   * listener has been added multiple times to the listener array for the specified event, then
   * off() must be called multiple times to remove each instance.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  off(event, listener) {
    const listeners = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_listeners, "f")[event];
    if (!listeners)
      return this;
    const index = listeners.findIndex((l) => l.listener === listener);
    if (index >= 0)
      listeners.splice(index, 1);
    return this;
  }
  /**
   * Adds a one-time listener function for the event. The next time the event is triggered,
   * this listener is removed and then invoked.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  once(event, listener) {
    const listeners = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_listeners, "f")[event] || (__classPrivateFieldGet(this, _AbstractChatCompletionRunner_listeners, "f")[event] = []);
    listeners.push({ listener, once: true });
    return this;
  }
  /**
   * This is similar to `.once()`, but returns a Promise that resolves the next time
   * the event is triggered, instead of calling a listener callback.
   * @returns a Promise that resolves the next time given event is triggered,
   * or rejects if an error is emitted.  (If you request the 'error' event,
   * returns a promise that resolves with the error).
   *
   * Example:
   *
   *   const message = await stream.emitted('message') // rejects if the stream errors
   */
  emitted(event) {
    return new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _AbstractChatCompletionRunner_catchingPromiseCreated, true, "f");
      if (event !== "error")
        this.once("error", reject);
      this.once(event, resolve);
    });
  }
  async done() {
    __classPrivateFieldSet(this, _AbstractChatCompletionRunner_catchingPromiseCreated, true, "f");
    await __classPrivateFieldGet(this, _AbstractChatCompletionRunner_endPromise, "f");
  }
  /**
   * @returns a promise that resolves with the final ChatCompletion, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletion.
   */
  async finalChatCompletion() {
    await this.done();
    const completion = this._chatCompletions[this._chatCompletions.length - 1];
    if (!completion)
      throw new TogetherError("stream ended without producing a ChatCompletion");
    return completion;
  }
  /**
   * @returns a promise that resolves with the content of the final ChatCompletionMessage, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalContent() {
    await this.done();
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
  }
  /**
   * @returns a promise that resolves with the the final assistant ChatCompletionMessage response,
   * or rejects if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalMessage() {
    await this.done();
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
  }
  /**
   * @returns a promise that resolves with the content of the final FunctionCall, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalFunctionCall() {
    await this.done();
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionCall).call(this);
  }
  async finalFunctionCallResult() {
    await this.done();
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionCallResult).call(this);
  }
  async totalUsage() {
    await this.done();
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this);
  }
  allChatCompletions() {
    return [...this._chatCompletions];
  }
  _emit(event, ...args) {
    if (__classPrivateFieldGet(this, _AbstractChatCompletionRunner_ended, "f")) {
      return;
    }
    if (event === "end") {
      __classPrivateFieldSet(this, _AbstractChatCompletionRunner_ended, true, "f");
      __classPrivateFieldGet(this, _AbstractChatCompletionRunner_resolveEndPromise, "f").call(this);
    }
    const listeners = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_listeners, "f")[event];
    if (listeners) {
      __classPrivateFieldGet(this, _AbstractChatCompletionRunner_listeners, "f")[event] = listeners.filter((l) => !l.once);
      listeners.forEach(({ listener }) => listener(...args));
    }
    if (event === "abort") {
      const error = args[0];
      if (!__classPrivateFieldGet(this, _AbstractChatCompletionRunner_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet(this, _AbstractChatCompletionRunner_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet(this, _AbstractChatCompletionRunner_rejectEndPromise, "f").call(this, error);
      this._emit("end");
      return;
    }
    if (event === "error") {
      const error = args[0];
      if (!__classPrivateFieldGet(this, _AbstractChatCompletionRunner_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet(this, _AbstractChatCompletionRunner_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet(this, _AbstractChatCompletionRunner_rejectEndPromise, "f").call(this, error);
      this._emit("end");
    }
  }
  _emitFinal() {
    const completion = this._chatCompletions[this._chatCompletions.length - 1];
    if (completion)
      this._emit("finalChatCompletion", completion);
    const finalMessage = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
    if (finalMessage)
      this._emit("finalMessage", finalMessage);
    const finalContent = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
    if (finalContent)
      this._emit("finalContent", finalContent);
    const finalFunctionCall = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionCall).call(this);
    if (finalFunctionCall)
      this._emit("finalFunctionCall", finalFunctionCall);
    const finalFunctionCallResult = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionCallResult).call(this);
    if (finalFunctionCallResult != null)
      this._emit("finalFunctionCallResult", finalFunctionCallResult);
    if (this._chatCompletions.some((c) => c.usage)) {
      this._emit("totalUsage", __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this));
    }
  }
  async _createChatCompletion(completions, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_validateParams).call(this, params);
    const chatCompletion = await completions.create({ ...params, stream: false }, { ...options, signal: this.controller.signal });
    this._connected();
    return this._addChatCompletion(chatCompletion);
  }
  async _runChatCompletion(completions, params, options) {
    for (const message of params.messages) {
      this._addMessage(
        // @ts-ignore
        message,
        false
      );
    }
    return await this._createChatCompletion(completions, params, options);
  }
  async _runFunctions(completions, params, options) {
    const role = "function";
    const { function_call = "auto", stream, ...restParams } = params;
    const singleFunctionToCall = typeof function_call !== "string" && function_call?.name;
    const { maxChatCompletions = DEFAULT_MAX_CHAT_COMPLETIONS } = options || {};
    const functionsByName = {};
    for (const f of params.functions) {
      functionsByName[f.name || f.function.name] = f;
    }
    const functions = params.functions.map(
      // @ts-ignore
      (f) => ({
        name: f.name || f.function.name,
        parameters: f.parameters,
        description: f.description
      })
    );
    for (const message of params.messages) {
      this._addMessage(
        // @ts-ignore
        message,
        false
      );
    }
    for (let i = 0; i < maxChatCompletions; ++i) {
      const chatCompletion = await this._createChatCompletion(completions, {
        ...restParams,
        function_call,
        functions,
        // @ts-ignore
        messages: [...this.messages]
      }, options);
      const message = chatCompletion.choices[0]?.message;
      if (!message) {
        throw new TogetherError(`missing message in ChatCompletion response`);
      }
      if (!message.function_call)
        return;
      const { name, arguments: args } = message.function_call;
      const fn = functionsByName[name];
      if (!fn) {
        const content2 = `Invalid function_call: ${JSON.stringify(name)}. Available options are: ${functions.map((f) => JSON.stringify(f.name)).join(", ")}. Please try again`;
        this._addMessage({ role, name, content: content2 });
        continue;
      } else if (singleFunctionToCall && singleFunctionToCall !== name) {
        const content2 = `Invalid function_call: ${JSON.stringify(name)}. ${JSON.stringify(singleFunctionToCall)} requested. Please try again`;
        this._addMessage({ role, name, content: content2 });
        continue;
      }
      let parsed;
      try {
        parsed = isRunnableFunctionWithParse(fn) ? await fn.parse(args) : args;
      } catch (error) {
        this._addMessage({
          role,
          name,
          content: error instanceof Error ? error.message : String(error)
        });
        continue;
      }
      const rawContent = await fn.function(parsed, this);
      const content = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_stringifyFunctionCallResult).call(this, rawContent);
      this._addMessage({ role, name, content });
      if (singleFunctionToCall)
        return;
    }
  }
  async _runTools(completions, params, options) {
    const role = "tool";
    const { tool_choice = "auto", stream, ...restParams } = params;
    const singleFunctionToCall = typeof tool_choice !== "string" && tool_choice?.function?.name;
    const { maxChatCompletions = DEFAULT_MAX_CHAT_COMPLETIONS } = options || {};
    const functionsByName = {};
    for (const f of params.tools) {
      if (f.type === "function") {
        functionsByName[f.function.name || f.function.function.name] = f.function;
      }
    }
    const tools = "tools" in params ? params.tools.map((t) => t.type === "function" ? {
      type: "function",
      function: {
        name: t.function.name || t.function.function.name,
        parameters: t.function.parameters,
        description: t.function.description
      }
    } : t) : void 0;
    for (const message of params.messages) {
      this._addMessage(
        // @ts-ignore
        message,
        false
      );
    }
    for (let i = 0; i < maxChatCompletions; ++i) {
      const chatCompletion = await this._createChatCompletion(completions, {
        ...restParams,
        tool_choice,
        tools,
        // @ts-ignore
        messages: [...this.messages]
      }, options);
      const message = chatCompletion.choices[0]?.message;
      if (!message) {
        throw new TogetherError(`missing message in ChatCompletion response`);
      }
      if (!message.tool_calls) {
        return;
      }
      for (const tool_call of message.tool_calls) {
        if (tool_call.type !== "function")
          continue;
        const tool_call_id = tool_call.id;
        const { name, arguments: args } = tool_call.function;
        const fn = functionsByName[name];
        if (!fn) {
          const content2 = `Invalid tool_call: ${JSON.stringify(name)}. Available options are: ${tools.map((f) => JSON.stringify(f.function.name)).join(", ")}. Please try again`;
          this._addMessage({ role, tool_call_id, content: content2 });
          continue;
        } else if (singleFunctionToCall && singleFunctionToCall !== name) {
          const content2 = `Invalid tool_call: ${JSON.stringify(name)}. ${JSON.stringify(singleFunctionToCall)} requested. Please try again`;
          this._addMessage({ role, tool_call_id, content: content2 });
          continue;
        }
        let parsed;
        try {
          parsed = isRunnableFunctionWithParse(fn) ? await fn.parse(args) : args;
        } catch (error) {
          const content2 = error instanceof Error ? error.message : String(error);
          this._addMessage({ role, tool_call_id, content: content2 });
          continue;
        }
        const rawContent = await fn.function(parsed, this);
        const content = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_stringifyFunctionCallResult).call(this, rawContent);
        this._addMessage({ role, tool_call_id, content });
        if (singleFunctionToCall) {
          return;
        }
      }
    }
    return;
  }
};
_AbstractChatCompletionRunner_connectedPromise = /* @__PURE__ */ new WeakMap(), _AbstractChatCompletionRunner_resolveConnectedPromise = /* @__PURE__ */ new WeakMap(), _AbstractChatCompletionRunner_rejectConnectedPromise = /* @__PURE__ */ new WeakMap(), _AbstractChatCompletionRunner_endPromise = /* @__PURE__ */ new WeakMap(), _AbstractChatCompletionRunner_resolveEndPromise = /* @__PURE__ */ new WeakMap(), _AbstractChatCompletionRunner_rejectEndPromise = /* @__PURE__ */ new WeakMap(), _AbstractChatCompletionRunner_listeners = /* @__PURE__ */ new WeakMap(), _AbstractChatCompletionRunner_ended = /* @__PURE__ */ new WeakMap(), _AbstractChatCompletionRunner_errored = /* @__PURE__ */ new WeakMap(), _AbstractChatCompletionRunner_aborted = /* @__PURE__ */ new WeakMap(), _AbstractChatCompletionRunner_catchingPromiseCreated = /* @__PURE__ */ new WeakMap(), _AbstractChatCompletionRunner_handleError = /* @__PURE__ */ new WeakMap(), _AbstractChatCompletionRunner_instances = /* @__PURE__ */ new WeakSet(), _AbstractChatCompletionRunner_getFinalContent = function _AbstractChatCompletionRunner_getFinalContent2() {
  return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this).content ?? null;
}, _AbstractChatCompletionRunner_getFinalMessage = function _AbstractChatCompletionRunner_getFinalMessage2() {
  let i = this.messages.length;
  while (i-- > 0) {
    const message = this.messages[i];
    if (isAssistantMessage(message)) {
      return { ...message, content: message.content ?? null };
    }
  }
  throw new TogetherError("stream ended without producing a ChatCompletionMessage with role=assistant");
}, _AbstractChatCompletionRunner_getFinalFunctionCall = function _AbstractChatCompletionRunner_getFinalFunctionCall2() {
  for (let i = this.messages.length - 1; i >= 0; i--) {
    const message = this.messages[i];
    if (isAssistantMessage(message) && message?.function_call) {
      return message.function_call;
    }
    if (isAssistantMessage(message) && message?.tool_calls?.length) {
      return message.tool_calls.at(-1)?.function;
    }
  }
  return;
}, _AbstractChatCompletionRunner_getFinalFunctionCallResult = function _AbstractChatCompletionRunner_getFinalFunctionCallResult2() {
  for (let i = this.messages.length - 1; i >= 0; i--) {
    const message = this.messages[i];
    if (isFunctionMessage(message) && message.content != null) {
      return message.content;
    }
    if (isToolMessage(message) && message.content != null && this.messages.some((x) => x.role === "assistant" && x.tool_calls?.some((y) => y.type === "function" && y.id === message.tool_call_id))) {
      return message.content;
    }
  }
  return;
}, _AbstractChatCompletionRunner_calculateTotalUsage = function _AbstractChatCompletionRunner_calculateTotalUsage2() {
  const total = {
    completion_tokens: 0,
    prompt_tokens: 0,
    total_tokens: 0
  };
  for (const { usage } of this._chatCompletions) {
    if (usage) {
      total.completion_tokens += usage.completion_tokens;
      total.prompt_tokens += usage.prompt_tokens;
      total.total_tokens += usage.total_tokens;
    }
  }
  return total;
}, _AbstractChatCompletionRunner_validateParams = function _AbstractChatCompletionRunner_validateParams2(params) {
  if (params.n != null && params.n > 1) {
    throw new TogetherError("ChatCompletion convenience helpers only support n=1 at this time. To use n>1, please use chat.completions.create() directly.");
  }
}, _AbstractChatCompletionRunner_stringifyFunctionCallResult = function _AbstractChatCompletionRunner_stringifyFunctionCallResult2(rawContent) {
  return typeof rawContent === "string" ? rawContent : rawContent === void 0 ? "undefined" : JSON.stringify(rawContent);
};

// node_modules/together-ai/internal/utils/bytes.mjs
function concatBytes(buffers) {
  let length = 0;
  for (const buffer of buffers) {
    length += buffer.length;
  }
  const output = new Uint8Array(length);
  let index = 0;
  for (const buffer of buffers) {
    output.set(buffer, index);
    index += buffer.length;
  }
  return output;
}
var encodeUTF8_;
function encodeUTF8(str2) {
  let encoder;
  return (encodeUTF8_ ?? (encoder = new globalThis.TextEncoder(), encodeUTF8_ = encoder.encode.bind(encoder)))(str2);
}
var decodeUTF8_;
function decodeUTF8(bytes) {
  let decoder;
  return (decodeUTF8_ ?? (decoder = new globalThis.TextDecoder(), decodeUTF8_ = decoder.decode.bind(decoder)))(bytes);
}

// node_modules/together-ai/internal/decoders/line.mjs
var _LineDecoder_buffer;
var _LineDecoder_carriageReturnIndex;
var LineDecoder = class {
  constructor() {
    _LineDecoder_buffer.set(this, void 0);
    _LineDecoder_carriageReturnIndex.set(this, void 0);
    __classPrivateFieldSet(this, _LineDecoder_buffer, new Uint8Array(), "f");
    __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
  }
  decode(chunk) {
    if (chunk == null) {
      return [];
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
    __classPrivateFieldSet(this, _LineDecoder_buffer, concatBytes([__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), binaryChunk]), "f");
    const lines = [];
    let patternIndex;
    while ((patternIndex = findNewlineIndex(__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f"))) != null) {
      if (patternIndex.carriage && __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") == null) {
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, patternIndex.index, "f");
        continue;
      }
      if (__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") != null && (patternIndex.index !== __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") + 1 || patternIndex.carriage)) {
        lines.push(decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") - 1)));
        __classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f")), "f");
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
        continue;
      }
      const endIndex = __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") !== null ? patternIndex.preceding - 1 : patternIndex.preceding;
      const line = decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, endIndex));
      lines.push(line);
      __classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(patternIndex.index), "f");
      __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
    }
    return lines;
  }
  flush() {
    if (!__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length) {
      return [];
    }
    return this.decode("\n");
  }
};
_LineDecoder_buffer = /* @__PURE__ */ new WeakMap(), _LineDecoder_carriageReturnIndex = /* @__PURE__ */ new WeakMap();
LineDecoder.NEWLINE_CHARS = /* @__PURE__ */ new Set(["\n", "\r"]);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
function findNewlineIndex(buffer, startIndex) {
  const newline = 10;
  const carriage = 13;
  for (let i = startIndex ?? 0; i < buffer.length; i++) {
    if (buffer[i] === newline) {
      return { preceding: i, index: i + 1, carriage: false };
    }
    if (buffer[i] === carriage) {
      return { preceding: i, index: i + 1, carriage: true };
    }
  }
  return null;
}
function findDoubleNewlineIndex(buffer) {
  const newline = 10;
  const carriage = 13;
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === newline && buffer[i + 1] === newline) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === carriage) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === newline && i + 3 < buffer.length && buffer[i + 2] === carriage && buffer[i + 3] === newline) {
      return i + 4;
    }
  }
  return -1;
}

// node_modules/together-ai/internal/utils/log.mjs
var levelNumbers = {
  off: 0,
  error: 200,
  warn: 300,
  info: 400,
  debug: 500
};
var parseLogLevel = (maybeLevel, sourceName, client) => {
  if (!maybeLevel) {
    return void 0;
  }
  if (hasOwn(levelNumbers, maybeLevel)) {
    return maybeLevel;
  }
  loggerFor(client).warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers))}`);
  return void 0;
};
function noop() {
}
function makeLogFn(fnLevel, logger, logLevel) {
  if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) {
    return noop;
  } else {
    return logger[fnLevel].bind(logger);
  }
}
var noopLogger = {
  error: noop,
  warn: noop,
  info: noop,
  debug: noop
};
var cachedLoggers = /* @__PURE__ */ new WeakMap();
function loggerFor(client) {
  const logger = client.logger;
  const logLevel = client.logLevel ?? "off";
  if (!logger) {
    return noopLogger;
  }
  const cachedLogger = cachedLoggers.get(logger);
  if (cachedLogger && cachedLogger[0] === logLevel) {
    return cachedLogger[1];
  }
  const levelLogger = {
    error: makeLogFn("error", logger, logLevel),
    warn: makeLogFn("warn", logger, logLevel),
    info: makeLogFn("info", logger, logLevel),
    debug: makeLogFn("debug", logger, logLevel)
  };
  cachedLoggers.set(logger, [logLevel, levelLogger]);
  return levelLogger;
}
var formatRequestDetails = (details) => {
  if (details.options) {
    details.options = { ...details.options };
    delete details.options["headers"];
  }
  if (details.headers) {
    details.headers = Object.fromEntries((details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(([name, value]) => [
      name,
      name.toLowerCase() === "authorization" || name.toLowerCase() === "cookie" || name.toLowerCase() === "set-cookie" ? "***" : value
    ]));
  }
  if ("retryOfRequestLogID" in details) {
    if (details.retryOfRequestLogID) {
      details.retryOf = details.retryOfRequestLogID;
    }
    delete details.retryOfRequestLogID;
  }
  return details;
};

// node_modules/together-ai/core/streaming.mjs
var _Stream_client;
var Stream = class _Stream {
  constructor(iterator, controller, client) {
    this.iterator = iterator;
    _Stream_client.set(this, void 0);
    this.controller = controller;
    __classPrivateFieldSet(this, _Stream_client, client, "f");
  }
  static fromSSEResponse(response, controller, client) {
    let consumed = false;
    const logger = client ? loggerFor(client) : console;
    async function* iterator() {
      if (consumed) {
        throw new TogetherError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const sse of _iterSSEMessages(response, controller)) {
          if (done)
            continue;
          if (sse.data.startsWith("[DONE]")) {
            done = true;
            continue;
          }
          if (sse.event === null) {
            let data;
            try {
              data = JSON.parse(sse.data);
            } catch (e) {
              logger.error(`Could not parse message into JSON:`, sse.data);
              logger.error(`From chunk:`, sse.raw);
              throw e;
            }
            if (data && data.error) {
              throw new APIError(void 0, data.error, void 0, response.headers);
            }
            yield data;
          }
        }
        done = true;
      } catch (e) {
        if (isAbortError(e))
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new _Stream(iterator, controller, client);
  }
  /**
   * Generates a Stream from a newline-separated ReadableStream
   * where each item is a JSON value.
   */
  static fromReadableStream(readableStream, controller, client) {
    let consumed = false;
    async function* iterLines() {
      const lineDecoder = new LineDecoder();
      const iter = ReadableStreamToAsyncIterable(readableStream);
      for await (const chunk of iter) {
        for (const line of lineDecoder.decode(chunk)) {
          yield line;
        }
      }
      for (const line of lineDecoder.flush()) {
        yield line;
      }
    }
    async function* iterator() {
      if (consumed) {
        throw new TogetherError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const line of iterLines()) {
          if (done)
            continue;
          if (line)
            yield JSON.parse(line);
        }
        done = true;
      } catch (e) {
        if (isAbortError(e))
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new _Stream(iterator, controller, client);
  }
  [(_Stream_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    return this.iterator();
  }
  /**
   * Splits the stream into two streams which can be
   * independently read from at different speeds.
   */
  tee() {
    const left = [];
    const right = [];
    const iterator = this.iterator();
    const teeIterator = (queue) => {
      return {
        next: () => {
          if (queue.length === 0) {
            const result = iterator.next();
            left.push(result);
            right.push(result);
          }
          return queue.shift();
        }
      };
    };
    return [
      new _Stream(() => teeIterator(left), this.controller, __classPrivateFieldGet(this, _Stream_client, "f")),
      new _Stream(() => teeIterator(right), this.controller, __classPrivateFieldGet(this, _Stream_client, "f"))
    ];
  }
  /**
   * Converts this stream to a newline-separated ReadableStream of
   * JSON stringified values in the stream
   * which can be turned back into a Stream with `Stream.fromReadableStream()`.
   */
  toReadableStream() {
    const self = this;
    let iter;
    return makeReadableStream({
      async start() {
        iter = self[Symbol.asyncIterator]();
      },
      async pull(ctrl) {
        try {
          const { value, done } = await iter.next();
          if (done)
            return ctrl.close();
          const bytes = encodeUTF8(JSON.stringify(value) + "\n");
          ctrl.enqueue(bytes);
        } catch (err) {
          ctrl.error(err);
        }
      },
      async cancel() {
        await iter.return?.();
      }
    });
  }
};
async function* _iterSSEMessages(response, controller) {
  if (!response.body) {
    controller.abort();
    if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative") {
      throw new TogetherError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
    }
    throw new TogetherError(`Attempted to iterate over a response with no body`);
  }
  const sseDecoder = new SSEDecoder();
  const lineDecoder = new LineDecoder();
  const iter = ReadableStreamToAsyncIterable(response.body);
  for await (const sseChunk of iterSSEChunks(iter)) {
    for (const line of lineDecoder.decode(sseChunk)) {
      const sse = sseDecoder.decode(line);
      if (sse)
        yield sse;
    }
  }
  for (const line of lineDecoder.flush()) {
    const sse = sseDecoder.decode(line);
    if (sse)
      yield sse;
  }
}
async function* iterSSEChunks(iterator) {
  let data = new Uint8Array();
  for await (const chunk of iterator) {
    if (chunk == null) {
      continue;
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
    let newData = new Uint8Array(data.length + binaryChunk.length);
    newData.set(data);
    newData.set(binaryChunk, data.length);
    data = newData;
    let patternIndex;
    while ((patternIndex = findDoubleNewlineIndex(data)) !== -1) {
      yield data.slice(0, patternIndex);
      data = data.slice(patternIndex);
    }
  }
  if (data.length > 0) {
    yield data;
  }
}
var SSEDecoder = class {
  constructor() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }
  decode(line) {
    if (line.endsWith("\r")) {
      line = line.substring(0, line.length - 1);
    }
    if (!line) {
      if (!this.event && !this.data.length)
        return null;
      const sse = {
        event: this.event,
        data: this.data.join("\n"),
        raw: this.chunks
      };
      this.event = null;
      this.data = [];
      this.chunks = [];
      return sse;
    }
    this.chunks.push(line);
    if (line.startsWith(":")) {
      return null;
    }
    let [fieldname, _, value] = partition(line, ":");
    if (value.startsWith(" ")) {
      value = value.substring(1);
    }
    if (fieldname === "event") {
      this.event = value;
    } else if (fieldname === "data") {
      this.data.push(value);
    }
    return null;
  }
};
function partition(str2, delimiter) {
  const index = str2.indexOf(delimiter);
  if (index !== -1) {
    return [str2.substring(0, index), delimiter, str2.substring(index + delimiter.length)];
  }
  return [str2, "", ""];
}

// node_modules/together-ai/lib/ChatCompletionStream.mjs
var _ChatCompletionStream_instances;
var _ChatCompletionStream_currentChatCompletionSnapshot;
var _ChatCompletionStream_beginRequest;
var _ChatCompletionStream_addChunk;
var _ChatCompletionStream_endRequest;
var _ChatCompletionStream_accumulateChatCompletion;
var ChatCompletionStream = class _ChatCompletionStream extends AbstractChatCompletionRunner {
  constructor() {
    super(...arguments);
    _ChatCompletionStream_instances.add(this);
    _ChatCompletionStream_currentChatCompletionSnapshot.set(this, void 0);
  }
  get currentChatCompletionSnapshot() {
    return __classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
  }
  /**
   * Intended for use on the frontend, consuming a stream produced with
   * `.toReadableStream()` on the backend.
   *
   * Note that messages sent to the model do not appear in `.on('message')`
   * in this context.
   */
  static fromReadableStream(stream) {
    const runner = new _ChatCompletionStream();
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static createChatCompletion(completions, params, options) {
    const runner = new _ChatCompletionStream();
    runner._run(() => runner._runChatCompletion(completions, { ...params, stream: true }, { ...options, headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" } }));
    return runner;
  }
  async _createChatCompletion(completions, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
    const stream = await completions.create({ ...params, stream: true }, { ...options, signal: this.controller.signal });
    this._connected();
    for await (const chunk of stream) {
      __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return this._addChatCompletion(__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
  }
  async _fromReadableStream(readableStream, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
    this._connected();
    const stream = Stream.fromReadableStream(readableStream, this.controller);
    let chatId;
    for await (const chunk of stream) {
      if (chatId && chatId !== chunk.id) {
        this._addChatCompletion(__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
      }
      __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
      chatId = chunk.id;
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return this._addChatCompletion(__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
  }
  [(_ChatCompletionStream_currentChatCompletionSnapshot = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_instances = /* @__PURE__ */ new WeakSet(), _ChatCompletionStream_beginRequest = function _ChatCompletionStream_beginRequest2() {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, void 0, "f");
  }, _ChatCompletionStream_addChunk = function _ChatCompletionStream_addChunk2(chunk) {
    if (this.ended)
      return;
    const completion = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_accumulateChatCompletion).call(this, chunk);
    this._emit("chunk", chunk, completion);
    const delta = chunk.choices[0]?.delta?.content;
    const snapshot = completion.choices[0]?.message;
    if (delta != null && snapshot?.role === "assistant" && snapshot?.content) {
      this._emit("content", delta, snapshot.content);
    }
  }, _ChatCompletionStream_endRequest = function _ChatCompletionStream_endRequest2() {
    if (this.ended) {
      throw new TogetherError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
    if (!snapshot) {
      throw new TogetherError(`request ended without sending any chunks`);
    }
    __classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, void 0, "f");
    return finalizeChatCompletion(snapshot);
  }, _ChatCompletionStream_accumulateChatCompletion = function _ChatCompletionStream_accumulateChatCompletion2(chunk) {
    var _a2, _b, _c, _d, _e;
    let snapshot = __classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
    const { choices, ...rest } = chunk;
    if (!snapshot) {
      snapshot = __classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, {
        ...rest,
        choices: []
      }, "f");
    } else {
      Object.assign(snapshot, rest);
    }
    for (const { delta, finish_reason, index, logprobs = null, ...other } of chunk.choices) {
      let choice = snapshot.choices[index];
      if (!choice) {
        choice = snapshot.choices[index] = {
          finish_reason,
          index,
          message: {},
          logprobs: { token_ids: [], token_logprobs: [], tokens: [] },
          ...other
        };
      }
      if (logprobs) {
        if (!choice.logprobs) {
          choice.logprobs = { token_ids: [], token_logprobs: [], tokens: [] };
        }
        (_a2 = choice.logprobs).token_ids ?? (_a2.token_ids = []);
        choice.logprobs.token_ids.push(delta.token_id ?? null);
        (_b = choice.logprobs).token_logprobs ?? (_b.token_logprobs = []);
        choice.logprobs.token_logprobs.push(logprobs ?? null);
        (_c = choice.logprobs).tokens ?? (_c.tokens = []);
        choice.logprobs.tokens.push(delta.content ?? null);
      }
      if (finish_reason)
        choice.finish_reason = finish_reason;
      Object.assign(choice, other);
      if (!delta)
        continue;
      const { content, function_call, role, tool_calls, ...rest2 } = delta;
      Object.assign(choice.message, rest2);
      if (content)
        choice.message.content = (choice.message.content || "") + content;
      if (role)
        choice.message.role = role;
      if (function_call) {
        if (!choice.message.function_call) {
          choice.message.function_call = function_call;
        } else {
          if (function_call.name)
            choice.message.function_call.name = function_call.name;
          if (function_call.arguments) {
            (_d = choice.message.function_call).arguments ?? (_d.arguments = "");
            choice.message.function_call.arguments += function_call.arguments;
          }
        }
      }
      if (tool_calls) {
        if (!choice.message.tool_calls)
          choice.message.tool_calls = [];
        for (const { index: index2, id, type, function: fn, ...rest3 } of tool_calls) {
          const tool_call = (_e = choice.message.tool_calls)[index2] ?? (_e[index2] = {});
          Object.assign(tool_call, rest3);
          if (id)
            tool_call.id = id;
          if (type)
            tool_call.type = type;
          if (fn)
            tool_call.function ?? (tool_call.function = { arguments: "" });
          if (fn?.name)
            tool_call.function.name = fn.name;
          if (fn?.arguments)
            tool_call.function.arguments += fn.arguments;
        }
      }
    }
    return snapshot;
  }, Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("chunk", (chunk) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(chunk);
      } else {
        pushQueue.push(chunk);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: void 0, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: void 0, done: true };
      }
    };
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
};
function finalizeChatCompletion(snapshot) {
  const { id, choices, created, model, system_fingerprint, ...rest } = snapshot;
  return {
    ...rest,
    id,
    choices: choices.map(({ message, finish_reason, index, logprobs, ...choiceRest }) => {
      if (!finish_reason)
        throw new TogetherError(`missing finish_reason for choice ${index}`);
      const { content = null, function_call, tool_calls, ...messageRest } = message;
      const role = message.role;
      if (!role)
        throw new TogetherError(`missing role for choice ${index}`);
      if (function_call) {
        const { arguments: args, name } = function_call;
        if (args == null)
          throw new TogetherError(`missing function_call.arguments for choice ${index}`);
        if (!name)
          throw new TogetherError(`missing function_call.name for choice ${index}`);
        return {
          ...choiceRest,
          message: { content, function_call: { arguments: args, name }, role },
          finish_reason,
          index,
          logprobs
        };
      }
      if (tool_calls) {
        return {
          ...choiceRest,
          index,
          finish_reason,
          logprobs,
          message: {
            ...messageRest,
            role,
            content,
            // @ts-ignore
            tool_calls: tool_calls.map((tool_call, i) => {
              const { function: fn, type, id: id2, ...toolRest } = tool_call;
              const { arguments: args, name, ...fnRest } = fn || {};
              if (id2 == null)
                throw new TogetherError(`missing choices[${index}].tool_calls[${i}].id
${str(snapshot)}`);
              if (type == null)
                throw new TogetherError(`missing choices[${index}].tool_calls[${i}].type
${str(snapshot)}`);
              if (name == null)
                throw new TogetherError(`missing choices[${index}].tool_calls[${i}].function.name
${str(snapshot)}`);
              if (args == null)
                throw new TogetherError(`missing choices[${index}].tool_calls[${i}].function.arguments
${str(snapshot)}`);
              return { ...toolRest, id: id2, type, function: { ...fnRest, name, arguments: args } };
            })
          }
        };
      }
      return {
        ...choiceRest,
        message: { ...messageRest, content, role },
        finish_reason,
        index,
        logprobs
      };
    }),
    created,
    model,
    object: "chat.completion",
    ...system_fingerprint ? { system_fingerprint } : {}
  };
}
function str(x) {
  return JSON.stringify(x);
}

// node_modules/together-ai/resources/chat/completions.mjs
var Completions = class extends APIResource {
  create(body, options) {
    return this._client.post("/chat/completions", { body, ...options, stream: body.stream ?? false });
  }
  stream(body, options) {
    return ChatCompletionStream.createChatCompletion(this._client.chat.completions, body, options);
  }
};

// node_modules/together-ai/resources/chat/chat.mjs
var Chat = class extends APIResource {
  constructor() {
    super(...arguments);
    this.completions = new Completions(this._client);
  }
};
Chat.Completions = Completions;

// node_modules/together-ai/resources/code-interpreter/sessions.mjs
var Sessions = class extends APIResource {
  /**
   * Lists all your currently active sessions.
   *
   * @example
   * ```ts
   * const sessionListResponse =
   *   await client.codeInterpreter.sessions.list();
   * ```
   */
  list(options) {
    return this._client.get("/tci/sessions", options);
  }
};

// node_modules/together-ai/resources/code-interpreter/code-interpreter.mjs
var CodeInterpreter = class extends APIResource {
  constructor() {
    super(...arguments);
    this.sessions = new Sessions(this._client);
  }
  /**
   * Executes the given code snippet and returns the output. Without a session_id, a
   * new session will be created to run the code. If you do pass in a valid
   * session_id, the code will be run in that session. This is useful for running
   * multiple code snippets in the same environment, because dependencies and similar
   * things are persisted between calls to the same session.
   *
   * @example
   * ```ts
   * const executeResponse =
   *   await client.codeInterpreter.execute({
   *     code: "print('Hello, world!')",
   *     language: 'python',
   *   });
   * ```
   */
  execute(body, options) {
    return this._client.post("/tci/execute", { body, ...options });
  }
};
CodeInterpreter.Sessions = Sessions;

// node_modules/together-ai/resources/completions.mjs
var Completions2 = class extends APIResource {
  create(body, options) {
    return this._client.post("/completions", { body, ...options, stream: body.stream ?? false });
  }
};

// node_modules/together-ai/resources/embeddings.mjs
var Embeddings = class extends APIResource {
  /**
   * Query an embedding model for a given string of text.
   *
   * @example
   * ```ts
   * const embedding = await client.embeddings.create({
   *   input:
   *     'Our solar system orbits the Milky Way galaxy at about 515,000 mph',
   *   model: 'togethercomputer/m2-bert-80M-8k-retrieval',
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/embeddings", { body, ...options });
  }
};

// node_modules/together-ai/resources/endpoints.mjs
var Endpoints = class extends APIResource {
  /**
   * Creates a new dedicated endpoint for serving models. The endpoint will
   * automatically start after creation. You can deploy any supported model on
   * hardware configurations that meet the model's requirements.
   *
   * @example
   * ```ts
   * const dedicatedEndpoint = await client.endpoints.create({
   *   autoscaling: { max_replicas: 5, min_replicas: 2 },
   *   hardware: '1x_nvidia_a100_80gb_sxm',
   *   model: 'meta-llama/Llama-3-8b-chat-hf',
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/endpoints", { body, ...options });
  }
  /**
   * Retrieves details about a specific endpoint, including its current state,
   * configuration, and scaling settings.
   *
   * @example
   * ```ts
   * const dedicatedEndpoint = await client.endpoints.retrieve(
   *   'endpoint-d23901de-ef8f-44bf-b3e7-de9c1ca8f2d7',
   * );
   * ```
   */
  retrieve(endpointID, options) {
    return this._client.get(path`/endpoints/${endpointID}`, options);
  }
  /**
   * Updates an existing endpoint's configuration. You can modify the display name,
   * autoscaling settings, or change the endpoint's state (start/stop).
   *
   * @example
   * ```ts
   * const dedicatedEndpoint = await client.endpoints.update(
   *   'endpoint-d23901de-ef8f-44bf-b3e7-de9c1ca8f2d7',
   * );
   * ```
   */
  update(endpointID, body, options) {
    return this._client.patch(path`/endpoints/${endpointID}`, { body, ...options });
  }
  /**
   * Returns a list of all endpoints associated with your account. You can filter the
   * results by type (dedicated or serverless).
   *
   * @example
   * ```ts
   * const endpoints = await client.endpoints.list();
   * ```
   */
  list(query = {}, options) {
    return this._client.get("/endpoints", { query, ...options });
  }
  /**
   * Permanently deletes an endpoint. This action cannot be undone.
   *
   * @example
   * ```ts
   * await client.endpoints.delete(
   *   'endpoint-d23901de-ef8f-44bf-b3e7-de9c1ca8f2d7',
   * );
   * ```
   */
  delete(endpointID, options) {
    return this._client.delete(path`/endpoints/${endpointID}`, {
      ...options,
      headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
    });
  }
  /**
   * List all available availability zones.
   *
   * @example
   * ```ts
   * const response = await client.endpoints.listAvzones();
   * ```
   */
  listAvzones(options) {
    return this._client.get("/clusters/availability-zones", options);
  }
};

// node_modules/together-ai/resources/evals.mjs
var Evals = class extends APIResource {
  /**
   * Create an evaluation job
   *
   * @example
   * ```ts
   * const _eval = await client.evals.create({
   *   parameters: {
   *     input_data_file_path: 'file-1234-aefd',
   *     judge: {
   *       model: 'meta-llama/Llama-3-70B-Instruct-Turbo',
   *       model_source: 'serverless',
   *       system_template:
   *         'Imagine you are a helpful assistant',
   *     },
   *     labels: ['yes', 'no'],
   *     pass_labels: ['yes'],
   *   },
   *   type: 'classify',
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/evaluation", { body, ...options });
  }
  /**
   * Get evaluation job details
   *
   * @example
   * ```ts
   * const evaluationJob = await client.evals.retrieve('id');
   * ```
   */
  retrieve(id, options) {
    return this._client.get(path`/evaluation/${id}`, options);
  }
  /**
   * Get all evaluation jobs
   *
   * @example
   * ```ts
   * const evaluationJobs = await client.evals.list();
   * ```
   */
  list(query = {}, options) {
    return this._client.get("/evaluation", { query, ...options });
  }
  /**
   * Get evaluation job status and results
   *
   * @example
   * ```ts
   * const response = await client.evals.status('id');
   * ```
   */
  status(id, options) {
    return this._client.get(path`/evaluation/${id}/status`, options);
  }
};

// node_modules/together-ai/internal/utils/env.mjs
var readEnv = (env) => {
  if (typeof globalThis.process !== "undefined") {
    return globalThis.process.env?.[env]?.trim() ?? void 0;
  }
  if (typeof globalThis.Deno !== "undefined") {
    return globalThis.Deno.env?.get?.(env)?.trim();
  }
  return void 0;
};

// node_modules/together-ai/lib/node-unsafe-imports.mjs
var statMethod;
var resolveMethod;
var createReadStreamMethod;
var extnameMethod;
var readlineMethod;
var isUtf8Method;
var readFileMethod;
try {
  statMethod = __require("fs/promises").stat;
  createReadStreamMethod = __require("fs").createReadStream;
  extnameMethod = __require("path").extname;
  readlineMethod = __require("readline");
  isUtf8Method = __require("buffer").isUtf8;
  resolveMethod = __require("path").resolve;
  readFileMethod = __require("fs/promises").readFile;
} catch {
}

// node_modules/together-ai/lib/check-file.mjs
var MIN_SAMPLES = 1;
var NUM_BYTES_IN_GB = 2 ** 30;
var MAX_FILE_SIZE_GB = 4.9;
var PARQUET_EXPECTED_COLUMNS = ["input_ids", "attention_mask", "labels"];
var REQUIRED_COLUMNS_MESSAGE = ["role", "content"];
var POSSIBLE_ROLES_CONVERSATION = ["system", "user", "assistant"];
var DatasetFormat;
(function(DatasetFormat2) {
  DatasetFormat2["GENERAL"] = "general";
  DatasetFormat2["CONVERSATION"] = "conversation";
  DatasetFormat2["INSTRUCTION"] = "instruction";
  DatasetFormat2["PREFERENCE_OPENAI"] = "preference_openai";
})(DatasetFormat || (DatasetFormat = {}));
var JSONL_REQUIRED_COLUMNS_MAP = {
  [DatasetFormat.GENERAL]: ["text"],
  [DatasetFormat.CONVERSATION]: ["messages"],
  [DatasetFormat.INSTRUCTION]: ["prompt", "completion"],
  [DatasetFormat.PREFERENCE_OPENAI]: ["input", "preferred_output", "non_preferred_output"]
};
var InvalidFileFormatError = class extends Error {
  constructor(message = "", line_number = null, error_source = null) {
    super(message);
    this.message = message;
    this.line_number = line_number;
    this.error_source = error_source;
    this.name = "InvalidFileFormatError";
  }
};
async function checkFile(file, purpose = "fine-tune") {
  const filePath = resolveMethod(file);
  const report_dict = {
    is_check_passed: true,
    message: "Checks passed",
    found: null,
    file_size: null,
    utf8: null,
    line_type: null,
    text_field: null,
    key_value: null,
    has_min_samples: null,
    num_samples: null,
    load_json: null,
    load_csv: null
  };
  try {
    const stats = await statMethod(filePath);
    if (!stats.isFile()) {
      report_dict.found = false;
      report_dict.is_check_passed = false;
      return report_dict;
    }
    report_dict.found = true;
    const file_size = stats.size;
    if (file_size > MAX_FILE_SIZE_GB * NUM_BYTES_IN_GB) {
      report_dict.message = `Maximum supported file size is ${MAX_FILE_SIZE_GB} GB. Found file with size of ${Math.round(file_size / NUM_BYTES_IN_GB * 1e3) / 1e3} GB.`;
      report_dict.is_check_passed = false;
    } else if (file_size === 0) {
      report_dict.message = "File is empty";
      report_dict.file_size = 0;
      report_dict.is_check_passed = false;
      return report_dict;
    } else {
      report_dict.file_size = file_size;
    }
  } catch (e) {
    report_dict.found = false;
    report_dict.is_check_passed = false;
    return report_dict;
  }
  let data_report_dict = {};
  const ext = extnameMethod(filePath);
  try {
    if (ext === ".jsonl") {
      report_dict.filetype = "jsonl";
      data_report_dict = await _check_jsonl(filePath, purpose);
    } else if (ext === ".parquet") {
      report_dict.filetype = "parquet";
      data_report_dict = await _check_parquet(filePath, purpose);
    } else if (ext === ".csv") {
      report_dict.filetype = "csv";
      data_report_dict = await _check_csv(filePath, purpose);
    } else {
      report_dict.filetype = `Unknown extension of file ${filePath}. Only files with extensions .jsonl and .parquet are supported.`;
      report_dict.is_check_passed = false;
    }
  } catch (e) {
    Object.assign(report_dict, e);
  }
  Object.assign(report_dict, data_report_dict);
  return report_dict;
}
function _check_conversation_type(messages, idx) {
  if (!Array.isArray(messages)) {
    throw new InvalidFileFormatError(`Invalid format on line ${idx + 1} of the input file. The \`messages\` column must be a list. Found ${typeof messages}`, idx + 1, "key_value");
  }
  if (messages.length === 0) {
    throw new InvalidFileFormatError(`Invalid format on line ${idx + 1} of the input file. The \`messages\` column must not be empty.`, idx + 1, "key_value");
  }
  for (const message of messages) {
    if (typeof message !== "object" || message === null || Array.isArray(message)) {
      throw new InvalidFileFormatError(`Invalid format on line ${idx + 1} of the input file. The \`messages\` column must be a list of dicts. Found ${typeof message}`, idx + 1, "key_value");
    }
    for (const column of REQUIRED_COLUMNS_MESSAGE) {
      if (!(column in message)) {
        throw new InvalidFileFormatError(`Missing required column \`${column}\` in message on line ${idx + 1}.`, idx + 1, "key_value");
      }
      if (typeof message[column] !== "string") {
        throw new InvalidFileFormatError(`Column \`${column}\` is not a string on line ${idx + 1}. Found ${typeof message[column]}`, idx + 1, "text_field");
      }
    }
  }
}
function _check_conversation_roles(require_assistant_role, assistant_role_exists, idx) {
  if (require_assistant_role && !assistant_role_exists) {
    throw new InvalidFileFormatError(`Invalid format on line ${idx + 1} of the input file. At least one message with the assistant role must be present in the example.`, idx + 1, "key_value");
  }
}
function _check_message_weight(message, idx) {
  if ("weight" in message) {
    const weight = message["weight"];
    if (typeof weight !== "number" || !Number.isInteger(weight)) {
      throw new InvalidFileFormatError(`Weight must be an integer on line ${idx + 1}.`, idx + 1, "key_value");
    }
    if (weight !== 0 && weight !== 1) {
      throw new InvalidFileFormatError(`Weight must be either 0 or 1 on line ${idx + 1}.`, idx + 1, "key_value");
    }
  }
}
function _check_message_role(message, previous_role, idx) {
  const role = message["role"];
  if (typeof role !== "string" || !POSSIBLE_ROLES_CONVERSATION.includes(role)) {
    throw new InvalidFileFormatError(`Invalid role \`${role}\` in conversation on line ${idx + 1}. Possible roles: ${POSSIBLE_ROLES_CONVERSATION.join(", ")}`, idx + 1, "key_value");
  }
  if (previous_role !== null && role === previous_role) {
    throw new InvalidFileFormatError(`Invalid role turns on line ${idx + 1} of the input file. After the optional system message, conversation roles must alternate between user/assistant/user/assistant.`, idx + 1, "key_value");
  }
  return role;
}
function validate_messages(messages, idx, require_assistant_role = true) {
  _check_conversation_type(messages, idx);
  const has_weights = messages.some((message) => "weight" in message);
  let previous_role = null;
  let assistant_role_exists = false;
  for (const message of messages) {
    if (has_weights) {
      _check_message_weight(message, idx);
    }
    previous_role = _check_message_role(message, previous_role, idx);
    assistant_role_exists = assistant_role_exists || previous_role === "assistant";
  }
  _check_conversation_roles(require_assistant_role, assistant_role_exists, idx);
}
function validate_preference_openai(example, idx = 0) {
  if (typeof example["input"] !== "object" || example["input"] === null || Array.isArray(example["input"])) {
    throw new InvalidFileFormatError("The dataset is malformed, the `input` field must be a dictionary.", idx + 1, "key_value");
  }
  if (!("messages" in example["input"])) {
    throw new InvalidFileFormatError("The dataset is malformed, the `input` dictionary must contain a `messages` field.", idx + 1, "key_value");
  }
  validate_messages(example["input"]["messages"], idx, false);
  if (example["input"]["messages"].length > 0 && example["input"]["messages"][example["input"]["messages"].length - 1]["role"] === "assistant") {
    throw new InvalidFileFormatError(`The last message in the input conversation must not be from the assistant on line ${idx + 1}.`, idx + 1, "key_value");
  }
  const keys = ["preferred_output", "non_preferred_output"];
  for (const key of keys) {
    if (!(key in example)) {
      throw new InvalidFileFormatError(`The dataset is malformed, the \`${key}\` field must be present in the input dictionary on line ${idx + 1}.`, idx + 1, "key_value");
    }
    if (!Array.isArray(example[key])) {
      throw new InvalidFileFormatError(`The dataset is malformed, the \`${key}\` field must be a list on line ${idx + 1}.`, idx + 1, "key_value");
    }
    if (example[key].length !== 1) {
      throw new InvalidFileFormatError(`The dataset is malformed, the \`${key}\` list must contain exactly one message on line ${idx + 1}.`, idx + 1, "key_value");
    }
    if (typeof example[key][0] !== "object" || example[key][0] === null || Array.isArray(example[key][0])) {
      throw new InvalidFileFormatError(`The dataset is malformed, the first element of \`${key}\` must be a dictionary on line ${idx + 1}.`, idx + 1, "key_value");
    }
    if (!("role" in example[key][0])) {
      throw new InvalidFileFormatError(`The dataset is malformed, the first element of \`${key}\` must have a 'role' field on line ${idx + 1}.`, idx + 1, "key_value");
    }
    if (example[key][0]["role"] !== "assistant") {
      throw new InvalidFileFormatError(`The dataset is malformed, the first element of \`${key}\` must have the 'assistant' role on line ${idx + 1}.`, idx + 1, "key_value");
    }
    if (!("content" in example[key][0])) {
      throw new InvalidFileFormatError(`The dataset is malformed, the first element of \`${key}\` must have a 'content' field on line ${idx + 1}.`, idx + 1, "key_value");
    }
    if (typeof example[key][0]["content"] !== "string") {
      throw new InvalidFileFormatError(`The dataset is malformed, the 'content' field in \`${key}\` must be a string on line ${idx + 1}.`, idx + 1, "key_value");
    }
  }
}
async function _check_utf8(file) {
  const report_dict = {};
  const content = await readFileMethod(file);
  report_dict.utf8 = isUtf8Method(content);
  if (!report_dict.utf8) {
    report_dict.message = `File is not UTF-8 encoded.`;
    report_dict.is_check_passed = false;
    throw report_dict;
  }
  return report_dict;
}
function _check_samples_count(file, report_dict, idx) {
  if (idx + 1 < MIN_SAMPLES) {
    report_dict.has_min_samples = false;
    report_dict.message = `Processing ${file} resulted in only ${idx + 1} samples. Our minimum is ${MIN_SAMPLES} samples. `;
    report_dict.is_check_passed = false;
  } else {
    report_dict.num_samples = idx + 1;
    report_dict.has_min_samples = true;
  }
  return report_dict;
}
async function _check_csv(file, purpose) {
  const report_dict = {};
  if (purpose !== "eval") {
    report_dict.is_check_passed = false;
    report_dict.message = `CSV files are not supported for ${purpose}. Only JSONL and Parquet files are supported.`;
    return report_dict;
  }
  const utf8Check = await _check_utf8(file);
  Object.assign(report_dict, utf8Check);
  if (!report_dict.utf8) {
    return report_dict;
  }
  const fileStream = createReadStreamMethod(file);
  const rl = readlineMethod.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  let idx = -1;
  try {
    let header = null;
    let isFirstLine = true;
    for await (const line of rl) {
      if (isFirstLine) {
        header = line.split(",").map((col) => col.trim());
        if (!header || header.length === 0 || header[0] === "") {
          report_dict.message = "CSV file is empty or has no header.";
          report_dict.is_check_passed = false;
          await rl.close();
          return report_dict;
        }
        isFirstLine = false;
        continue;
      }
      idx++;
      const values = line.split(",").map((val) => val.trim());
      if (values.length !== header.length || values.some((v) => v === "")) {
        throw new InvalidFileFormatError(`CSV file is malformed or the number of columns found on line ${idx + 1} is inconsistent with the header`, idx + 1, "format");
      }
    }
    Object.assign(report_dict, _check_samples_count(file, report_dict, idx));
    report_dict.load_csv = true;
  } catch (e) {
    report_dict.load_csv = false;
    report_dict.is_check_passed = false;
    if (e instanceof InvalidFileFormatError) {
      report_dict.message = e.message;
      if (e.line_number !== null) {
        report_dict.line_number = e.line_number;
      }
      if (e.error_source !== null) {
        report_dict[e.error_source] = false;
      }
    } else {
      if (idx < 0) {
        report_dict.message = "Unable to decode file. File may be empty or in an unsupported format. ";
      } else {
        report_dict.message = `Error parsing the CSV file. Unexpected format on line ${idx + 1}.`;
      }
    }
  } finally {
    await rl.close();
  }
  return report_dict;
}
async function _check_jsonl(file, purpose) {
  const report_dict = {};
  const utf8Check = await _check_utf8(file);
  Object.assign(report_dict, utf8Check);
  if (!report_dict.utf8) {
    return report_dict;
  }
  const fileStream = createReadStreamMethod(file);
  const rl = readlineMethod.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  let dataset_format = null;
  let idx = -1;
  try {
    for await (const line of rl) {
      idx++;
      const json_line = JSON.parse(line);
      if (typeof json_line !== "object" || json_line === null || Array.isArray(json_line)) {
        throw new InvalidFileFormatError(`Error parsing file. Invalid format on line ${idx + 1} of the input file. Datasets must follow text, conversational, or instruction format. For more information, see https://docs.together.ai/docs/fine-tuning-data-preparation`, idx + 1, "line_type");
      }
      if (purpose !== "eval") {
        let current_format = null;
        for (const possible_format of Object.values(DatasetFormat)) {
          const requiredColumns = JSONL_REQUIRED_COLUMNS_MAP[possible_format];
          if (requiredColumns.every((column) => column in json_line)) {
            if (current_format === null) {
              current_format = possible_format;
            } else if (current_format !== possible_format) {
              throw new InvalidFileFormatError(`Found multiple dataset formats in the input file. Got ${current_format} and ${possible_format} on line ${idx + 1}.`, idx + 1, "format");
            }
            for (const column in json_line) {
              if (!requiredColumns.includes(column)) {
                throw new InvalidFileFormatError(`Found extra column "${column}" in the line ${idx + 1}.`, idx + 1, "format");
              }
            }
          }
        }
        if (current_format === null) {
          throw new InvalidFileFormatError(`Error parsing file. Could not detect a format for the line ${idx + 1} with the columns:
${Object.keys(json_line).join(", ")}`, idx + 1, "format");
        }
        if (current_format === DatasetFormat.PREFERENCE_OPENAI) {
          validate_preference_openai(json_line, idx);
        } else if (current_format === DatasetFormat.CONVERSATION) {
          const message_column = JSONL_REQUIRED_COLUMNS_MAP[DatasetFormat.CONVERSATION][0];
          const require_assistant = purpose !== "eval";
          const messages = json_line[message_column];
          validate_messages(messages, idx, require_assistant);
        } else {
          for (const column of JSONL_REQUIRED_COLUMNS_MAP[current_format]) {
            if (typeof json_line[column] !== "string") {
              throw new InvalidFileFormatError(`Invalid value type for "${column}" key on line ${idx + 1}. Expected string. Found ${typeof json_line[column]}.`, idx + 1, "key_value");
            }
          }
        }
        if (dataset_format === null) {
          dataset_format = current_format;
        } else if (current_format !== null) {
          if (current_format !== dataset_format) {
            throw new InvalidFileFormatError(`All samples in the dataset must have the same dataset format. Got ${dataset_format} for the first line and ${current_format} for the line ${idx + 1}.`, idx + 1, "format");
          }
        }
      }
    }
    Object.assign(report_dict, _check_samples_count(file, report_dict, idx));
    report_dict.load_json = true;
  } catch (e) {
    report_dict.load_json = false;
    report_dict.is_check_passed = false;
    if (e instanceof InvalidFileFormatError) {
      report_dict.message = e.message;
      if (e.line_number !== null) {
        report_dict.line_number = e.line_number;
      }
      if (e.error_source !== null) {
        report_dict[e.error_source] = false;
      }
    } else {
      if (idx < 0) {
        report_dict.message = "Unable to decode file. File may be empty or in an unsupported format. ";
      } else {
        report_dict.message = `Error parsing json payload. Unexpected format on line ${idx + 1}.`;
      }
    }
  } finally {
    await rl.close();
  }
  if (!("text_field" in report_dict)) {
    report_dict.text_field = true;
  }
  if (!("line_type" in report_dict)) {
    report_dict.line_type = true;
  }
  if (!("key_value" in report_dict)) {
    report_dict.key_value = true;
  }
  return report_dict;
}
async function _check_parquet(file, purpose) {
  let ParquetReader;
  try {
    const pkg = await import("parquetjs");
    ParquetReader = pkg.ParquetReader;
  } catch {
    throw new Error("parquetjs is not installed and is required to use parquet files. Please install it via `npm install parquetjs`");
  }
  const report_dict = {};
  if (purpose === "eval") {
    report_dict.is_check_passed = false;
    report_dict.message = `Parquet files are not supported for ${purpose}. Only JSONL and CSV files are supported.`;
    return report_dict;
  }
  try {
    const reader = await ParquetReader.openFile(file);
    const schema = reader.schema;
    const column_names = Object.keys(schema.fields);
    if (!column_names.includes("input_ids")) {
      report_dict.load_parquet = `Parquet file ${file} does not contain the \`input_ids\` column.`;
      report_dict.is_check_passed = false;
      await reader.close();
      return report_dict;
    }
    for (const column_name of column_names) {
      if (!PARQUET_EXPECTED_COLUMNS.includes(column_name)) {
        report_dict.load_parquet = `Parquet file ${file} contains an unexpected column ${column_name}. Only columns ${PARQUET_EXPECTED_COLUMNS.join(", ")} are supported.`;
        report_dict.is_check_passed = false;
        await reader.close();
        return report_dict;
      }
    }
    const num_samples = reader.getRowCount();
    if (num_samples < MIN_SAMPLES) {
      report_dict.has_min_samples = false;
      report_dict.message = `Processing ${file} resulted in only ${num_samples} samples. Our minimum is ${MIN_SAMPLES} samples. `;
      report_dict.is_check_passed = false;
      await reader.close();
      return report_dict;
    } else {
      report_dict.num_samples = num_samples;
    }
    await reader.close();
    report_dict.is_check_passed = true;
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : "";
    report_dict.load_parquet = `An exception has occurred when loading the Parquet file ${file}. Please check the file for corruption. Exception trace:
${errorMessage}
${stack}`;
    report_dict.is_check_passed = false;
  }
  return report_dict;
}

// node_modules/together-ai/internal/parse.mjs
async function defaultParseResponse(client, props) {
  const { response, requestLogID, retryOfRequestLogID, startTime } = props;
  const body = await (async () => {
    if (props.options.stream) {
      loggerFor(client).debug("response", response.status, response.url, response.headers, response.body);
      if (props.options.__streamClass) {
        return props.options.__streamClass.fromSSEResponse(response, props.controller, client);
      }
      return Stream.fromSSEResponse(response, props.controller, client);
    }
    if (response.status === 204) {
      return null;
    }
    if (props.options.__binaryResponse) {
      return response;
    }
    const contentType = response.headers.get("content-type");
    const mediaType = contentType?.split(";")[0]?.trim();
    const isJSON = mediaType?.includes("application/json") || mediaType?.endsWith("+json");
    if (isJSON) {
      const json = await response.json();
      return json;
    }
    const text = await response.text();
    return text;
  })();
  loggerFor(client).debug(`[${requestLogID}] response parsed`, formatRequestDetails({
    retryOfRequestLogID,
    url: response.url,
    status: response.status,
    body,
    durationMs: Date.now() - startTime
  }));
  return body;
}

// node_modules/together-ai/core/api-promise.mjs
var _APIPromise_client;
var APIPromise = class _APIPromise extends Promise {
  constructor(client, responsePromise, parseResponse = defaultParseResponse) {
    super((resolve) => {
      resolve(null);
    });
    this.responsePromise = responsePromise;
    this.parseResponse = parseResponse;
    _APIPromise_client.set(this, void 0);
    __classPrivateFieldSet(this, _APIPromise_client, client, "f");
  }
  _thenUnwrap(transform) {
    return new _APIPromise(__classPrivateFieldGet(this, _APIPromise_client, "f"), this.responsePromise, async (client, props) => transform(await this.parseResponse(client, props), props));
  }
  /**
   * Gets the raw `Response` instance instead of parsing the response
   * data.
   *
   * If you want to parse the response body but still get the `Response`
   * instance, you can use {@link withResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  asResponse() {
    return this.responsePromise.then((p) => p.response);
  }
  /**
   * Gets the parsed response data and the raw `Response` instance.
   *
   * If you just want to get the raw `Response` instance without parsing it,
   * you can use {@link asResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  async withResponse() {
    const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
    return { data, response };
  }
  parse() {
    if (!this.parsedPromise) {
      this.parsedPromise = this.responsePromise.then((data) => this.parseResponse(__classPrivateFieldGet(this, _APIPromise_client, "f"), data));
    }
    return this.parsedPromise;
  }
  then(onfulfilled, onrejected) {
    return this.parse().then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.parse().catch(onrejected);
  }
  finally(onfinally) {
    return this.parse().finally(onfinally);
  }
};
_APIPromise_client = /* @__PURE__ */ new WeakMap();

// node_modules/together-ai/lib/upload.mjs
var failedUploadMessage = {
  message: "failed to upload file"
};
var baseURL = readEnv("TOGETHER_API_BASE_URL") || "https://api.together.xyz/v1";
function upload(client, fileName, purpose, check = true) {
  return new APIPromise(client, new Promise(async (resolve, reject) => {
    let fileSize = 0;
    try {
      const stats = await statMethod(fileName);
      fileSize = stats.size;
    } catch {
      reject(new Error("File does not exists"));
    }
    const fileType = extnameMethod(fileName).replace(".", "");
    if (fileType !== "jsonl" && fileType !== "parquet" && fileType !== "csv") {
      return {
        message: "File type must be either .jsonl, .parquet, or .csv"
      };
    }
    if (check) {
      const checkResponse = await checkFile(fileName, purpose);
      if (!checkResponse.is_check_passed) {
        reject(checkResponse.message || `verification of ${fileName} failed with some unknown reason`);
      }
    }
    try {
      const params = new URLSearchParams({
        file_name: fileName,
        file_type: fileType,
        purpose
      });
      const fullUrl = `${baseURL}/files?${params}`;
      const r = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${client.apiKey}`
        },
        redirect: "manual",
        body: params.toString()
      });
      if (r.status !== 302) {
        return reject(failedUploadMessage);
      }
      const uploadUrl = r.headers.get("location") || "";
      if (!uploadUrl || uploadUrl === "") {
        return reject(failedUploadMessage);
      }
      const fileId = r.headers.get("x-together-file-id") || "";
      if (!fileId || fileId === "") {
        return reject(failedUploadMessage);
      }
      const fileStream = createReadStreamMethod(fileName);
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": fileSize.toString()
        },
        body: fileStream
      });
      if (uploadResponse.status !== 200) {
        return reject({
          message: `failed to upload file (${uploadResponse.statusText}) status code ${uploadResponse.status}`
        });
      }
      const data = await client.files.retrieve(fileId).asResponse();
      resolve({
        controller: new AbortController(),
        requestLogID: "",
        retryOfRequestLogID: void 0,
        startTime: Date.now(),
        options: {
          method: "post",
          path: "/files"
        },
        response: data
      });
    } catch (error) {
      reject(error);
    }
  }));
}

// node_modules/together-ai/resources/files.mjs
var Files = class extends APIResource {
  /**
   * List the metadata for a single uploaded data file.
   *
   * @example
   * ```ts
   * const fileResponse = await client.files.retrieve('id');
   * ```
   */
  retrieve(id, options) {
    return this._client.get(path`/files/${id}`, options);
  }
  /**
   * List the metadata for all uploaded data files.
   *
   * @example
   * ```ts
   * const fileList = await client.files.list();
   * ```
   */
  list(options) {
    return this._client.get("/files", options);
  }
  /**
   * Delete a previously uploaded data file.
   *
   * @example
   * ```ts
   * const file = await client.files.delete('id');
   * ```
   */
  delete(id, options) {
    return this._client.delete(path`/files/${id}`, options);
  }
  /**
   * Get the contents of a single uploaded data file.
   *
   * @example
   * ```ts
   * const response = await client.files.content('id');
   *
   * const content = await response.blob();
   * console.log(content);
   * ```
   */
  content(id, options) {
    return this._client.get(path`/files/${id}/content`, {
      ...options,
      headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
      __binaryResponse: true
    });
  }
  /**
   * Upload a file.
   * CUSTOM CODE. DO NOT LET STAINLESS REMOVE.
   */
  upload(file, purpose, check = true) {
    return upload(this._client, file, purpose, check);
  }
};

// node_modules/together-ai/resources/fine-tuning.mjs
var FineTuning = class extends APIResource {
  /**
   * Create a fine-tuning job with the provided model and training data.
   *
   * @example
   * ```ts
   * const fineTuning = await client.fineTuning.create({
   *   model: 'model',
   *   training_file: 'training_file',
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/fine-tunes", { body, ...options });
  }
  /**
   * List the metadata for a single fine-tuning job.
   *
   * @example
   * ```ts
   * const finetuneResponse = await client.fineTuning.retrieve(
   *   'id',
   * );
   * ```
   */
  retrieve(id, options) {
    return this._client.get(path`/fine-tunes/${id}`, options);
  }
  /**
   * List the metadata for all fine-tuning jobs. Returns a list of
   * FinetuneResponseTruncated objects.
   *
   * @example
   * ```ts
   * const fineTunings = await client.fineTuning.list();
   * ```
   */
  list(options) {
    return this._client.get("/fine-tunes", options);
  }
  /**
   * Delete a fine-tuning job.
   *
   * @example
   * ```ts
   * const fineTuning = await client.fineTuning.delete('id');
   * ```
   */
  delete(id, params = {}, options) {
    const { force } = params ?? {};
    return this._client.delete(path`/fine-tunes/${id}`, { query: { force }, ...options });
  }
  /**
   * Cancel a currently running fine-tuning job. Returns a FinetuneResponseTruncated
   * object.
   *
   * @example
   * ```ts
   * const response = await client.fineTuning.cancel('id');
   * ```
   */
  cancel(id, options) {
    return this._client.post(path`/fine-tunes/${id}/cancel`, options);
  }
  /**
   * Receive a compressed fine-tuned model or checkpoint.
   *
   * @example
   * ```ts
   * const response = await client.fineTuning.content({
   *   ft_id: 'ft_id',
   * });
   *
   * const content = await response.blob();
   * console.log(content);
   * ```
   */
  content(query, options) {
    return this._client.get("/finetune/download", {
      query,
      ...options,
      headers: buildHeaders([{ Accept: "application/octet-stream" }, options?.headers]),
      __binaryResponse: true
    });
  }
  /**
   * List the checkpoints for a single fine-tuning job.
   *
   * @example
   * ```ts
   * const response = await client.fineTuning.listCheckpoints(
   *   'id',
   * );
   * ```
   */
  listCheckpoints(id, options) {
    return this._client.get(path`/fine-tunes/${id}/checkpoints`, options);
  }
  /**
   * List the events for a single fine-tuning job.
   *
   * @example
   * ```ts
   * const response = await client.fineTuning.listEvents('id');
   * ```
   */
  listEvents(id, options) {
    return this._client.get(path`/fine-tunes/${id}/events`, options);
  }
};

// node_modules/together-ai/resources/hardware.mjs
var Hardware = class extends APIResource {
  /**
   * Returns a list of available hardware configurations for deploying models. When a
   * model parameter is provided, it returns only hardware configurations compatible
   * with that model, including their current availability status.
   */
  list(query = {}, options) {
    return this._client.get("/hardware", { query, ...options });
  }
};

// node_modules/together-ai/resources/images.mjs
var Images = class extends APIResource {
  /**
   * Use an image model to generate an image for a given prompt.
   *
   * @example
   * ```ts
   * const imageFile = await client.images.generate({
   *   model: 'black-forest-labs/FLUX.1-schnell',
   *   prompt: 'cat floating in space, cinematic',
   * });
   * ```
   */
  generate(body, options) {
    return this._client.post("/images/generations", { body, ...options });
  }
};

// node_modules/together-ai/resources/jobs.mjs
var Jobs = class extends APIResource {
  /**
   * Get the status of a specific job
   *
   * @example
   * ```ts
   * const job = await client.jobs.retrieve(
   *   'job-a15dad11-8d8e-4007-97c5-a211304de284',
   * );
   * ```
   */
  retrieve(jobID, options) {
    return this._client.get(path`/jobs/${jobID}`, options);
  }
  /**
   * List all jobs and their statuses
   *
   * @example
   * ```ts
   * const jobs = await client.jobs.list();
   * ```
   */
  list(options) {
    return this._client.get("/jobs", options);
  }
};

// node_modules/together-ai/resources/models.mjs
var Models = class extends APIResource {
  /**
   * Lists all of Together's open-source models
   *
   * @example
   * ```ts
   * const modelObjects = await client.models.list();
   * ```
   */
  list(options) {
    return this._client.get("/models", options);
  }
  /**
   * Upload a custom model or adapter from Hugging Face or S3
   *
   * @example
   * ```ts
   * const response = await client.models.upload({
   *   model_name: 'Qwen2.5-72B-Instruct',
   *   model_source: 'unsloth/Qwen2.5-72B-Instruct',
   * });
   * ```
   */
  upload(body, options) {
    return this._client.post("/models", { body, ...options });
  }
};

// node_modules/together-ai/resources/rerank.mjs
var Rerank = class extends APIResource {
  /**
   * Query a reranker model
   *
   * @example
   * ```ts
   * const rerank = await client.rerank.create({
   *   documents: [
   *     { title: 'bar', text: 'bar' },
   *     { title: 'bar', text: 'bar' },
   *     { title: 'bar', text: 'bar' },
   *     { title: 'bar', text: 'bar' },
   *   ],
   *   model: 'Salesforce/Llama-Rank-V1',
   *   query: 'What animals can I find near Peru?',
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/rerank", { body, ...options });
  }
};

// node_modules/together-ai/resources/videos.mjs
var Videos = class extends APIResource {
  /**
   * Create a video
   *
   * @example
   * ```ts
   * const videoJob = await client.videos.create({
   *   model: 'model',
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/videos", { body, defaultBaseURL: "https://api.together.xyz/v2", ...options });
  }
  /**
   * Fetch video metadata
   *
   * @example
   * ```ts
   * const videoJob = await client.videos.retrieve('id');
   * ```
   */
  retrieve(id, options) {
    return this._client.get(path`/videos/${id}`, {
      defaultBaseURL: "https://api.together.xyz/v2",
      ...options
    });
  }
};

// node_modules/together-ai/client.mjs
var _Together_instances;
var _a;
var _Together_encoder;
var _Together_baseURLOverridden;
var Together = class {
  /**
   * API Client for interfacing with the Together API.
   *
   * @param {string | undefined} [opts.apiKey=process.env['TOGETHER_API_KEY'] ?? undefined]
   * @param {string} [opts.baseURL=process.env['TOGETHER_BASE_URL'] ?? https://api.together.xyz/v1] - Override the default base URL for the API.
   * @param {number} [opts.timeout=1 minute] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
   * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
   */
  constructor({ baseURL: baseURL2 = readEnv("TOGETHER_BASE_URL"), apiKey = readEnv("TOGETHER_API_KEY"), ...opts } = {}) {
    _Together_instances.add(this);
    _Together_encoder.set(this, void 0);
    this.chat = new Chat(this);
    this.completions = new Completions2(this);
    this.embeddings = new Embeddings(this);
    this.files = new Files(this);
    this.fineTuning = new FineTuning(this);
    this.codeInterpreter = new CodeInterpreter(this);
    this.images = new Images(this);
    this.videos = new Videos(this);
    this.audio = new Audio(this);
    this.models = new Models(this);
    this.jobs = new Jobs(this);
    this.endpoints = new Endpoints(this);
    this.hardware = new Hardware(this);
    this.rerank = new Rerank(this);
    this.batches = new Batches(this);
    this.evals = new Evals(this);
    if (apiKey === void 0) {
      throw new TogetherError("The TOGETHER_API_KEY environment variable is missing or empty; either provide it, or instantiate the Together client with an apiKey option, like new Together({ apiKey: 'My API Key' }).");
    }
    const options = {
      apiKey,
      ...opts,
      baseURL: baseURL2 || `https://api.together.xyz/v1`
    };
    this.baseURL = options.baseURL;
    this.timeout = options.timeout ?? _a.DEFAULT_TIMEOUT;
    this.logger = options.logger ?? console;
    const defaultLogLevel = "warn";
    this.logLevel = defaultLogLevel;
    this.logLevel = parseLogLevel(options.logLevel, "ClientOptions.logLevel", this) ?? parseLogLevel(readEnv("TOGETHER_LOG"), "process.env['TOGETHER_LOG']", this) ?? defaultLogLevel;
    this.fetchOptions = options.fetchOptions;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetch = options.fetch ?? getDefaultFetch();
    __classPrivateFieldSet(this, _Together_encoder, FallbackEncoder, "f");
    this._options = options;
    this.apiKey = apiKey;
  }
  /**
   * Create a new client instance re-using the same options given to the current client with optional overriding.
   */
  withOptions(options) {
    const client = new this.constructor({
      ...this._options,
      baseURL: this.baseURL,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      logger: this.logger,
      logLevel: this.logLevel,
      fetch: this.fetch,
      fetchOptions: this.fetchOptions,
      apiKey: this.apiKey,
      ...options
    });
    return client;
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  validateHeaders({ values, nulls }) {
    return;
  }
  async authHeaders(opts) {
    return buildHeaders([{ Authorization: `Bearer ${this.apiKey}` }]);
  }
  /**
   * Basic re-implementation of `qs.stringify` for primitive types.
   */
  stringifyQuery(query) {
    return Object.entries(query).filter(([_, value]) => typeof value !== "undefined").map(([key, value]) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }
      if (value === null) {
        return `${encodeURIComponent(key)}=`;
      }
      throw new TogetherError(`Cannot stringify type ${typeof value}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`);
    }).join("&");
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${VERSION}`;
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${uuid4()}`;
  }
  makeStatusError(status, error, message, headers) {
    return APIError.generate(status, error, message, headers);
  }
  buildURL(path3, query, defaultBaseURL) {
    const baseURL2 = !__classPrivateFieldGet(this, _Together_instances, "m", _Together_baseURLOverridden).call(this) && defaultBaseURL || this.baseURL;
    const url = isAbsoluteURL(path3) ? new URL(path3) : new URL(baseURL2 + (baseURL2.endsWith("/") && path3.startsWith("/") ? path3.slice(1) : path3));
    const defaultQuery = this.defaultQuery();
    if (!isEmptyObj(defaultQuery)) {
      query = { ...defaultQuery, ...query };
    }
    if (typeof query === "object" && query && !Array.isArray(query)) {
      url.search = this.stringifyQuery(query);
    }
    return url.toString();
  }
  /**
   * Used as a callback for mutating the given `FinalRequestOptions` object.
   */
  async prepareOptions(options) {
  }
  /**
   * Used as a callback for mutating the given `RequestInit` object.
   *
   * This is useful for cases where you want to add certain headers based off of
   * the request properties, e.g. `method` or `url`.
   */
  async prepareRequest(request, { url, options }) {
  }
  get(path3, opts) {
    return this.methodRequest("get", path3, opts);
  }
  post(path3, opts) {
    return this.methodRequest("post", path3, opts);
  }
  patch(path3, opts) {
    return this.methodRequest("patch", path3, opts);
  }
  put(path3, opts) {
    return this.methodRequest("put", path3, opts);
  }
  delete(path3, opts) {
    return this.methodRequest("delete", path3, opts);
  }
  methodRequest(method, path3, opts) {
    return this.request(Promise.resolve(opts).then((opts2) => {
      return { method, path: path3, ...opts2 };
    }));
  }
  request(options, remainingRetries = null) {
    return new APIPromise(this, this.makeRequest(options, remainingRetries, void 0));
  }
  async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
    const options = await optionsInput;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    if (retriesRemaining == null) {
      retriesRemaining = maxRetries;
    }
    await this.prepareOptions(options);
    const { req, url, timeout } = await this.buildRequest(options, {
      retryCount: maxRetries - retriesRemaining
    });
    await this.prepareRequest(req, { url, options });
    const requestLogID = "log_" + (Math.random() * (1 << 24) | 0).toString(16).padStart(6, "0");
    const retryLogStr = retryOfRequestLogID === void 0 ? "" : `, retryOf: ${retryOfRequestLogID}`;
    const startTime = Date.now();
    loggerFor(this).debug(`[${requestLogID}] sending request`, formatRequestDetails({
      retryOfRequestLogID,
      method: options.method,
      url,
      options,
      headers: req.headers
    }));
    if (options.signal?.aborted) {
      throw new APIUserAbortError();
    }
    const controller = new AbortController();
    const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError);
    const headersTime = Date.now();
    if (response instanceof globalThis.Error) {
      const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
      if (options.signal?.aborted) {
        throw new APIUserAbortError();
      }
      const isTimeout = isAbortError(response) || /timed? ?out/i.test(String(response) + ("cause" in response ? String(response.cause) : ""));
      if (retriesRemaining) {
        loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - ${retryMessage}`);
        loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (${retryMessage})`, formatRequestDetails({
          retryOfRequestLogID,
          url,
          durationMs: headersTime - startTime,
          message: response.message
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
      }
      loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - error; no more retries left`);
      loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (error; no more retries left)`, formatRequestDetails({
        retryOfRequestLogID,
        url,
        durationMs: headersTime - startTime,
        message: response.message
      }));
      if (isTimeout) {
        throw new APIConnectionTimeoutError();
      }
      throw new APIConnectionError({ cause: response });
    }
    const responseInfo = `[${requestLogID}${retryLogStr}] ${req.method} ${url} ${response.ok ? "succeeded" : "failed"} with status ${response.status} in ${headersTime - startTime}ms`;
    if (!response.ok) {
      const shouldRetry = await this.shouldRetry(response);
      if (retriesRemaining && shouldRetry) {
        const retryMessage2 = `retrying, ${retriesRemaining} attempts remaining`;
        await CancelReadableStream(response.body);
        loggerFor(this).info(`${responseInfo} - ${retryMessage2}`);
        loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage2})`, formatRequestDetails({
          retryOfRequestLogID,
          url: response.url,
          status: response.status,
          headers: response.headers,
          durationMs: headersTime - startTime
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID, response.headers);
      }
      const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;
      loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
      const errText = await response.text().catch((err2) => castToError(err2).message);
      const errJSON = safeJSON(errText);
      const errMessage = errJSON ? void 0 : errText;
      loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails({
        retryOfRequestLogID,
        url: response.url,
        status: response.status,
        headers: response.headers,
        message: errMessage,
        durationMs: Date.now() - startTime
      }));
      const err = this.makeStatusError(response.status, errJSON, errMessage, response.headers);
      throw err;
    }
    loggerFor(this).info(responseInfo);
    loggerFor(this).debug(`[${requestLogID}] response start`, formatRequestDetails({
      retryOfRequestLogID,
      url: response.url,
      status: response.status,
      headers: response.headers,
      durationMs: headersTime - startTime
    }));
    return { response, options, controller, requestLogID, retryOfRequestLogID, startTime };
  }
  async fetchWithTimeout(url, init, ms, controller) {
    const { signal, method, ...options } = init || {};
    if (signal)
      signal.addEventListener("abort", () => controller.abort());
    const timeout = setTimeout(() => controller.abort(), ms);
    const isReadableBody = globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream || typeof options.body === "object" && options.body !== null && Symbol.asyncIterator in options.body;
    const fetchOptions = {
      signal: controller.signal,
      ...isReadableBody ? { duplex: "half" } : {},
      method: "GET",
      ...options
    };
    if (method) {
      fetchOptions.method = method.toUpperCase();
    }
    try {
      return await this.fetch.call(void 0, url, fetchOptions);
    } finally {
      clearTimeout(timeout);
    }
  }
  async shouldRetry(response) {
    const shouldRetryHeader = response.headers.get("x-should-retry");
    if (shouldRetryHeader === "true")
      return true;
    if (shouldRetryHeader === "false")
      return false;
    if (response.status === 408)
      return true;
    if (response.status === 409)
      return true;
    if (response.status === 429)
      return true;
    if (response.status >= 501)
      return true;
    return false;
  }
  async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
    let timeoutMillis;
    const retryAfterMillisHeader = responseHeaders?.get("retry-after-ms");
    if (retryAfterMillisHeader) {
      const timeoutMs = parseFloat(retryAfterMillisHeader);
      if (!Number.isNaN(timeoutMs)) {
        timeoutMillis = timeoutMs;
      }
    }
    const retryAfterHeader = responseHeaders?.get("retry-after");
    if (retryAfterHeader && !timeoutMillis) {
      const timeoutSeconds = parseFloat(retryAfterHeader);
      if (!Number.isNaN(timeoutSeconds)) {
        timeoutMillis = timeoutSeconds * 1e3;
      } else {
        timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
      }
    }
    if (!(timeoutMillis && 0 <= timeoutMillis && timeoutMillis < 60 * 1e3)) {
      const maxRetries = options.maxRetries ?? this.maxRetries;
      timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
    }
    await sleep(timeoutMillis);
    return this.makeRequest(options, retriesRemaining - 1, requestLogID);
  }
  calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
    const initialRetryDelay = 1;
    const maxRetryDelay = 10;
    const numRetries = maxRetries - retriesRemaining;
    const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);
    const jitter = 1 - Math.random() * 0.25;
    return sleepSeconds * jitter * 1e3;
  }
  async buildRequest(inputOptions, { retryCount = 0 } = {}) {
    const options = { ...inputOptions };
    const { method, path: path3, query, defaultBaseURL } = options;
    const url = this.buildURL(path3, query, defaultBaseURL);
    if ("timeout" in options)
      validatePositiveInteger("timeout", options.timeout);
    options.timeout = options.timeout ?? this.timeout;
    const { bodyHeaders, body } = this.buildBody({ options });
    const reqHeaders = await this.buildHeaders({ options: inputOptions, method, bodyHeaders, retryCount });
    const req = {
      method,
      headers: reqHeaders,
      ...options.signal && { signal: options.signal },
      ...globalThis.ReadableStream && body instanceof globalThis.ReadableStream && { duplex: "half" },
      ...body && { body },
      ...this.fetchOptions ?? {},
      ...options.fetchOptions ?? {}
    };
    return { req, url, timeout: options.timeout };
  }
  async buildHeaders({ options, method, bodyHeaders, retryCount }) {
    let idempotencyHeaders = {};
    if (this.idempotencyHeader && method !== "get") {
      if (!options.idempotencyKey)
        options.idempotencyKey = this.defaultIdempotencyKey();
      idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
    }
    const headers = buildHeaders([
      idempotencyHeaders,
      {
        Accept: "application/json",
        "User-Agent": this.getUserAgent(),
        "X-Stainless-Retry-Count": String(retryCount),
        ...options.timeout ? { "X-Stainless-Timeout": String(Math.trunc(options.timeout / 1e3)) } : {},
        ...getPlatformHeaders()
      },
      await this.authHeaders(options),
      this._options.defaultHeaders,
      bodyHeaders,
      options.headers
    ]);
    this.validateHeaders(headers);
    return headers.values;
  }
  buildBody({ options: { body, headers: rawHeaders } }) {
    if (!body) {
      return { bodyHeaders: void 0, body: void 0 };
    }
    const headers = buildHeaders([rawHeaders]);
    if (
      // Pass raw type verbatim
      ArrayBuffer.isView(body) || body instanceof ArrayBuffer || body instanceof DataView || typeof body === "string" && // Preserve legacy string encoding behavior for now
      headers.values.has("content-type") || // `Blob` is superset of `File`
      globalThis.Blob && body instanceof globalThis.Blob || // `FormData` -> `multipart/form-data`
      body instanceof FormData || // `URLSearchParams` -> `application/x-www-form-urlencoded`
      body instanceof URLSearchParams || // Send chunked stream (each chunk has own `length`)
      globalThis.ReadableStream && body instanceof globalThis.ReadableStream
    ) {
      return { bodyHeaders: void 0, body };
    } else if (typeof body === "object" && (Symbol.asyncIterator in body || Symbol.iterator in body && "next" in body && typeof body.next === "function")) {
      return { bodyHeaders: void 0, body: ReadableStreamFrom(body) };
    } else {
      return __classPrivateFieldGet(this, _Together_encoder, "f").call(this, { body, headers });
    }
  }
};
_a = Together, _Together_encoder = /* @__PURE__ */ new WeakMap(), _Together_instances = /* @__PURE__ */ new WeakSet(), _Together_baseURLOverridden = function _Together_baseURLOverridden2() {
  return this.baseURL !== "https://api.together.xyz/v1";
};
Together.Together = _a;
Together.DEFAULT_TIMEOUT = 6e4;
Together.TogetherError = TogetherError;
Together.APIError = APIError;
Together.APIConnectionError = APIConnectionError;
Together.APIConnectionTimeoutError = APIConnectionTimeoutError;
Together.APIUserAbortError = APIUserAbortError;
Together.NotFoundError = NotFoundError;
Together.ConflictError = ConflictError;
Together.RateLimitError = RateLimitError;
Together.BadRequestError = BadRequestError;
Together.AuthenticationError = AuthenticationError;
Together.InternalServerError = InternalServerError;
Together.PermissionDeniedError = PermissionDeniedError;
Together.UnprocessableEntityError = UnprocessableEntityError;
Together.toFile = toFile;
Together.Chat = Chat;
Together.Completions = Completions2;
Together.Embeddings = Embeddings;
Together.Files = Files;
Together.FineTuning = FineTuning;
Together.CodeInterpreter = CodeInterpreter;
Together.Images = Images;
Together.Videos = Videos;
Together.Audio = Audio;
Together.Models = Models;
Together.Jobs = Jobs;
Together.Endpoints = Endpoints;
Together.Hardware = Hardware;
Together.Rerank = Rerank;
Together.Batches = Batches;
Together.Evals = Evals;

// scripts/check-together-models.ts
var dotenv = __toESM(require_main(), 1);
import path2 from "path";
dotenv.config({ path: path2.resolve(process.cwd(), ".env") });
async function listModels() {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.error("Error: TOGETHER_API_KEY not found in environment variables");
    process.exit(1);
  }
  console.log("Using API Key:", apiKey.substring(0, 5) + "...");
  const together = new Together({ apiKey });
  try {
    const models = await together.models.list();
    console.log("\n--- Available Image Models ---");
    const imageModels = models.filter((m) => m.type === "image" || m.id.includes("image") || m.id.includes("FLUX") || m.id.includes("Seedream"));
    if (imageModels.length === 0) {
      console.log('No models with type "image" found. Listing ALL models that might be relevant:');
      models.forEach((m) => {
        if (m.id.includes("diffusion") || m.id.includes("flux") || m.id.includes("image")) {
          console.log(`- ${m.id} (type: ${m.type})`);
        }
      });
    } else {
      imageModels.forEach((m) => {
        console.log(`- ${m.id} (type: ${m.type})`);
      });
    }
    console.log("\n--- Checking specific user-requested models ---");
    const requested = ["google/flash-image-2.5", "ByteDance-Seed/Seedream-4.0", "black-forest-labs/FLUX.1-schnell", "black-forest-labs/FLUX.1-schnell-Free"];
    for (const reqId of requested) {
      const found = models.find((m) => m.id === reqId);
      if (found) {
        console.log(`[AVAILABLE] ${reqId}`);
      } else {
        console.log(`[MISSING]   ${reqId}`);
      }
    }
  } catch (error) {
    console.error("Error listing models:", error);
  }
}
listModels();
