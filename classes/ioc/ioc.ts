import {Container, inject} from 'inversify';
import {autoProvide, buildProviderModule, fluentProvide, provide} from 'inversify-binding-decorators';

const provideNamed = (identifier, name) => fluentProvide(identifier)
    .whenTargetNamed(name)
    .done();

const provideIf = (identifier, expression: boolean) => fluentProvide(identifier)
    .when(() => expression)
    .done();

export {autoProvide, provide, provideNamed, provideIf, inject};
