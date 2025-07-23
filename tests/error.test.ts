import { ErrorHandler } from '../app/error'

describe('error handler', () => {
    it('gracefully handles single errors', () => {
        const handler = new ErrorHandler(1)

        handler.handleError(Error('foo'))
    })

    it('gracefully handles subsequent errors', () => {
        const handler = new ErrorHandler(3)

        handler.handleError(Error('foo'))
        handler.handleError(Error('foo'))
        handler.handleError(Error('foo'))
    })

    it('correctly resets error counter', () => {
        const handler = new ErrorHandler(3)

        handler.handleError(Error('foo'))
        handler.handleError(Error('foo'))
        handler.handleError(Error('foo'))
        handler.resetCounter()
        handler.handleError(Error('bar'))
    })

    it('correctly throws on too many errors', () => {
        const handler = new ErrorHandler(3)

        handler.handleError(Error('foo'))
        handler.handleError(Error('foo'))
        handler.handleError(Error('foo'))

        expect(() => {
            handler.handleError(Error('final error'))
        }).toThrow('final error')
    })
})
