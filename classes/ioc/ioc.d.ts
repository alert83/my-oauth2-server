import { inject } from 'inversify';
import { autoProvide, provide } from 'inversify-binding-decorators';
declare const provideNamed: (identifier: any, name: any) => (target: any) => any;
declare const provideIf: (identifier: any, expression: boolean) => (target: any) => any;
export { autoProvide, provide, provideNamed, provideIf, inject };
