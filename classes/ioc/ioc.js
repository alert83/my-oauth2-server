"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inversify_1 = require("inversify");
exports.inject = inversify_1.inject;
const inversify_binding_decorators_1 = require("inversify-binding-decorators");
exports.autoProvide = inversify_binding_decorators_1.autoProvide;
exports.provide = inversify_binding_decorators_1.provide;
const provideNamed = (identifier, name) => inversify_binding_decorators_1.fluentProvide(identifier)
    .whenTargetNamed(name)
    .done();
exports.provideNamed = provideNamed;
const provideIf = (identifier, expression) => inversify_binding_decorators_1.fluentProvide(identifier)
    .when(() => expression)
    .done();
exports.provideIf = provideIf;
