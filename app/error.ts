import { createLogger } from './logger'

export class ErrorHandler {
    private static logger = createLogger('error_handler')
    private readonly maxSubsequentErrors
    private counter = 0

    constructor(maxSubsequentErrors: number) {
        this.maxSubsequentErrors = maxSubsequentErrors
    }

    handleError(err: Error): void {
        this.counter++

        // Re-throw if we're reached the maximum allowed amount of subsequent errors
        if (this.counter > this.maxSubsequentErrors) {
            ErrorHandler.logger.error(`Reached maximum subsequent errors, refusing to handle`)
            throw err
        }

        ErrorHandler.logger.error(
            `An exception occurred (${this.counter}/${this.maxSubsequentErrors}): ${err.name}: ${err.message}`,
            err.stack
        )
    }

    resetCounter(): void {
        this.counter = 0
    }
}
