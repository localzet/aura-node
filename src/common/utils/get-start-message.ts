import { getBorderCharacters, table } from 'table';
import { readPackageJSON } from 'pkg-types';

import { INestApplication } from '@nestjs/common';

import { XrayService } from '../../modules/xray-core/xray.service';

export async function getStartMessage(
    appPort: number,
    internalPort: number,
    app: INestApplication,
) {
    const pkg = await readPackageJSON();

    const xrayService = app.get(XrayService);

    const xrayInfo = await xrayService.getXrayInfo();

    return table(
        [
            [`API: ${appPort}\nТех. порты: 61000, ${internalPort}, 61002`],
            [`XRay Core: v${xrayInfo.version || 'N/A'}\nПапка: ${xrayInfo.path}`],
            [
                `ЦП: ${xrayInfo.systemInfo?.cpuModel} (${xrayInfo.systemInfo?.cpuCores} ядер)\nОЗУ: ${xrayInfo.systemInfo?.memoryTotal}`,
            ],
        ],
        {
            header: {
                content: `Aura Node v${pkg.version}\nhttps://aura.zorin.space`,
                alignment: 'center',
            },
            columnDefault: {
                width: 60,
            },
            columns: {
                0: { alignment: 'center' },
                1: { alignment: 'left' },
            },
            drawVerticalLine: () => false,
            border: getBorderCharacters('ramac'),
        },
    );
}
