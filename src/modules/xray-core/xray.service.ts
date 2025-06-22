import { ProcessInfo } from 'node-supervisord/dist/interfaces';
import { SupervisordClient } from 'node-supervisord';
import { execa } from '@cjs-exporter/execa';
import { hasher } from 'node-object-hash';
import { table } from 'table';
import ems from 'enhanced-ms';
import pRetry from 'p-retry';
import semver from 'semver';

import { Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InjectSupervisord } from '@localzet/nestjs-supervisor';
import { InjectXtls } from '@localzet/xtls-sdk-nestjs';
import { XtlsApi } from '@localzet/xtls-sdk';

import { ISystemStats } from '@common/utils/get-system-stats/get-system-stats.interface';
import { ICommandResponse } from '@common/types/command-response.type';
import { generateApiConfig } from '@common/utils/generate-api-config';
import { getSystemStats } from '@common/utils/get-system-stats';
import { KNOWN_ERRORS, AURA_NODE_KNOWN_ERROR } from '@localzet/aura-contract';

import {
    GetNodeHealthCheckResponseModel,
    GetXrayStatusAndVersionResponseModel,
    StartXrayResponseModel,
    StopXrayResponseModel,
} from './models';
import { InternalService } from '../internal/internal.service';

const XRAY_PROCESS_NAME = 'xray' as const;

@Injectable()
export class XrayService implements OnApplicationBootstrap, OnModuleInit {
    private readonly logger = new Logger(XrayService.name);
    private readonly configEqualChecking: boolean;

    private readonly xrayPath: string;

    private xrayVersion: null | string = null;
    private configChecksum: null | string = null;
    private isXrayOnline: boolean = false;
    private systemStats: ISystemStats | null = null;
    private isXrayStartedProccesing: boolean = false;
    private xtlsConfigInbounds: Array<string> = [];

    constructor(
        @InjectXtls() private readonly xtlsSdk: XtlsApi,
        @InjectSupervisord() private readonly supervisordApi: SupervisordClient,
        private readonly internalService: InternalService,
        private readonly configService: ConfigService,
    ) {
        this.xrayPath = '/usr/local/bin/xray';
        this.xrayVersion = null;
        this.systemStats = null;
        this.isXrayStartedProccesing = false;
        this.xtlsConfigInbounds = [];
        this.configEqualChecking = this.configService.getOrThrow<boolean>('CONFIG_EQUAL_CHECKING');
    }

    async onModuleInit() {
        this.xrayVersion = await this.getXrayVersionFromExec();
    }

    async onApplicationBootstrap() {
        try {
            this.systemStats = await getSystemStats();

            await this.supervisordApi.getState();
        } catch (error) {
            this.logger.error(`Ошибка в Application Bootstrap: ${error}`);
        }

        this.isXrayOnline = false;
    }

