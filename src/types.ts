
// declare var window: Window & typeof globalThis;

type SanitizerFunction = ( content: string ) => string;

type GenericFetch = ( input: any, init?: any ) => Promise< any >;

export type Win = typeof globalThis & Window;

export type Options = {
    window?: Win,
    document?: Document,
    fetch?: typeof globalThis.fetch | GenericFetch,
    sanitizer?: SanitizerFunction,
};


export type SenderProperties = {
    send?: string,
    sendProp?: string,
    sendElement?: string,
    sendReturn?: string,
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
