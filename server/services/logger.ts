export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  correlationId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

class StructuredLogger {
  private serviceName = 'nederlands-tutor-api';

  public log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...meta,
    };

    const serialized = JSON.stringify(entry);
    if (level === 'ERROR') {
      console.error(serialized);
    } else if (level === 'WARN') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  public info(message: string, meta?: Record<string, unknown>) {
    this.log('INFO', message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>) {
    this.log('WARN', message, meta);
  }

  public error(message: string, meta?: Record<string, unknown>) {
    this.log('ERROR', message, meta);
  }

  public debug(message: string, meta?: Record<string, unknown>) {
    this.log('DEBUG', message, meta);
  }
}

export const logger = new StructuredLogger();
