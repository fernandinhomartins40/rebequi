import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { modalPanelClassName, modalSizeClassNames, modalSurfaceClassName } from '@/components/ui/modal-styles';

type ModalSize = keyof typeof modalSizeClassNames;

type ModalContentProps = React.ComponentPropsWithoutRef<typeof DialogContent> & {
  size?: ModalSize;
};

const ModalContent = React.forwardRef<React.ElementRef<typeof DialogContent>, ModalContentProps>(
  ({ className, size = 'lg', ...props }, ref) => (
    <DialogContent
      ref={ref}
      className={cn(modalSurfaceClassName, modalSizeClassNames[size], className)}
      {...props}
    />
  ),
);
ModalContent.displayName = 'ModalContent';

function ModalHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'shrink-0 space-y-2 border-b border-[#eadfba]/80 bg-white/85 px-4 pb-4 pt-5 text-left backdrop-blur sm:px-6 sm:pb-5 sm:pt-6',
        className,
      )}
      {...props}
    />
  );
}
ModalHeader.displayName = 'ModalHeader';

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogTitle>,
  React.ComponentPropsWithoutRef<typeof DialogTitle>
>(({ className, ...props }, ref) => (
  <DialogTitle ref={ref} className={cn('pr-10 text-xl leading-tight sm:text-2xl', className)} {...props} />
));
ModalTitle.displayName = 'ModalTitle';

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogDescription>,
  React.ComponentPropsWithoutRef<typeof DialogDescription>
>(({ className, ...props }, ref) => (
  <DialogDescription ref={ref} className={cn('max-w-3xl text-sm leading-6 text-muted-foreground', className)} {...props} />
));
ModalDescription.displayName = 'ModalDescription';

function ModalBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('app-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5', className)} {...props} />;
}
ModalBody.displayName = 'ModalBody';

function ModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'shrink-0 border-t border-[#eadfba]/80 bg-white/90 px-4 py-4 sm:px-6',
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2',
        className,
      )}
      {...props}
    />
  );
}
ModalFooter.displayName = 'ModalFooter';

function ModalPanel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(modalPanelClassName, className)} {...props} />;
}
ModalPanel.displayName = 'ModalPanel';

export { ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalPanel, ModalTitle };
