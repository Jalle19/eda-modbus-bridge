import winston from 'winston'

const DEFAULT_LOG_LEVEL = 'info'

// Define log transports here so we can change the log level later
let transports = [new winston.transports.Console()]

const logFormat = winston.format.printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`
})

export const setLogLevel = (logger, level) => {
    logger.info(`Setting log level to ${level}`)
    transports[0].level = level
}

export const createLogger = (module) => {
    return winston.createLogger({
        'level': DEFAULT_LOG_LEVEL,
        'format': winston.format.combine(
            winston.format.label({ label: module }),
            winston.format.timestamp(),
            logFormat
        ),
        'transports': transports,
    })
}
