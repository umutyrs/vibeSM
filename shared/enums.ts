export enum TxConfigState {
    Unkown = 'unknown',
    Setup = 'setup',
    Deployer = 'deployer',
    Ready = 'ready',
}

export enum FxMonitorHealth {
    OFFLINE = 'OFFLINE',
    ONLINE = 'ONLINE',
    PARTIAL = 'PARTIAL',
    STARTING = 'STARTING',
}

export enum DiscordBotStatus {
    Disabled,
    Starting,
    Ready,
    Error,
}
