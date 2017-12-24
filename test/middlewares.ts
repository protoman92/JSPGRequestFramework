import { Transformer } from 'jsrequestframework';
import { PGRequest } from './../src';

export type Req = PGRequest.Self;

export let retryMiddlewareKey = "AddRetry"

export let retryTransformer: Transformer<Req> = req => req.cloneBuilder()
  .withRequestRetries(3).build();