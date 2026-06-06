import { beforeEach, expect, test, vi } from 'vitest';
import { FxMonitorHealth } from '@shared/enums';
import { ChildProcessState } from '@modules/FxRunner/ProcessManager';
import FxMonitor from './index';

beforeEach(() => {
    vi.stubGlobal('vibeConfig', {
        restarter: {
            bootGracePeriod: 0,
            resourceStartingTolerance: 60,
        },
    });

    vi.stubGlobal('vibeCore', {
        fxRunner: {
            isIdle: false,
            child: {
                uptime: 45_000,
                status: ChildProcessState.Alive,
                isAlive: false,
                netEndpoint: '127.0.0.1:30120',
            },
            signalSpawnBackoffRequired: vi.fn(),
        },
        fxResources: {
            bootStatus: {
                current: null,
                elapsedSinceLast: null,
            },
        },
        discordBot: {
            updateBotStatus: vi.fn().mockResolvedValue(undefined),
        },
        webServer: {
            webSocket: {
                pushRefresh: vi.fn(),
            },
        },
        metrics: {
            txRuntime: {
                registerFxserverBoot: vi.fn(),
            },
            svRuntime: {
                logServerBoot: vi.fn(),
            },
        },
    });
});

test('does not restart boot when healthcheck is healthy but heartbeat never arrived', () => {
    const monitor = new FxMonitor();
    for (const timer of monitor.timers) clearInterval(timer);

    (monitor as any).healthCheckMonitor.markHealthy();

    const result = (monitor as any).calculateMonitorStatus();

    expect(result).toEqual({
        action: 'SKIP',
        reason: 'Server is healthy via HealthCheck',
    });
    expect(monitor.status.health).toBe(FxMonitorHealth.ONLINE);
});
