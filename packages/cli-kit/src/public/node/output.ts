import {isUnitTest, isVerbose} from './context/local.js'
import {PackageManager} from './node-package-manager.js'
import {currentProcessIsGlobal} from './is-global.js'
import {AbortSignal} from './abort.js'
import colors from './colors.js'
import {isTruthy} from './context/utilities.js'
import {TokenItem} from './ui.js'
import {
  ColorContentToken,
  CommandContentToken,
  ContentToken,
  ErrorContentToken,
  HeadingContentToken,
  ItalicContentToken,
  JsonContentToken,
  LinesDiffContentToken,
  LinkContentToken,
  PathContentToken,
  RawContentToken,
  SubHeadingContentToken,
} from '../../private/node/content-tokens.js'
import {tokenItemToString} from '../../private/node/ui/components/TokenizedText.js'
import {consoleLog, consoleWarn, output} from '../../private/node/output.js'
import stripAnsi from 'strip-ansi'
import {Writable} from 'stream'
import type {Change} from 'diff'

export type Logger = Writable | ((message: string, logLevel?: LogLevel) => void)

export class TokenizedString {
  value: string
  constructor(value: string) {
    this.value = value
  }
}

export type OutputMessage = string | TokenizedString

export const outputToken = {
  raw(value: string): RawContentToken {
    return new RawContentToken(value)
  },
  genericShellCommand(value: OutputMessage): CommandContentToken {
    return new CommandContentToken(value)
  },
  json(value: unknown): JsonContentToken {
    return new JsonContentToken(value)
  },
  path(value: OutputMessage): PathContentToken {
    return new PathContentToken(value)
  },
  link(value: OutputMessage, link?: string, fallback?: string | undefined): LinkContentToken {
    return new LinkContentToken(value, link, fallback)
  },
  heading(value: OutputMessage): HeadingContentToken {
    return new HeadingContentToken(value)
  },
  subheading(value: OutputMessage): SubHeadingContentToken {
    return new SubHeadingContentToken(value)
  },
  italic(value: OutputMessage): ItalicContentToken {
    return new ItalicContentToken(value)
  },
  errorText(value: OutputMessage): ErrorContentToken {
    return new ErrorContentToken(value)
  },
  cyan(value: OutputMessage): ColorContentToken {
    return new ColorContentToken(value, colors.cyan)
  },
  yellow(value: OutputMessage): ColorContentToken {
    return new ColorContentToken(value, colors.yellow)
  },
  magenta(value: OutputMessage): ColorContentToken {
    return new ColorContentToken(value, colors.magenta)
  },
  green(value: OutputMessage): ColorContentToken {
    return new ColorContentToken(value, colors.green)
  },
  gray(value: OutputMessage): ColorContentToken {
    return new ColorContentToken(value, colors.gray)
  },
  packagejsonScript(packageManager: PackageManager, scriptName: string, ...scriptArgs: string[]): CommandContentToken {
    return new CommandContentToken(formatPackageManagerCommand(packageManager, scriptName, ...scriptArgs))
  },
  successIcon(): ColorContentToken {
    return new ColorContentToken('✔', colors.green)
  },
  failIcon(): ErrorContentToken {
    return new ErrorContentToken('✖')
  },
  linesDiff(value: Change[]): LinesDiffContentToken {
    return new LinesDiffContentToken(value)
  },
}

/**
 * Given a command and its arguments, it formats it depending on the package manager.
 *
 * @param packageManager - The package manager to use (pnpm, npm, yarn).
 * @param scriptName - The name of the script to run.
 * @param scriptArgs - The arguments to pass to the script.
 * @returns The formatted command.
 */
export function formatPackageManagerCommand(
  packageManager: PackageManager,
  scriptName: string,
  ...scriptArgs: string[]
): string {
  if (currentProcessIsGlobal()) {
    return [scriptName, ...scriptArgs].join(' ')
  }
  switch (packageManager) {
    case 'pnpm':
    case 'bun':
    case 'yarn': {
      const pieces = [packageManager, scriptName, ...scriptArgs]
      return pieces.join(' ')
    }
    case 'npm': {
      const pieces = ['npm', 'run', scriptName]
      if (scriptArgs.length > 0) {
        pieces.push('--')
        pieces.push(...scriptArgs)
      }
      return pieces.join(' ')
    }
    case 'unknown': {
      const pieces = [scriptName, ...scriptArgs]
      return pieces.join(' ')
    }
  }
}