    public async startXray(
        config: Record<string, unknown>,
        ip: string,
    ): Promise<ICommandResponse<StartXrayResponseModel>> {
        const tm = performance.now();

        try {
            if (this.isXrayStartedProccesing) {
                this.logger.warn('Запрос уже выполняется');
                return {
                    isOk: true,
                    response: new StartXrayResponseModel(
                        false,
                        this.xrayVersion,
                        'Запрос уже выполняется',
                        null,
                    ),
                };
            }

            this.isXrayStartedProccesing = true;

            const fullConfig = generateApiConfig(config);

            this.xtlsConfigInbounds = await this.extractInboundTags(fullConfig);

            if (this.configEqualChecking) {
                this.logger.log('Получение контрольной суммы конфигурации...');
                const newChecksum = this.getConfigChecksum(fullConfig);

                if (this.isXrayOnline) {
                    this.logger.warn(
                        `Процесс Xray уже запущен с контрольной суммой ${this.configChecksum}`,
                    );

                    const oldChecksum = this.configChecksum;
                    const isXrayOnline = await this.getXrayInternalStatus();

                    this.logger.debug(`
                    oldChecksum: ${oldChecksum}
                    newChecksum: ${newChecksum}
                    isXrayOnline: ${isXrayOnline}
                `);

                    if (oldChecksum === newChecksum && isXrayOnline) {
                        this.logger.warn('Xray уже онлайн с той же конфигурацией. Пропуск...');

                        return {
                            isOk: true,
                            response: new StartXrayResponseModel(
                                true,
                                this.xrayVersion,
                                null,
                                null,
                            ),
                        };
                    }
                }

                this.configChecksum = newChecksum;
            }

            this.internalService.setXrayConfig(fullConfig);

            this.logger.log(
                'XTLS конфигурация сгенерирована за: ' +
                    ems(performance.now() - tm, {
                        extends: 'short',
                        includeMs: true,
                    }),
            );

            const xrayProcess = await this.restartXrayProcess();

            if (xrayProcess.error) {
                if (xrayProcess.error.includes('XML-RPC fault: SPAWN_ERROR: xray')) {
                    this.logger.error(AURA_NODE_KNOWN_ERROR, {
                        timestamp: new Date().toISOString(),
                        rawError: xrayProcess.error,
                        ...KNOWN_ERRORS.XRAY_FAILED_TO_START,
                    });
                } else {
                    this.logger.error(xrayProcess.error);
                }

                return {
                    isOk: false,
                    response: new StartXrayResponseModel(false, null, xrayProcess.error, null),
                };
            }

            let isStarted = await this.getXrayInternalStatus();

            if (!isStarted && xrayProcess.processInfo!.state === 20) {
                isStarted = await this.getXrayInternalStatus();
            }

            if (!isStarted) {
                this.isXrayOnline = false;

                this.logger.error(
                    '\n' +
                        table(
                            [
                                ['Версия', this.xrayVersion],
                                ['Контрольная сумма', this.configChecksum],
                                ['Мастер IP', ip],
                                ['Внутренний статус', isStarted],
                                ['Ошибка', xrayProcess.error],
                            ],
                            {
                                header: {
                                    content: 'Не удалось запустить Xray',
                                    alignment: 'center',
                                },
                            },
                        ),
                );

                return {
                    isOk: true,
                    response: new StartXrayResponseModel(
                        isStarted,
                        this.xrayVersion,
                        xrayProcess.error,
                        this.systemStats,
                    ),
                };
            }

            this.isXrayOnline = true;

            this.logger.log(
                '\n' +
                    table(
                        [
                            ['Версия', this.xrayVersion],
                            ['Контрольная сумма', this.configChecksum],
                            ['Мастер IP', ip],
                        ],
                        {
                            header: {
                                content: 'Xray запущен',
                                alignment: 'center',
                            },
                        },
                    ),
            );

            return {
                isOk: true,
                response: new StartXrayResponseModel(
                    isStarted,
                    this.xrayVersion,
                    null,
                    this.systemStats,
                ),
            };
        } catch (error) {
            let errorMessage = null;
            if (error instanceof Error) {
                errorMessage = error.message;
            }

            this.logger.error(`Не удалось запустить Xray: ${errorMessage}`);

            return {
                isOk: true,
                response: new StartXrayResponseModel(false, null, errorMessage, null),
            };
        } finally {
            this.logger.log(
                'Запуск XTLS занял: ' +
                    ems(performance.now() - tm, {
                        extends: 'short',
                        includeMs: true,
                    }),
            );

            this.isXrayStartedProccesing = false;
        }
    }

    public async stopXray(): Promise<ICommandResponse<StopXrayResponseModel>> {
        try {
            await this.killAllXrayProcesses();

            this.isXrayOnline = false;
            this.configChecksum = null;
            this.internalService.setXrayConfig({});

            return {
                isOk: true,
                response: new StopXrayResponseModel(true),
            };
        } catch (error) {
            this.logger.error(`Не удалось остановить процесс Xray: ${error}`);
            return {
                isOk: true,
                response: new StopXrayResponseModel(false),
            };
        }
    }

    public async getXrayStatusAndVersion(): Promise<
        ICommandResponse<GetXrayStatusAndVersionResponseModel>
    > {
        try {
            const version = this.xrayVersion;
            const status = await this.getXrayInternalStatus();

            return {
                isOk: true,
                response: new GetXrayStatusAndVersionResponseModel(status, version),
            };
        } catch (error) {
            this.logger.error(`Не удалось получить статус и версию Xray ${error}`);

            return {
                isOk: true,
                response: new GetXrayStatusAndVersionResponseModel(false, null),
            };
        }
    }

