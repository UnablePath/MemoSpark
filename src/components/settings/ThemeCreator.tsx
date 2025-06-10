// 'use client';

// import React, { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea';
// import { Palette, Save } from 'lucide-react';

// interface ThemeCreatorProps {
//   onThemeCreated?: (theme: any) => void;
// }

// export const ThemeCreator: React.FC<ThemeCreatorProps> = ({ onThemeCreated }) => {
//   const [themeName, setThemeName] = useState('');
//   const [themeDescription, setThemeDescription] = useState('');
//   const [isCreating, setIsCreating] = useState(false);

//   const handleSave = async () => {
//     if (!themeName.trim()) {
//       alert('Please enter a theme name');
//       return;
//     }

//     setIsCreating(true);
    
//     try {
//       const theme = {
//         id: `theme-${themeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
//         name: themeName.trim(),
//         description: themeDescription.trim() || 'Custom user theme',
//         author: 'User',
//         category: 'custom',
//         isUserCreated: true,
//         createdAt: new Date().toISOString()
//       };

//       onThemeCreated?.(theme);
//       alert('Theme saved successfully!');
      
//       // Reset form
//       setThemeName('');
//       setThemeDescription('');
//     } catch (error) {
//       console.error('Error saving theme:', error);
//       alert('Failed to save theme');
//     } finally {
//       setIsCreating(false);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center gap-3">
//         <Palette className="h-6 w-6 text-primary" />
//         <div>
//           <h2 className="text-xl font-semibold">Theme Creator</h2>
//           <p className="text-sm text-muted-foreground">
//             Create your own custom themes inspired by the community
//           </p>
//         </div>
//       </div>

//       <div className="space-y-4">
//         <div>
//           <Label htmlFor="theme-name">Theme Name *</Label>
//           <Input
//             id="theme-name"
//             value={themeName}
//             onChange={(e) => setThemeName(e.target.value)}
//             placeholder="My Awesome Theme"
//           />
//         </div>
        
//         <div>
//           <Label htmlFor="theme-description">Description</Label>
//           <Textarea
//             id="theme-description"
//             value={themeDescription}
//             onChange={(e) => setThemeDescription(e.target.value)}
//             placeholder="A beautiful theme inspired by..."
//             rows={3}
//           />
//         </div>
//       </div>

//       <div className="flex justify-end">
//         <Button onClick={handleSave} disabled={isCreating || !themeName.trim()}>
//           <Save className="h-4 w-4 mr-2" />
//           {isCreating ? 'Saving...' : 'Save Theme'}
//         </Button>
//       </div>
//     </div>
//   );
// };

// export default ThemeCreator;

// Theme Creator component - Currently disabled
// This component will be implemented in a future update
export default function ThemeCreator() {
  return null;
}