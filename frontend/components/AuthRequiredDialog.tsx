// components/AuthRequiredDialog.tsx
'use client';

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AuthRequiredDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentPath: string;
  action: string;
}

export function AuthRequiredDialog({ isOpen, setIsOpen, currentPath, action }: AuthRequiredDialogProps) {
  const router = useRouter();
  
  const handleLogin = () => {
    // Store the current path for redirect after login
    localStorage.setItem('redirectAfterAuth', currentPath);
    router.push(`/auth/login?redirectTo=${encodeURIComponent(currentPath)}`);
  };
  
  const handleSignup = () => {
    localStorage.setItem('redirectAfterAuth', currentPath);
    router.push(`/auth/signup?redirectTo=${encodeURIComponent(currentPath)}`);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Authentication Required</AlertDialogTitle>
          <AlertDialogDescription>
            You need to be logged in to {action}. Create an account or sign in to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleSignup}>Create Account</Button>
          <Button onClick={handleLogin}>Sign In</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}