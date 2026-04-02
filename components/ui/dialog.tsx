"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className="modal-overlay"
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ children, style, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className="modal-shell"
    >
      <div
        className={cn("modal-card pointer-events-auto relative max-h-[90vh] overflow-y-auto", props.className)}
        style={style}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="icon-button absolute right-5 top-5 h-10 w-10"
        >
          <X size={16} />
        </DialogPrimitive.Close>
      </div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="modal-header">{children}</div>;
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className="modal-title"
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className="modal-subtitle"
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="modal-footer">{children}</div>;
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
};
