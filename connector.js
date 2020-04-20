const {SchemaConnector, DeviceErrorTypes} = require('st-schema');
const client = require('./mongo');
//
const deviceStates = {
    'external-device-1': {switch: 'off', level: 100},
};
// const accessTokens = {};

const connector = new SchemaConnector()
        .clientId(process.env.ST_CLIENT_ID)
        .clientSecret(process.env.ST_CLIENT_SECRET)

        /**
         * Discovery request. Respond with a list of devices. Called after installation of the
         * connector and every six hours after that.
         * @accessToken External cloud access token
         * @response {DiscoveryResponse} Discovery response object
         */
        .discoveryHandler((accessToken, response) => {
            console.log('discoveryHandler:', accessToken);

            response.addDevice('external-device-1', 'Test Dimmer', 'c2c-dimmer')
                .manufacturerName('Example Connector')
                .modelName('Virtual Dimmer');

            response.addDevice('1ff35717-53b7-40f8-87ba-93329599c98b',
                'Test Watch Dog',
                'd7419d49-8d27-4b7b-aa0c-5c7b2d6d7651')
                .manufacturerName('Example Connector')
                .modelName('My Watch Dog');
        })

        /**
         * State refresh request. Respond with the current states of all devices. Called after
         * device discovery runs.
         * @accessToken External cloud access token
         * @response {StateRefreshResponse} StateRefresh response object
         */
        .stateRefreshHandler((accessToken, response) => {
            console.log('stateRefreshHandler:', accessToken);

            response.addDevice('external-device-1', [
                {
                    component: 'main',
                    capability: 'st.switch',
                    attribute: 'switch',
                    value: deviceStates['external-device-1'].switch,
                },
                {
                    component: 'main',
                    capability: 'st.switchLevel',
                    attribute: 'level',
                    value: deviceStates['external-device-1'].level,
                }
            ])
        })

        /**
         * Device command request. Control the devices and respond with new device states
         * @accessToken External cloud access token
         * @response {CommandResponse} CommandResponse response object
         * @devices {array} List of ST device commands
         */
        .commandHandler((accessToken, response, devices) => {
            console.log('commandHandler:', accessToken, devices);

            for (const device of devices) {
                const deviceResponse = response.addDevice(device.externalDeviceId);
                for (cmd of device.commands) {
                    const state = {
                        component: cmd.component,
                        capability: cmd.capability
                    };
                    if (cmd.capability === 'st.switchLevel' && cmd.command === 'setLevel') {
                        state.attribute = 'level';
                        state.value = deviceStates[device.externalDeviceId].level = cmd.arguments[0];
                        deviceResponse.addState(state);

                    } else if (cmd.capability === 'st.switch') {
                        state.attribute = 'switch';
                        state.value = deviceStates[device.externalDeviceId].switch = cmd.command === 'on' ? 'on' : 'off';
                        deviceResponse.addState(state);

                    } else {
                        deviceResponse.setError(
                            `Command '${cmd.command} of capability '${cmd.capability}' not supported`,
                            DeviceErrorTypes.CAPABILITY_NOT_SUPPORTED)
                    }
                }
            }
        })

        /**
         * Create access and refresh tokens to allow SmartThings to be informed of device state
         * changes as they happen.
         * @accessToken External cloud access token
         * @callbackAuthentication ST access and refresh tokens for proactive state callbacks
         * @callbackUrls Callback and refresh token URLs
         */
        .callbackAccessHandler(async (accessToken, callbackAuthentication, callbackUrls) => {
            const collection = client.db().collection('CallbackAccessTokens');
            await collection.findOneAndReplace({
                accessToken: accessToken,
            }, {
                accessToken: accessToken,
                callbackAuthentication: callbackAuthentication,
                callbackUrls: callbackUrls,
            }, {upsert: true});

            console.log('callbackAccessHandler:', accessToken);
        })

        /**
         * Called when the connector is removed from SmartThings. You may want clean up access
         * tokens and other data when that happend.
         * @accessToken External cloud access token
         */
        .integrationDeletedHandler(async (accessToken) => {
            const collection = client.db().collection('CallbackAccessTokens');
            await collection.deleteMany({accessToken: accessToken});

            console.log('integrationDeletedHandler:', accessToken);
        })

    // .enableEventLogging()
;

module.exports = {
    connector: connector,
    deviceStates: deviceStates,
    // accessTokens: accessTokens
};
