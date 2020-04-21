import {BaseHttpController, controller, httpGet} from 'inversify-express-utils';

@controller('/foo')
class FooController extends BaseHttpController {

  @httpGet('/bar')
  public async bar() {
    return this.ok('test');
  }
}
