import winston from 'winston'

const logFormat = winston.format.printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`
})

export const createLogger = (module, level) => {
    return winston.createLogger({
        'level': level,
        'format': winston.format.combine(
            winston.format.label({ label: module }),
            winston.format.timestamp(),
            logFormat
        ),
        'transports': [new winston.transports.Console()],
    })
}
