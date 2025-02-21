/**
 * Simple logger that includes ISO timestamps with each log entry
 */
export class Logger {
  private prefix: string;

  constructor(prefix = "") {
    this.prefix = prefix ? `[${prefix}] ` : "";
  }

  private formatMessage(level: string, message: string): string {
    return `${new Date().toISOString()} ${level} ${this.prefix}${message}`;
  }

  info(message: string): void {
    console.log(this.formatMessage("INFO", message));
  }

  warn(message: string): void {
    console.warn(this.formatMessage("WARN", message));
  }

  error(message: string): void {
    console.error(this.formatMessage("ERROR", message));
  }

  debug(message: string): void {
    console.debug(this.formatMessage("DEBUG", message));
  }
}

// Create default logger instance
export const logger = new Logger(); 