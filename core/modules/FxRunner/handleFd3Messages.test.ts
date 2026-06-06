import { beforeEach, expect, test, vi } from 'vitest';
import handleFd3Messages from './handleFd3Messages';

const mutex = 'abc12';

const makeTrace = (payload: unknown, resource = 'monitor') => ({
    key: 0,
    value: {
        channel: 'citizen-server-impl',
        data: {
            type: 'script_structured_trace',
            resource,
            payload,
        },
        file: '',
        func: '',
        line: 0,
    },
});

beforeEach(() => {
    vi.stubGlobal('GetCurrentResourceName', () => 'monitor');
    vi.stubGlobal('vibeCore', {
        fxRunner: {
            child: { mutex },
        },
        fxMonitor: {
            handleHeartBeat: vi.fn(),
        },
        fxResources: {
            handleServerEvents: vi.fn(),
        },
        fxPlayerlist: {
            handleServerEvents: vi.fn(),
        },
        logger: {
            server: { write: vi.fn() },
            admin: { write: vi.fn() },
        },
        metrics: {
            svRuntime: { logServerNodeMemory: vi.fn() },
        },
        database: {
            actions: { ackWarn: vi.fn() },
        },
    });
});

test('handles heartbeat payloads decoded by the fd3 stream parser', () => {
    handleFd3Messages(mutex, makeTrace({ type: 'vibeSMHeartBeat' }));

    expect(vibeCore.fxMonitor.handleHeartBeat).toHaveBeenCalledWith('fd3');
});

test('handles heartbeat payloads emitted as JSON strings', () => {
    handleFd3Messages(mutex, makeTrace(JSON.stringify({ type: 'vibeSMHeartBeat' })));

    expect(vibeCore.fxMonitor.handleHeartBeat).toHaveBeenCalledWith('fd3');
});

test('handles resource events emitted as JSON strings', () => {
    const payload = {
        type: 'vibeSMResourceEvent',
        event: 'onResourceStarting',
        resource: 'sessionmanager',
    };

    handleFd3Messages(mutex, makeTrace(JSON.stringify(payload)));

    expect(vibeCore.fxResources.handleServerEvents).toHaveBeenCalledWith(payload, mutex);
});

test('handles traces from a renamed management resource', () => {
    vi.stubGlobal('GetCurrentResourceName', () => 'vibeSM');

    handleFd3Messages(mutex, makeTrace(JSON.stringify({ type: 'vibeSMHeartBeat' }), 'vibeSM'));

    expect(vibeCore.fxMonitor.handleHeartBeat).toHaveBeenCalledWith('fd3');
});
