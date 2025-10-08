import { NextRequest } from 'next/server'

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogContext {
  userId?: string
  userRole?: string
  requestId?: string
  endpoint?: string
  method?: string
  userAgent?: string
  ip?: string
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` | ${JSON.stringify(context)}` : ''
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const formattedMessage = this.formatMessage(level, message, context)
    
    switch (level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formattedMessage)
        }
        break
      case LogLevel.INFO:
        console.info(formattedMessage)
        break
      case LogLevel.WARN:
        console.warn(formattedMessage)
        break
      case LogLevel.ERROR:
        console.error(formattedMessage)
        break
    }

    // In production, you might want to send logs to a service like DataDog, LogRocket, etc.
    if (this.isProduction && level === LogLevel.ERROR) {
      // TODO: Send to external logging service
      // this.sendToExternalService(level, message, context)
    }
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error, context?: LogContext) {
    const errorContext = {
      ...context,
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorName: error?.name
    }
    this.log(LogLevel.ERROR, message, errorContext)
  }

  // Helper method to extract context from NextRequest
  extractContextFromRequest(request: NextRequest, userId?: string, userRole?: string): LogContext {
    return {
      userId,
      userRole,
      requestId: request.headers.get('x-request-id') || undefined,
      endpoint: request.url,
      method: request.method,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    }
  }

  // API-specific logging methods
  logApiRequest(request: NextRequest, userId?: string, userRole?: string) {
    const context = this.extractContextFromRequest(request, userId, userRole)
    this.info(`API Request: ${request.method} ${request.url}`, context)
  }

  logApiResponse(request: NextRequest, statusCode: number, responseTime?: number, userId?: string, userRole?: string) {
    const context = {
      ...this.extractContextFromRequest(request, userId, userRole),
      statusCode,
      responseTime
    }
    this.info(`API Response: ${request.method} ${request.url} - ${statusCode}${responseTime ? ` (${responseTime}ms)` : ''}`, context)
  }

  logApiError(request: NextRequest, error: Error, userId?: string, userRole?: string) {
    const context = this.extractContextFromRequest(request, userId, userRole)
    this.error(`API Error: ${request.method} ${request.url}`, error, context)
  }

  // Database-specific logging methods
  logDbQuery(operation: string, table: string, duration?: number, context?: LogContext) {
    const queryContext = {
      ...context,
      operation,
      table,
      duration
    }
    this.info(`Database Query: ${operation} on ${table}${duration ? ` (${duration}ms)` : ''}`, queryContext)
  }

  logDbError(operation: string, table: string, error: Error, context?: LogContext) {
    const queryContext = {
      ...context,
      operation,
      table
    }
    this.error(`Database Error: ${operation} on ${table}`, error, queryContext)
  }
}

export const logger = new Logger() 