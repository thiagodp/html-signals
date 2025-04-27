
// declare var window: Window & typeof globalThis;

type SanitizerFunction = ( content: string ) => string;

type GenericFetch = ( input: any, init?: any ) => Promise< any >;

export type Options = {
    window?: typeof globalThis | Window,
    document?: Document,
    fetch?: typeof globalThis.fetch | GenericFetch,
    sanitizer?: SanitizerFunction,
};


export type SenderProperties = {
    sendProp?: string,
    sendElement?: string,
    sendAs?: string,
    sendOn?: string,
    sendTo?: string,
    sendOnce?: boolean,
    prevent?: string | boolean,
    onSendError?: string,
}

export type ReceiverProperties = {
    onReceive?: string,
    receiveAs?: string,
    onReceiveError?: string
}
