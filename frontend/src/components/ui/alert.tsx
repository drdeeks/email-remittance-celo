// Simple Alert component for the verification flow

import React from 'react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    className={`relative w-full rounded-lg border p-4 ${variant === 'destructive' ? 'border-destructive bg-destructive/10' : 'border-border'} ${className}`}
    {...props}
  />
));
Alert.displayName = 'Alert';

export { Alert };

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={`mb-1 font-medium leading-none tracking-tight ${className}`}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

export { AlertTitle };

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm [&_p]:leading-relaxed ${className}`}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { AlertDescription };