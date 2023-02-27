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

function main() {
    adapter.log.info(`config PLZ: ${adapter.config.PLZ}`);
    const threshold = parseFloat(adapter.config.greenIndex) || 50;

    axios(`https://api.corrently.io/v2.0/gsi/prediction?zip=${adapter.config.PLZ}`)
        .then(response => {
            const body = response.data;
            const now = Date.now();
            if (body.forecast) {
                adapter.setState('data.json', JSON.stringify(body.forecast.map(e =>
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
                    adapter.setState('data.start', new Date(body.forecast[start].timeStamp).toLocaleString(), true);
                    let duration = Math.floor((body.forecast[end].timeStamp - body.forecast[start].timeStamp) / 3600000);
                    duration = duration || 1;
                    adapter.setState('data.duration', duration, true);
                    adapter.setState('data.green', body.forecast[start].timeStamp < now && body.forecast[end].timeStamp < now, true);
                    const price = body.forecast.find((e, i) => e.timeStamp >= now && now < body.forecast[i + 1].timeStamp);
                    if (price) {
                        adapter.setState('data.price', parseFloat(price.energyprice), true);
                    }
                } else {
                    adapter.setState('data.start', null, true);
                    adapter.setState('data.duration', 0, true);
                    adapter.setState('data.green', false, true);
                }
            } else {
                adapter.log.error(`Invalid answer: ${JSON.stringify(body)}`);
            }
        })
        .catch(e => adapter.log.error(`Cannot read API: ${e}`))
        .then(() => setTimeout(() => adapter.stop(), 100));
}

if (module.parent) {
    // Export startAdapter in compact mode
    module.exports = startAdapter;
} else {
    // otherwise start the instance directly
    startAdapter();
}
