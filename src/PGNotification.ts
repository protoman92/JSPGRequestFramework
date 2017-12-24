import { Notification } from 'pg';
import { Nullable } from 'javascriptutilities';

export interface Type {
  processId: number;
  channel: string;
  payload: Nullable<string>;
}

export class Self implements Type {
  public processId: number;
  public channel: string;
  public payload: Nullable<string>;

  public constructor(notification: Notification) {
    this.processId = notification.processId;
    this.channel = notification.channel;
    this.payload = notification.payload;
  }
}