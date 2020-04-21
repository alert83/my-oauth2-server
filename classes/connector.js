"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const st_schema_1 = require("st-schema");
const deviceStates = {
    'external-device-1': { switch: 'off', level: 100 },
};
const client = {};
const connector = new st_schema_1.SchemaConnector()
    .clientId(process.env.ST_CLIENT_ID)
    .clientSecret(process.env.ST_CLIENT_SECRET)
    .discoveryHandler((accessToken, response) => {
    console.log('discoveryHandler:', accessToken);
    response.addDevice('external-device-1', 'Test Dimmer', 'c2c-dimmer')
        .manufacturerName('Example Connector')
        .modelName('Virtual Dimmer');
    response.addDevice('1ff35717-53b7-40f8-87ba-93329599c98b', 'Test Watch Dog', 'd7419d49-8d27-4b7b-aa0c-5c7b2d6d7651')
        .manufacturerName('Example Connector')
        .modelName('My Watch Dog');
})
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
    ]);
})
    .commandHandler((accessToken, response, devices) => {
    console.log('commandHandler:', accessToken, devices);
    for (const device of devices) {
        const deviceResponse = response.addDevice(device.externalDeviceId);
        for (const cmd of device.commands) {
            const state = {
                component: cmd.component,
                capability: cmd.capability
            };
            if (cmd.capability === 'st.switchLevel' && cmd.command === 'setLevel') {
                state.attribute = 'level';
                state.value = deviceStates[device.externalDeviceId].level = cmd.arguments[0];
                deviceResponse.addState(state);
            }
            else if (cmd.capability === 'st.switch') {
                state.attribute = 'switch';
                state.value = deviceStates[device.externalDeviceId].switch = cmd.command === 'on' ? 'on' : 'off';
                deviceResponse.addState(state);
            }
            else {
                deviceResponse.setError(`Command '${cmd.command} of capability '${cmd.capability}' not supported`, st_schema_1.DeviceErrorTypes.CAPABILITY_NOT_SUPPORTED);
            }
        }
    }
})
    .callbackAccessHandler(async (accessToken, callbackAuthentication, callbackUrls) => {
    const collection = client.db().collection('CallbackAccessTokens');
    await collection.findOneAndReplace({
        accessToken,
    }, {
        accessToken,
        callbackAuthentication,
        callbackUrls,
    }, { upsert: true });
    console.log('callbackAccessHandler:', accessToken);
})
    .integrationDeletedHandler(async (accessToken) => {
    const collection = client.db().collection('CallbackAccessTokens');
    await collection.deleteMany({ accessToken });
    console.log('integrationDeletedHandler:', accessToken);
});
module.exports = {
    connector,
    deviceStates,
};