/**
 * Creates a tokenized string from an array of strings and tokens.
 *
 * @param strings - The strings to join.
 * @param keys - Array of tokens or strings to join.
 * @returns The tokenized string.
 */
export function outputContent(
  strings: TemplateStringsArray,
  ...keys: (ContentToken<unknown> | string)[]
): TokenizedString {
  let output = ``
  strings.forEach((string, i) => {
    output += string
    if (i >= keys.length) {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const token = keys[i]!

    if (typeof token === 'string') {
      output += token
    } else if (token) {
      const enumTokenOutput = token.output()

      if (Array.isArray(enumTokenOutput)) {
        enumTokenOutput.forEach((line: string) => {
          output += line
        })
      } else {
        output += enumTokenOutput
      }
    }
  })
  return new TokenizedString(output)
}

/** Log levels. */
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'

/**
 * It maps a level to a numeric value.
 *
 * @param level - The level for which we'll return its numeric value.
 * @returns The numeric value of the level.
 */
function logLevelValue(level: LogLevel): number {
  switch (level) {
    case 'trace':
      return 10
    case 'debug':
      return 20
    case 'info':
      return 30
    case 'warn':
      return 40
    case 'error':
      return 50
    case 'fatal':
      return 60
    default:
      return 30
  }
}

/**
 * It returns the current log level (debug or info).
 *
 * @returns The log level set by the user.
 */
function currentLogLevel(): LogLevel {
  if (isVerbose()) {
    return 'debug'
  } else {
    return 'info'
  }
}

/**
 * It checks if the message should be outputted or not.
 *
 * @param logLevel - The desired log level for the message.
 * @returns True if the message should be outputted, false otherwise.
 */
function shouldOutput(logLevel: LogLevel): boolean {
  if (isUnitTest()) {
    return false
  }
  const currentLogLevelValue = logLevelValue(currentLogLevel())
  const messageLogLevelValue = logLevelValue(logLevel)
  return messageLogLevelValue >= currentLogLevelValue
}

// eslint-disable-next-line import/no-mutable-exports
export let collectedLogs: {[key: string]: string[]} = {}

/**
 * This is only used during UnitTesting.
 * If we are in a testing context, instead of printing the logs to the console,
 * we will store them in a variable that can be accessed from the tests.
 *
 * @param key - The key of the log.
 * @param content - The content of the log.
 */
export function collectLog(key: string, content: OutputMessage): void {
  const output = collectedLogs.output ?? []
  const data = collectedLogs[key] ?? []
  data.push(stripAnsi(stringifyMessage(content) ?? ''))
  output.push(stripAnsi(stringifyMessage(content) ?? ''))
  collectedLogs[key] = data
  collectedLogs.output = output
}

export const clearCollectedLogs = (): void => {
  collectedLogs = {}
}

/**
 * Outputs command result information to the user.
 * Result messages don't get additional formatting.
 * The messages are logged at info level to stdout.
 *
 * @param content - The content to be output to the user.
 */
export function outputResult(content: OutputMessage): void {
  output(content, 'info', consoleLog)
}

/**
 * Logs information at the info level.
 * Info messages don't get additional formatting.
 * Note: By default, info messages are sent through the standard error.
 *
 * @param content - The content to be output to the user.
 * @param logger - The logging function to use to output to the user.
 */
export function outputInfo(content: OutputMessage, logger: Logger = consoleWarn): void {
  const message = stringifyMessage(content)
  if (isUnitTest()) collectLog('info', content)
  outputWhereAppropriate('info', logger, message)
}

/**
 * Outputs a success message to the user.
 * Success messages receive a special formatting to make them stand out in the console.
 * Note: Success messages are sent through the standard error.
 *
 * @param content - The content to be output to the user.
 * @param logger - The logging function to use to output to the user.
 */
export function outputSuccess(content: OutputMessage, logger: Logger = consoleWarn): void {
  const message = colors.bold(`✅ Success! ${stringifyMessage(content)}.`)
  if (isUnitTest()) collectLog('success', content)
  outputWhereAppropriate('info', logger, message)
}

/**
 * Outputs a completed message to the user.
 * Completed message receive a special formatting to make them stand out in the console.
 * Note: Completed messages are sent through the standard error.
 *
 * @param content - The content to be output to the user.
 * @param logger - The logging function to use to output to the user.
 */
export function outputCompleted(content: OutputMessage, logger: Logger = consoleWarn): void {
  const message = `${colors.green('✔')} ${stringifyMessage(content)}`
  if (isUnitTest()) collectLog('completed', content)
  outputWhereAppropriate('info', logger, message)
}

/**
 * Logs a message at the debug level. By default these output is hidden unless the user calls the CLI with --verbose.
 * Debug messages don't get additional formatting.
 * Note: By default, debug messages are sent through the standard error.
 *
 * @param content - The content to be output to the user.
 * @param logger - The logging function to use to output to the user.
 */
export function outputDebug(content: OutputMessage, logger: Logger = consoleWarn): void {
  if (isUnitTest()) collectLog('debug', content)
  const message = colors.gray(stringifyMessage(content))
  outputWhereAppropriate('debug', logger, `${new Date().toISOString()}: ${message}`)
}

/**
 * Logs a message at the warning level.
 * Warning messages receive a special formatting to make them stand out in the console.
 * Note: By default, warning messages are sent through the standard error.
 *
 * @param content - The content to be output to the user.
 * @param logger - The logging function to use to output to the user.
 */
export function outputWarn(content: OutputMessage, logger: Logger = consoleWarn): void {
  if (isUnitTest()) collectLog('warn', content)
  const message = colors.yellow(stringifyMessage(content))
  outputWhereAppropriate('warn', logger, message)
}

/**
 * Prints a new line in the terminal.
 */
export function outputNewline(): void {
  consoleWarn('')
}

/**
 * Converts a Message to string.
 *
 * @param message - The message to convert to string.
 * @returns The string representation of the message.
 */
export function stringifyMessage(message: OutputMessage): string {
  if (message instanceof TokenizedString) {
    return message.value
  } else {
    return message
  }
}

/**
 * Convert a TokenItem to string.
 *
 * @param item - The item to convert to string.
 * @returns The string representation of the item.
 */
export function itemToString(item: TokenItem): string {
  return tokenItemToString(item)
}

export interface OutputProcess {
  /**
   * The prefix to include in the logs
   * [vite] Output coming from Vite.
   */
  prefix: string
  /**
   * A callback to invoke the process. Stdout and stderr should be used
   * to send standard output and error data that gets formatted with the
   * right prefix.
   */
  action: (stdout: Writable, stderr: Writable, signal: AbortSignal) => Promise<void>
}

/**
 * Writes a message to the appropiated logger.
 *
 * @param logLevel - The log level to use to determine if the message should be output.
 * @param logger - The logger to use to output the message.
 * @param message - The message to output.
 */
export function outputWhereAppropriate(logLevel: LogLevel, logger: Logger, message: string): void {
  if (shouldOutput(logLevel)) {
    if (logger instanceof Writable) {
      logger.write(message)
    } else {
      logger(message, logLevel)
    }
  }
}

/**
 * Returns a message without styles (colors or any ANSI escape codes).
 *
 * @param message - The message to remove styles from.
 * @returns The message without styles.
 */
export function unstyled(message: string): string {
  return stripAnsi(message)
}

/**
 * Checks if the console outputs should display colors or not.
 *
 * @param _process - Optional, the process-like object to use to check if the console should display colors. Defaults to the global process.
 * @returns True if the console outputs should display colors, false otherwise.
 */
export function shouldDisplayColors(_process = process): boolean {
  const {env, stdout} = _process
  if (Object.hasOwnProperty.call(env, 'FORCE_COLOR')) {
    return isTruthy(env.FORCE_COLOR)
  } else {
    return Boolean(stdout.isTTY)
  }
}

/**
 * Parse title and body to be a single formatted string.
 *
 * @param title - The title of the message. Will be formatted as a heading.
 * @param body - The body of the message. Will respect the original formatting.
 * @returns The formatted message.
 */
export function formatSection(title: string, body: string): string {
  const formattedTitle = `${title.toUpperCase()}${' '.repeat(35 - title.length)}`
  return outputContent`${outputToken.heading(formattedTitle)}\n${body}`.value
}
