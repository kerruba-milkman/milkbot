import {deflateRawSync, inflateRawSync} from "zlib";

const decode = function (input) {

    // Replace non-url compatible chars with base64 standard chars
    input = input
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    // Pad out with standard base64 required padding characters
    let pad = input.length % 4;
    if (pad) {
        if (pad === 1) {
            throw new Error('InvalidLengthError: Input base64url string is the wrong length to determine padding');
        }
        input += new Array(5 - pad).join('=');
    }
    return input;
}

const encode = function (input) {
    return input
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=*$/g, '');
}


export function unzipLogs(msg) {
    return inflateRawSync(Buffer.from(decode(msg), "base64")).toString("utf-8")
}

export function zipLog(msg) {
    return encode(deflateRawSync(Buffer.from(msg)).toString("base64"))
}
