"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";

interface LogoutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LogoutDialog({
  isOpen,
  onOpenChange,
}: LogoutDialogProps) {
  const router = useRouter();

  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    onOpenChange(false);
    router.push("/login");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-amber-100 ">
        <DialogHeader>
          <DialogTitle>Are you sure you want to logout?</DialogTitle>
          <DialogDescription>
            This will log you out and redirect you to the login page.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mt-4 ">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
