'use strict';

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const axios = require('axios');

/**
 * The adapter instance
 * @type {ioBroker.Adapter}
 */
let adapter;

/**
 * Starts the adapter instance
 * @param {Partial<ioBroker.AdapterOptions>} [options]
 */
function startAdapter(options) {
    // Create the adapter and define its methods
    return adapter = utils.adapter(Object.assign({}, options, {
        name: 'corrently',

        ready: main, // Main method defined below for readability
    }));
}

async function main() {
    if (adapter.config.greenEnergy !== false) {
        adapter.log.info(`config PLZ: ${adapter.config.PLZ}`);
        const threshold = parseFloat(adapter.config.greenIndex) || 50;

        try {
            const response = await axios(`https://api.corrently.io/v2.0/gsi/prediction?zip=${adapter.config.PLZ}`);
            const body = response.data;
            const now = Date.now();
            if (body.forecast) {
                await adapter.setStateAsync('data.json', JSON.stringify(body.forecast.map(e =>
                    ({ts: e.timeStamp, price: e.energyprice, eevalue: e.eevalue}))), true);

                let start = null;
                let end;
                for (let i = 0; i < body.forecast.length; i++) {
                    if (start === null && body.forecast[i].eevalue >= threshold) {
                        start = i;
                    } else if (start !== null && body.forecast[i].eevalue < threshold) {
                        if (body.forecast[i].timeStamp > now) {
                            end = i;
                            break;
                        } else {
                            start = null;
                        }
                    }
                }

                if (start !== null) {
                    await adapter.setStateAsync('data.start', new Date(body.forecast[start].timeStamp).toLocaleString(), true);
                    let duration = Math.floor((body.forecast[end].timeStamp - body.forecast[start].timeStamp) / 3600000);
                    duration = duration || 1;
                    await adapter.setStateAsync('data.duration', duration, true);
                    await adapter.setStateAsync('data.green', body.forecast[start].timeStamp < now && body.forecast[end].timeStamp < now, true);
                    const price = body.forecast.find((e, i) => e.timeStamp >= now && now < body.forecast[i + 1].timeStamp);
                    if (price) {
                        await adapter.setStateAsync('data.price', parseFloat(price.energyprice), true);
                    }
                } else {
                    await adapter.setStateAsync('data.start', null, true);
                    await adapter.setStateAsync('data.duration', 0, true);
                    await adapter.setStateAsync('data.green', false, true);
                }
            } else {
                adapter.log.error(`Invalid answer: ${JSON.stringify(body)}`);
            }
        } catch (e) {
            adapter.log.error(`Cannot read API: ${e}`);
        }
    }

    if (adapter.config.solarPrediction) {
        if (adapter.config.useSystemPosition) {
            const pos = await adapter.getForeignObjectAsync('system.config');
            if (pos && pos.common && pos.common.latitude && pos.common.longitude) {
                adapter.config.latitude = pos.common.latitude;
                adapter.config.longitude = pos.common.longitude;
            }
        }

        try {
            const response = await axios(`https://api.corrently.io/v2.0/solar/prediction?lon=${adapter.config.longitude}&lat=${adapter.config.latitude}&wp=${adapter.config.wattPeak}&deg=${adapter.config.deg}&az=${adapter.config.azimuth}`);
            const body = response.data;
            /*
            {
  "input": [
    {
      "lon": "8.7352799",
      "lat": "49.2971779",
      "wp": "4400",
      "deg": "33",
      "az": "0",
      "tech": "crystSi",
      "err": "",
      "loss": "14",
      "plant": "0xF826125A830759CDaCc7428d97eBc0C4af849C77",
      "created": 1678556273981
    }
  ],
  "output": [
    {
      "date": "2023-03-10T23:00:00.000Z",
      "timestamp": 1678489200000,
      "wh": 0
    },
    {
      "date": "2023-03-11T00:00:00.000Z",
      "timestamp": 1678492800000,
      "wh": 0
    },
    {
      "date": "2023-03-11T01:00:00.000Z",
      "timestamp": 1678496400000,
      "wh": 0
    },
    {
      "date": "2023-03-11T02:00:00.000Z",
      "timestamp": 1678500000000,
      "wh": 0
    },
    {
      "date": "2023-03-11T03:00:00.000Z",
      "timestamp": 1678503600000,
      "wh": 0
    },
    {
      "date": "2023-03-11T04:00:00.000Z",
      "timestamp": 1678507200000,
      "wh": 0
    },
    {
      "date": "2023-03-11T05:00:00.000Z",
      "timestamp": 1678510800000,
      "wh": 0
    },
    {
      "date": "2023-03-11T06:00:00.000Z",
      "timestamp": 1678514400000,
      "wh": 10
    },
    {
      "date": "2023-03-11T07:00:00.000Z",
      "timestamp": 1678518000000,
      "wh": 172
    },
    {
      "date": "2023-03-11T08:00:00.000Z",
      "timestamp": 1678521600000,
      "wh": 1262
    },
    {
      "date": "2023-03-11T09:00:00.000Z",
      "timestamp": 1678525200000,
      "wh": 3064
    },
    {
      "date": "2023-03-11T10:00:00.000Z",
      "timestamp": 1678528800000,
      "wh": 1456
    },
    {
      "date": "2023-03-11T11:00:00.000Z",
      "timestamp": 1678532400000,
      "wh": 3426
    },
    {
      "date": "2023-03-11T12:00:00.000Z",
      "timestamp": 1678536000000,
      "wh": 3423
    },
    {
      "date": "2023-03-11T13:00:00.000Z",
      "timestamp": 1678539600000,
      "wh": 2547
    },
    {
      "date": "2023-03-11T14:00:00.000Z",
      "timestamp": 1678543200000,
      "wh": 2724
    },
    {
      "date": "2023-03-11T15:00:00.000Z",
      "timestamp": 1678546800000,
      "wh": 1087
    },
    {
      "date": "2023-03-11T16:00:00.000Z",
      "timestamp": 1678550400000,
      "wh": 726
    },
    {
      "date": "2023-03-11T17:00:00.000Z",
      "timestamp": 1678554000000,
      "wh": 373
    },
    {
      "date": "2023-03-11T18:00:00.000Z",
      "timestamp": 1678557600000,
      "wh": 4
    },
    {
      "date": "2023-03-11T19:00:00.000Z",
      "timestamp": 1678561200000,
      "wh": 0
    },
    {
      "date": "2023-03-11T20:00:00.000Z",
      "timestamp": 1678564800000,
      "wh": 0
    },
    {
      "date": "2023-03-11T21:00:00.000Z",
      "timestamp": 1678568400000,
      "wh": 0
    },
    {
      "date": "2023-03-11T22:00:00.000Z",
      "timestamp": 1678572000000,
      "wh": 0
    },
    {
      "date": "2023-03-11T23:00:00.000Z",
      "timestamp": 1678575600000,
      "wh": 0
    },
    {
      "date": "2023-03-12T00:00:00.000Z",
      "timestamp": 1678579200000,
      "wh": 0
    },
    {
      "date": "2023-03-12T01:00:00.000Z",
      "timestamp": 1678582800000,
      "wh": 0
    },
    {
      "date": "2023-03-12T02:00:00.000Z",
      "timestamp": 1678586400000,
      "wh": 0
    },
    {
      "date": "2023-03-12T03:00:00.000Z",
      "timestamp": 1678590000000,
      "wh": 0
    },
    {
      "date": "2023-03-12T04:00:00.000Z",
      "timestamp": 1678593600000,
      "wh": 0
    },
    {
      "date": "2023-03-12T05:00:00.000Z",
      "timestamp": 1678597200000,
      "wh": 0
    },
    {
      "date": "2023-03-12T06:00:00.000Z",
      "timestamp": 1678600800000,
      "wh": 0
    },
    {
      "date": "2023-03-12T07:00:00.000Z",
      "timestamp": 1678604400000,
      "wh": 3
    },
    {
      "date": "2023-03-12T08:00:00.000Z",
      "timestamp": 1678608000000,
      "wh": 13
    },
    {
      "date": "2023-03-12T09:00:00.000Z",
      "timestamp": 1678611600000,
      "wh": 172
    },
    {
      "date": "2023-03-12T10:00:00.000Z",
      "timestamp": 1678615200000,
      "wh": 378
    },
    {
      "date": "2023-03-12T11:00:00.000Z",
      "timestamp": 1678618800000,
      "wh": 347
    },
    {
      "date": "2023-03-12T12:00:00.000Z",
      "timestamp": 1678622400000,
      "wh": 376
    },
    {
      "date": "2023-03-12T13:00:00.000Z",
      "timestamp": 1678626000000,
      "wh": 1096
    },
    {
      "date": "2023-03-12T14:00:00.000Z",
      "timestamp": 1678629600000,
      "wh": 1096
    },
    {
      "date": "2023-03-12T15:00:00.000Z",
      "timestamp": 1678633200000,
      "wh": 899
    },
    {
      "date": "2023-03-12T16:00:00.000Z",
      "timestamp": 1678636800000,
      "wh": 1466
    },
    {
      "date": "2023-03-12T17:00:00.000Z",
      "timestamp": 1678640400000,
      "wh": 540
    },
    {
      "date": "2023-03-12T18:00:00.000Z",
      "timestamp": 1678644000000,
      "wh": 6
    },
    {
      "date": "2023-03-12T19:00:00.000Z",
      "timestamp": 1678647600000,
      "wh": 0
    },
    {
      "date": "2023-03-12T20:00:00.000Z",
      "timestamp": 1678651200000,
      "wh": 0
    },
    {
      "date": "2023-03-12T21:00:00.000Z",
      "timestamp": 1678654800000,
      "wh": 0
    },
    {
      "date": "2023-03-12T22:00:00.000Z",
      "timestamp": 1678658400000,
      "wh": 0
    },
    {
      "date": "2023-03-12T23:00:00.000Z",
      "timestamp": 1678662000000,
      "wh": 0
    },
    {
      "date": "2023-03-13T00:00:00.000Z",
      "timestamp": 1678665600000,
      "wh": 0
    },
    {
      "date": "2023-03-13T01:00:00.000Z",
      "timestamp": 1678669200000,
      "wh": 0
    },
    {
      "date": "2023-03-13T02:00:00.000Z",
      "timestamp": 1678672800000,
      "wh": 0
    },
    {
      "date": "2023-03-13T03:00:00.000Z",
      "timestamp": 1678676400000,
      "wh": 0
    },
    {
      "date": "2023-03-13T04:00:00.000Z",
      "timestamp": 1678680000000,
      "wh": 0
    },
    {
      "date": "2023-03-13T05:00:00.000Z",
      "timestamp": 1678683600000,
      "wh": 0
    },
    {
      "date": "2023-03-13T06:00:00.000Z",
      "timestamp": 1678687200000,
      "wh": 1
    },
    {
      "date": "2023-03-13T07:00:00.000Z",
      "timestamp": 1678690800000,
      "wh": 186
    },
    {
      "date": "2023-03-13T08:00:00.000Z",
      "timestamp": 1678694400000,
      "wh": 179
    },
    {
      "date": "2023-03-13T09:00:00.000Z",
      "timestamp": 1678698000000,
      "wh": 713
    },
    {
      "date": "2023-03-13T10:00:00.000Z",
      "timestamp": 1678701600000,
      "wh": 1461
    },
    {
      "date": "2023-03-13T11:00:00.000Z",
      "timestamp": 1678705200000,
      "wh": 2344
    },
    {
      "date": "2023-03-13T12:00:00.000Z",
      "timestamp": 1678708800000,
      "wh": 3262
    },
    {
      "date": "2023-03-13T13:00:00.000Z",
      "timestamp": 1678712400000,
      "wh": 3634
    },
    {
      "date": "2023-03-13T14:00:00.000Z",
      "timestamp": 1678716000000,
      "wh": 2336
    },
    {
      "date": "2023-03-13T15:00:00.000Z",
      "timestamp": 1678719600000,
      "wh": 2532
    },
    {
      "date": "2023-03-13T16:00:00.000Z",
      "timestamp": 1678723200000,
      "wh": 1464
    },
    {
      "date": "2023-03-13T17:00:00.000Z",
      "timestamp": 1678726800000,
      "wh": 546
    },
    {
      "date": "2023-03-13T18:00:00.000Z",
      "timestamp": 1678730400000,
      "wh": 1
    },
    {
      "date": "2023-03-13T19:00:00.000Z",
      "timestamp": 1678734000000,
      "wh": 0
    },
    {
      "date": "2023-03-13T20:00:00.000Z",
      "timestamp": 1678737600000,
      "wh": 0
    },
    {
      "date": "2023-03-13T21:00:00.000Z",
      "timestamp": 1678741200000,
      "wh": 0
    },
    {
      "date": "2023-03-13T22:00:00.000Z",
      "timestamp": 1678744800000,
      "wh": 0
    },
    {
      "date": "2023-03-13T23:00:00.000Z",
      "timestamp": 1678748400000,
      "wh": 0
    },
    {
      "date": "2023-03-14T00:00:00.000Z",
      "timestamp": 1678752000000,
      "wh": 0
    },
    {
      "date": "2023-03-14T01:00:00.000Z",
      "timestamp": 1678755600000,
      "wh": 0
    },
    {
      "date": "2023-03-14T02:00:00.000Z",
      "timestamp": 1678759200000,
      "wh": 0
    },
    {
      "date": "2023-03-14T03:00:00.000Z",
      "timestamp": 1678762800000,
      "wh": 0
    },
    {
      "date": "2023-03-14T04:00:00.000Z",
      "timestamp": 1678766400000,
      "wh": 0
    },
    {
      "date": "2023-03-14T05:00:00.000Z",
      "timestamp": 1678770000000,
      "wh": 0
    },
    {
      "date": "2023-03-14T06:00:00.000Z",
      "timestamp": 1678773600000,
      "wh": 1
    },
    {
      "date": "2023-03-14T07:00:00.000Z",
      "timestamp": 1678777200000,
      "wh": 17
    },
    {
      "date": "2023-03-14T08:00:00.000Z",
      "timestamp": 1678780800000,
      "wh": 163
    },
    {
      "date": "2023-03-14T09:00:00.000Z",
      "timestamp": 1678784400000,
      "wh": 537
    },
    {
      "date": "2023-03-14T10:00:00.000Z",
      "timestamp": 1678788000000,
      "wh": 172
    },
    {
      "date": "2023-03-14T11:00:00.000Z",
      "timestamp": 1678791600000,
      "wh": 167
    },
    {
      "date": "2023-03-14T12:00:00.000Z",
      "timestamp": 1678795200000,
      "wh": 177
    },
    {
      "date": "2023-03-14T13:00:00.000Z",
      "timestamp": 1678798800000,
      "wh": 177
    },
    {
      "date": "2023-03-14T14:00:00.000Z",
      "timestamp": 1678802400000,
      "wh": 2731
    },
    {
      "date": "2023-03-14T15:00:00.000Z",
      "timestamp": 1678806000000,
      "wh": 1821
    },
    {
      "date": "2023-03-14T16:00:00.000Z",
      "timestamp": 1678809600000,
      "wh": 1447
    },
    {
      "date": "2023-03-14T17:00:00.000Z",
      "timestamp": 1678813200000,
      "wh": 558
    },
    {
      "date": "2023-03-14T18:00:00.000Z",
      "timestamp": 1678816800000,
      "wh": 7
    },
    {
      "date": "2023-03-14T19:00:00.000Z",
      "timestamp": 1678820400000,
      "wh": 0
    },
    {
      "date": "2023-03-14T20:00:00.000Z",
      "timestamp": 1678824000000,
      "wh": 0
    },
    {
      "date": "2023-03-14T21:00:00.000Z",
      "timestamp": 1678827600000,
      "wh": 0
    },
    {
      "date": "2023-03-14T22:00:00.000Z",
      "timestamp": 1678831200000,
      "wh": 0
    },
    {
      "date": "2023-03-14T23:00:00.000Z",
      "timestamp": 1678834800000,
      "wh": 0
    },
    {
      "date": "2023-03-15T00:00:00.000Z",
      "timestamp": 1678838400000,
      "wh": 0
    },
    {
      "date": "2023-03-15T01:00:00.000Z",
      "timestamp": 1678842000000,
      "wh": 0
    },
    {
      "date": "2023-03-15T02:00:00.000Z",
      "timestamp": 1678845600000,
      "wh": 0
    },
    {
      "date": "2023-03-15T03:00:00.000Z",
      "timestamp": 1678849200000,
      "wh": 0
    },
    {
      "date": "2023-03-15T04:00:00.000Z",
      "timestamp": 1678852800000,
      "wh": 0
    },
    {
      "date": "2023-03-15T05:00:00.000Z",
      "timestamp": 1678856400000,
      "wh": 0
    },
    {
      "date": "2023-03-15T06:00:00.000Z",
      "timestamp": 1678860000000,
      "wh": 3
    },
    {
      "date": "2023-03-15T07:00:00.000Z",
      "timestamp": 1678863600000,
      "wh": 534
    },
    {
      "date": "2023-03-15T08:00:00.000Z",
      "timestamp": 1678867200000,
      "wh": 1464
    },
    {
      "date": "2023-03-15T09:00:00.000Z",
      "timestamp": 1678870800000,
      "wh": 2352
    },
    {
      "date": "2023-03-15T10:00:00.000Z",
      "timestamp": 1678874400000,
      "wh": 3067
    },
    {
      "date": "2023-03-15T11:00:00.000Z",
      "timestamp": 1678878000000,
      "wh": 3622
    },
    {
      "date": "2023-03-15T12:00:00.000Z",
      "timestamp": 1678881600000,
      "wh": 3624
    },
    {
      "date": "2023-03-15T13:00:00.000Z",
      "timestamp": 1678885200000,
      "wh": 3627
    },
    {
      "date": "2023-03-15T14:00:00.000Z",
      "timestamp": 1678888800000,
      "wh": 3076
    },
    {
      "date": "2023-03-15T15:00:00.000Z",
      "timestamp": 1678892400000,
      "wh": 2001
    },
    {
      "date": "2023-03-15T16:00:00.000Z",
      "timestamp": 1678896000000,
      "wh": 892
    },
    {
      "date": "2023-03-15T17:00:00.000Z",
      "timestamp": 1678899600000,
      "wh": 553
    },
    {
      "date": "2023-03-15T18:00:00.000Z",
      "timestamp": 1678903200000,
      "wh": 9
    },
    {
      "date": "2023-03-15T19:00:00.000Z",
      "timestamp": 1678906800000,
      "wh": 0
    },
    {
      "date": "2023-03-15T20:00:00.000Z",
      "timestamp": 1678910400000,
      "wh": 0
    },
    {
      "date": "2023-03-15T21:00:00.000Z",
      "timestamp": 1678914000000,
      "wh": 0
    },
    {
      "date": "2023-03-15T22:00:00.000Z",
      "timestamp": 1678917600000,
      "wh": 0
    }
  ]
}
             */

            if (body.output) {
                await adapter.setStateAsync('data.pvPredictionChart', JSON.stringify(body.output.map(e =>
                    ({ts: e.timestamp, val: e.wh, date: e.date}))), true);
            } else {
                adapter.log.error(`Invalid answer: ${JSON.stringify(body)}`);
            }
        } catch (e) {
            adapter.log.error(`Cannot read API: ${e}`);
        }
    }

    // change start time from 41 * * * * to X * * * * *
    const obj = await adapter.getForeignObjectAsync(`system.adapter.${adapter.namespace}`);
    if (!obj.native.randomStart) {
        obj.common.schedule = `${Math.round(Math.random() * 60)} * * * *`;
        obj.native.randomStart = true;
        await adapter.setForeignObjectAsync(`system.adapter.${adapter.namespace}`, obj);
    }

    setTimeout(() => adapter.stop(), 100);
}

if (module.parent) {
    // Export startAdapter in compact mode
    module.exports = startAdapter;
} else {
    // otherwise start the instance directly
    startAdapter();
}
