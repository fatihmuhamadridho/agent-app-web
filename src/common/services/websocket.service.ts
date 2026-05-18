type MessageHandler<T = string> = (message: T) => void;
type EventHandler = () => void;

type WebSocketServiceOptions = {
  url: string;
};

export class WebSocketService {
  private socket: WebSocket | null = null;
  private readonly url: string;

  constructor(options: WebSocketServiceOptions) {
    this.url = options.url;
  }

  connect(onOpen?: EventHandler, onClose?: EventHandler, onMessage?: MessageHandler) {
    if (typeof window === 'undefined') return;

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      onOpen?.();
    };

    this.socket.onclose = () => {
      onClose?.();
    };

    this.socket.onmessage = (event) => {
      onMessage?.(String(event.data));
    };
  }

  send(message: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(message);
  }

  close() {
    this.socket?.close();
    this.socket = null;
  }
}
