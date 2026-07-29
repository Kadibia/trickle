"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
function timestamp() {
    return new Date().toISOString();
}
function formatData(data) {
    if (data === undefined)
        return '';
    return ' ' + (typeof data === 'object' ? JSON.stringify(data) : String(data));
}
exports.log = {
    info(message, data) {
        console.log(`${timestamp()} [INFO] ${message}${formatData(data)}`);
    },
    error(message, data) {
        console.error(`${timestamp()} [ERROR] ${message}${formatData(data)}`);
    },
    warn(message, data) {
        console.warn(`${timestamp()} [WARN] ${message}${formatData(data)}`);
    },
};