    public async getNodeHealthCheck(): Promise<ICommandResponse<GetNodeHealthCheckResponseModel>> {
        try {
            return {
                isOk: true,
                response: new GetNodeHealthCheckResponseModel(
                    true,
                    this.isXrayOnline,
                    this.xrayVersion,
                ),
            };
        } catch (error) {
            this.logger.error(`Не удалось получить проверку здоровья узла: ${error}`);

            return {
                isOk: true,
                response: new GetNodeHealthCheckResponseModel(false, false, null),
            };
        }
    }

    public async killAllXrayProcesses(): Promise<void> {
        try {
            try {
                await this.supervisordApi.stopProcess(XRAY_PROCESS_NAME, true);
            } catch (error) {
                this.logger.error(`Ответ от supervisorctl stop: ${error}`);
            }

            await execa('pkill', ['xray'], { reject: false });

            await new Promise((resolve) => setTimeout(resolve, 1000));

            await execa('pkill', ['-9', 'xray'], { reject: false });

            try {
                const { stdout } = await execa('lsof', ['-i', ':61000', '-t']);
                if (stdout) {
                    await execa('kill', ['-9', stdout.trim()], { reject: false });
                }
            } catch (e) {
                this.logger.error(`Не удалось убить процесс Xray: ${e}`);
            }

            this.logger.log('Все процессы Xray убиты');
        } catch (error) {
            this.logger.log(`Процессы Xray не найдены. Ошибка: ${error}`);
        }
    }

    public async supervisorctlStop(): Promise<void> {
        try {
            await this.supervisordApi.stopProcess(XRAY_PROCESS_NAME, true);

            this.logger.log('Supervisorctl: XTLS остановлен.');
        } catch (error) {
            this.logger.log('Supervisorctl: не удалось остановить XTLS. Ошибка: ', error);
        }
    }

    private getConfigChecksum(config: Record<string, unknown>): string {
        const hash = hasher({
            trim: true,
        }).hash;

        return hash(config);
    }

    private async getXrayVersionFromExec(): Promise<null | string> {
        const output = await execa(this.xrayPath, ['version']);

        const version = semver.valid(semver.coerce(output.stdout));

        if (version) {
            this.xrayVersion = version;
        }

        return version;
    }

    public async getXrayInfo(): Promise<{
        version: string | null;
        path: string;
        systemInfo: ISystemStats | null;
    }> {
        const output = await execa(this.xrayPath, ['version']);
        const version = semver.valid(semver.coerce(output.stdout));

        if (version) {
            this.xrayVersion = version;
        }

        return {
            version: version,
            path: this.xrayPath,
            systemInfo: this.systemStats,
        };
    }

    private async getXrayInternalStatus(): Promise<boolean> {
        try {
            return await pRetry(
                async () => {
                    const { isOk, message } = await this.xtlsSdk.stats.getSysStats();

                    if (!isOk) {
                        throw new Error(message);
                    }

                    return true;
                },
                {
                    retries: 10,
                    minTimeout: 2000,
                    maxTimeout: 2000,
                    onFailedAttempt: (error) => {
                        this.logger.debug(
                            `Попытка получения внутреннего статуса Xray ${error.attemptNumber} не удалась. Осталось попыток: ${error.retriesLeft}.`,
                        );
                    },
                },
            );
        } catch (error) {
            this.logger.error(`Не удалось получить внутренний статус Xray: ${error}`);
            return false;
        }
    }

    private async restartXrayProcess(): Promise<{
        processInfo: ProcessInfo | null;
        error: string | null;
    }> {
        try {
            const processState = await this.supervisordApi.getProcessInfo(XRAY_PROCESS_NAME);

            // Reference: https://supervisord.org/subprocess.html#process-states
            if (processState.state === 20) {
                await this.supervisordApi.stopProcess(XRAY_PROCESS_NAME, true);
            }

            await this.supervisordApi.startProcess(XRAY_PROCESS_NAME, true);

            return {
                processInfo: await this.supervisordApi.getProcessInfo(XRAY_PROCESS_NAME),
                error: null,
            };
        } catch (error) {
            return {
                processInfo: null,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            };
        }
    }

    private async extractInboundTags(config: Record<string, unknown>): Promise<string[]> {
        if (!config.inbounds || !Array.isArray(config.inbounds)) {
            return [];
        }

        return config.inbounds.map((inbound: { tag: string }) => inbound.tag);
    }

    public getSavedInboundsTags(): string[] {
        return this.xtlsConfigInbounds;
    }
}
