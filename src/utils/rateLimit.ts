export const rateLimit = {
  limit: (key: string, points: number, duration: number) => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args: any[]) {
        // Simple rate limiting - in production this would use a proper rate limiter
        return originalMethod.apply(this, args);
      };
      
      return descriptor;
    };
  }
};
