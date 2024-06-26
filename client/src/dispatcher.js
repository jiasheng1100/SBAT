// -*- Mode: JavaScript; tab-width: 2; indent-tabs-mode: nil; -*-
// vim:set ft=javascript ts=2 sw=2 sts=2 cindent:
// TODO: does 'arguments.callee.caller' work?

class Dispatcher {
    constructor() {
        this.table = {};
        Dispatcher.dispatchers.push(this); // Add the current instance to the static array of dispatchers
    }

    on(message, host, handler) {
        if (handler === undefined) {
            throw new Error("Handler must be defined");
        }
        if (!this.table[message]) {
            this.table[message] = [];
        }
        this.table[message].push([host, handler]);
        return this;
    }

    post(asynch, message, args, returnType) {
        if (typeof asynch !== 'number') {
            returnType = args;
            args = message;
            message = asynch;
            asynch = null;
        }
        if (args === undefined) {
            args = [];
        }
        const results = [];

        if (typeof message === 'function') {
            const host = this;
            let result;
            if (asynch !== null) {
                result = setTimeout(() => {
                    try {
                        message.apply(host, args);
                    } catch (e) {
                        this.handleAsynchError(e);
                    }
                }, asynch);
            } else {
                result = message.apply(host, args);
            }
            results.push(result);
        } else {
            const todo = this.table[message];
            if (todo) {
                todo.forEach(item => {
                    let result;
                    if (asynch !== null) {
                        result = setTimeout(() => {
                            try {
                                item[1].apply(item[0], args);
                            } catch (e) {
                                this.handleAsynchError(e);
                            }
                        }, asynch);
                    } else {
                        result = item[1].apply(item[0], args);
                    }
                    results.push(result);
                });
            }
        }

        if (returnType === 'any') {
            for (let i = results.length - 1; i >= 0; i--) {
                if (results[i] !== false) return results[i];
            }
            return false;
        }

        if (returnType === 'all') {
            for (let i = results.length - 1; i >= 0; i--) {
                if (results[i] === false) return results[i];
            }
        }

        return results;
    }

    proxy(destination, message) {
        this.on(message, (...args) => {
            destination.post(message, args);
        });
    }

    handleAsynchError(e) {
        if (!this.inAsynchError) {
            this.inAsynchError = true;
            console.warn('Handled async error:', e);
            this.post('dispatchAsynchError', [e]);
            this.inAsynchError = false;
        } else {
            console.warn('Dropped asynch error:', e);
        }
    }

    static post(asynch, message, args, returnType) {
        Dispatcher.dispatchers.forEach(dispatcher => {
            dispatcher.post(asynch, message, args, returnType);
        });
    }
}

Dispatcher.dispatchers = [];
Dispatcher.prototype.inAsynchError = false;

export default Dispatcher;
