import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthContext';
import { User, Moon, Sun } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/ThemeContext';

interface MyProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

const MyProfile: React.FC<MyProfileProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="mr-2 h-6 w-6" />
            My Profile
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <strong>Name:</strong> {user.user_metadata?.full_name || user.email || 'User'}
          </div>
          <div>
            <strong>Email:</strong> {user.email}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Moon className="h-4 w-4" />
              <span>Dark Mode</span>
            </div>
            <Switch 
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          
          <div className="pt-4">
            <Button onClick={onClose} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MyProfile;