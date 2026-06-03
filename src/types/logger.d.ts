declare module 'winston' {
  interface Logger {
    audit(message: string, meta?: any): void;
  }
}
