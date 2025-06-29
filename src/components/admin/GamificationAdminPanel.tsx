// ADMIN COMPONENT COMMENTED OUT FOR PRODUCTION
/*
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2, 
  Trophy, 
  Settings, 
  RefreshCw, 
  Users, 
  Coins,
  Crown,
  Eye,
  EyeOff,
  Save,
  X
} from 'lucide-react';

// Types
interface RewardShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'theme' | 'avatar' | 'perk' | 'boost' | 'cosmetic';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  availability: {
    enabled: boolean;
    startDate?: string;
    endDate?: string;
    maxPurchases?: number;
    tierRequired?: 'free' | 'premium';
  };
  metadata: {
    imageUrl?: string;
    duration?: number; // for temporary items
    stackable?: boolean;
    transferable?: boolean;
  };
  created_at: string;
  updated_at: string;
}

interface AchievementTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  requirements: Record<string, any>;
  reward: Record<string, any>;
  hidden: boolean;
  repeatable: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminStats {
  totalUsers: number;
  totalCoinsInCirculation: number;
  totalAchievementsUnlocked: number;
  totalShopPurchases: number;
  averageUserLevel: number;
  topSpendingCategories: Array<{
    category: string;
    amount: number;
  }>;
}

// Hook
const useGamificationAdmin = () => {
  const [shopItems, setShopItems] = useState<RewardShopItem[]>([]);
  const [achievements, setAchievements] = useState<AchievementTemplate[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      setLoading(true);
      
      // Fetch shop items
      const shopResponse = await fetch('/api/admin/shop-items');
      if (shopResponse.ok) {
        const shopData = await shopResponse.json();
        setShopItems(shopData.items || []);
      }
      
      // Fetch achievements
      const achievementsResponse = await fetch('/api/admin/achievements');
      if (achievementsResponse.ok) {
        const achievementsData = await achievementsResponse.json();
        setAchievements(achievementsData.achievements || []);
      }
      
      // Fetch stats
      const statsResponse = await fetch('/api/admin/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const createShopItem = async (item: Omit<RewardShopItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/admin/shop-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      
      if (response.ok) {
        toast.success('Shop item created successfully');
        refreshData();
      } else {
        throw new Error('Failed to create shop item');
      }
    } catch (error) {
      console.error('Error creating shop item:', error);
      toast.error('Failed to create shop item');
    }
  };

  const updateShopItem = async (id: string, item: Partial<RewardShopItem>) => {
    try {
      const response = await fetch(`/api/admin/shop-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      
      if (response.ok) {
        toast.success('Shop item updated successfully');
        refreshData();
      } else {
        throw new Error('Failed to update shop item');
      }
    } catch (error) {
      console.error('Error updating shop item:', error);
      toast.error('Failed to update shop item');
    }
  };

  const deleteShopItem = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/shop-items/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success('Shop item deleted successfully');
        refreshData();
      } else {
        throw new Error('Failed to delete shop item');
      }
    } catch (error) {
      console.error('Error deleting shop item:', error);
      toast.error('Failed to delete shop item');
    }
  };

  const createAchievement = async (achievement: Omit<AchievementTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/admin/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(achievement)
      });
      
      if (response.ok) {
        toast.success('Achievement created successfully');
        refreshData();
      } else {
        throw new Error('Failed to create achievement');
      }
    } catch (error) {
      console.error('Error creating achievement:', error);
      toast.error('Failed to create achievement');
    }
  };

  const updateAchievement = async (id: string, achievement: Partial<AchievementTemplate>) => {
    try {
      const response = await fetch(`/api/admin/achievements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(achievement)
      });
      
      if (response.ok) {
        toast.success('Achievement updated successfully');
        refreshData();
      } else {
        throw new Error('Failed to update achievement');
      }
    } catch (error) {
      console.error('Error updating achievement:', error);
      toast.error('Failed to update achievement');
    }
  };

  const deleteAchievement = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/achievements/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success('Achievement deleted successfully');
        refreshData();
      } else {
        throw new Error('Failed to delete achievement');
      }
    } catch (error) {
      console.error('Error deleting achievement:', error);
      toast.error('Failed to delete achievement');
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  return {
    shopItems,
    achievements,
    stats,
    loading,
    createShopItem,
    updateShopItem,
    deleteShopItem,
    createAchievement,
    updateAchievement,
    deleteAchievement,
    refreshData
  };
};

// Components
const ShopItemForm: React.FC<{
  item?: RewardShopItem;
  onSave: (item: Omit<RewardShopItem, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}> = ({ item, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || 0,
    category: item?.category || 'cosmetic',
    rarity: item?.rarity || 'common',
    availability: {
      enabled: item?.availability?.enabled ?? true,
      startDate: item?.availability?.startDate || '',
      endDate: item?.availability?.endDate || '',
      maxPurchases: item?.availability?.maxPurchases || 0,
      tierRequired: item?.availability?.tierRequired || 'free'
    },
    metadata: {
      imageUrl: item?.metadata?.imageUrl || '',
      duration: item?.metadata?.duration || 0,
      stackable: item?.metadata?.stackable ?? true,
      transferable: item?.metadata?.transferable ?? false
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="price">Price (Coins)</Label>
          <Input
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="theme">Theme</SelectItem>
              <SelectItem value="avatar">Avatar</SelectItem>
              <SelectItem value="perk">Perk</SelectItem>
              <SelectItem value="boost">Boost</SelectItem>
              <SelectItem value="cosmetic">Cosmetic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="rarity">Rarity</Label>
          <Select value={formData.rarity} onValueChange={(value) => setFormData(prev => ({ ...prev, rarity: value as any }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="common">Common</SelectItem>
              <SelectItem value="rare">Rare</SelectItem>
              <SelectItem value="epic">Epic</SelectItem>
              <SelectItem value="legendary">Legendary</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div>
        <Label>Availability Settings</Label>
        <div className="space-y-4 mt-2">
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.availability.enabled}
              onCheckedChange={(checked) => setFormData(prev => ({
                ...prev,
                availability: { ...prev.availability, enabled: checked }
              }))}
            />
            <Label>Enabled</Label>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={formData.availability.startDate}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  availability: { ...prev.availability, startDate: e.target.value }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={formData.availability.endDate}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  availability: { ...prev.availability, endDate: e.target.value }
                }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxPurchases">Max Purchases (0 = unlimited)</Label>
              <Input
                id="maxPurchases"
                type="number"
                value={formData.availability.maxPurchases}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  availability: { ...prev.availability, maxPurchases: parseInt(e.target.value) || 0 }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="tierRequired">Tier Required</Label>
              <Select 
                value={formData.availability.tierRequired} 
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  availability: { ...prev.availability, tierRequired: value as any }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <Label>Metadata</Label>
        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              value={formData.metadata.imageUrl}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                metadata: { ...prev.metadata, imageUrl: e.target.value }
              }))}
            />
          </div>
          
          <div>
            <Label htmlFor="duration">Duration (minutes, 0 = permanent)</Label>
            <Input
              id="duration"
              type="number"
              value={formData.metadata.duration}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                metadata: { ...prev.metadata, duration: parseInt(e.target.value) || 0 }
              }))}
            />
          </div>
          
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.metadata.stackable}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  metadata: { ...prev.metadata, stackable: checked }
                }))}
              />
              <Label>Stackable</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.metadata.transferable}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  metadata: { ...prev.metadata, transferable: checked }
                }))}
              />
              <Label>Transferable</Label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </form>
  );
};

const AchievementForm: React.FC<{
  achievement?: AchievementTemplate;
  onSave: (achievement: Omit<AchievementTemplate, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}> = ({ achievement, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: achievement?.name || '',
    description: achievement?.description || '',
    category: achievement?.category || 'task',
    rarity: achievement?.rarity || 'common',
    points: achievement?.points || 0,
    requirements: achievement?.requirements ? JSON.stringify(achievement.requirements, null, 2) : '{}',
    reward: achievement?.reward ? JSON.stringify(achievement.reward, null, 2) : '{}',
    hidden: achievement?.hidden ?? false,
    repeatable: achievement?.repeatable ?? false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const requirements = JSON.parse(formData.requirements);
      const reward = JSON.parse(formData.reward);
      
      onSave({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        rarity: formData.rarity as any,
        points: formData.points,
        requirements,
        reward,
        hidden: formData.hidden,
        repeatable: formData.repeatable
      });
    } catch (error) {
      toast.error('Invalid JSON in requirements or reward fields');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="points">Points</Label>
          <Input
            id="points"
            type="number"
            value={formData.points}
            onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="rarity">Rarity</Label>
          <Select value={formData.rarity} onValueChange={(value) => setFormData(prev => ({ ...prev, rarity: value as any }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="common">Common</SelectItem>
              <SelectItem value="rare">Rare</SelectItem>
              <SelectItem value="epic">Epic</SelectItem>
              <SelectItem value="legendary">Legendary</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="hidden"
            checked={formData.hidden}
            onChange={(e) => setFormData(prev => ({ ...prev, hidden: e.target.checked }))}
          />
          <Label htmlFor="hidden">Hidden</Label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="repeatable"
            checked={formData.repeatable}
            onChange={(e) => setFormData(prev => ({ ...prev, repeatable: e.target.checked }))}
          />
          <Label htmlFor="repeatable">Repeatable</Label>
        </div>
      </div>

      <div>
        <Label htmlFor="requirements">Requirements (JSON)</Label>
        <Textarea
          id="requirements"
          value={formData.requirements}
          onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
          rows={4}
          className="font-mono text-sm"
        />
      </div>

      <div>
        <Label htmlFor="reward">Reward (JSON)</Label>
        <Textarea
          id="reward"
          value={formData.reward}
          onChange={(e) => setFormData(prev => ({ ...prev, reward: e.target.value }))}
          rows={3}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </form>
  );
};

export const GamificationAdminPanel: React.FC = () => {
  const {
    shopItems,
    achievements,
    stats,
    loading,
    createShopItem,
    updateShopItem,
    deleteShopItem,
    createAchievement,
    updateAchievement,
    deleteAchievement,
    refreshData
  } = useGamificationAdmin();

  const [showCreateShopItem, setShowCreateShopItem] = useState(false);
  const [showCreateAchievement, setShowCreateAchievement] = useState(false);
  const [editingShopItem, setEditingShopItem] = useState<RewardShopItem | null>(null);
  const [editingAchievement, setEditingAchievement] = useState<AchievementTemplate | null>(null);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading admin panel...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gamification Admin Panel</h1>
          <p className="text-gray-600">Manage reward shop items and achievements</p>
        </div>
        
        <Button onClick={refreshData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-600">Coins in Circulation</p>
                  <p className="text-xl font-bold">{stats.totalCoinsInCirculation.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Achievements Unlocked</p>
                  <p className="text-xl font-bold">{stats.totalAchievementsUnlocked.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Shop Purchases</p>
                  <p className="text-xl font-bold">{stats.totalShopPurchases.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Avg User Level</p>
                  <p className="text-xl font-bold">{stats.averageUserLevel.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="shop" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shop" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Reward Shop
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Reward Shop Items</h2>
            <Button onClick={() => setShowCreateShopItem(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shopItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">{item.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-yellow-500" />
                          {item.price}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.availability.enabled ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingShopItem(item)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this item?')) {
                                deleteShopItem(item.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Achievement Templates</h2>
            <Button onClick={() => setShowCreateAchievement(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Achievement
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Rarity</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {achievements.map((achievement) => (
                    <TableRow key={achievement.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{achievement.name}</p>
                          <p className="text-sm text-gray-500">{achievement.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{achievement.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            achievement.rarity === 'legendary' ? 'default' :
                            achievement.rarity === 'epic' ? 'destructive' :
                            achievement.rarity === 'rare' ? 'default' : 'secondary'
                          }
                        >
                          {achievement.rarity}
                        </Badge>
                      </TableCell>
                      <TableCell>{achievement.points}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {achievement.hidden ? (
                            <Badge variant="secondary">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Hidden
                            </Badge>
                          ) : (
                            <Badge variant="default">
                              <Eye className="h-3 w-3 mr-1" />
                              Visible
                            </Badge>
                          )}
                          {achievement.repeatable && (
                            <Badge variant="outline">Repeatable</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingAchievement(achievement)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this achievement?')) {
                                deleteAchievement(achievement.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <h2 className="text-xl font-semibold">Gamification Analytics</h2>
          
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Spending Categories</CardTitle>
                  <CardDescription>Most popular shop item categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.topSpendingCategories.map((category, index) => (
                      <div key={category.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{category.category.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Coins className="h-4 w-4" />
                          {category.amount.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Overall gamification system status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Economy Balance</span>
                      <Badge variant="default">Healthy</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>User Engagement</span>
                      <Badge variant="default">High</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Achievement Distribution</span>
                      <Badge variant="default">Balanced</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Shop Activity</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateShopItem || !!editingShopItem} onOpenChange={() => {
        setShowCreateShopItem(false);
        setEditingShopItem(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingShopItem ? 'Edit Shop Item' : 'Create Shop Item'}
            </DialogTitle>
            <DialogDescription>
              {editingShopItem ? 'Update the shop item details' : 'Add a new item to the reward shop'}
            </DialogDescription>
          </DialogHeader>
          
          <ShopItemForm
            item={editingShopItem || undefined}
            onSave={async (item) => {
              if (editingShopItem) {
                await updateShopItem(editingShopItem.id, item);
                setEditingShopItem(null);
              } else {
                await createShopItem(item);
                setShowCreateShopItem(false);
              }
            }}
            onCancel={() => {
              setShowCreateShopItem(false);
              setEditingShopItem(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateAchievement || !!editingAchievement} onOpenChange={() => {
        setShowCreateAchievement(false);
        setEditingAchievement(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAchievement ? 'Edit Achievement' : 'Create Achievement'}
            </DialogTitle>
            <DialogDescription>
              {editingAchievement ? 'Update the achievement details' : 'Add a new achievement template'}
            </DialogDescription>
          </DialogHeader>
          
          <AchievementForm
            achievement={editingAchievement || undefined}
            onSave={async (achievement) => {
              if (editingAchievement) {
                await updateAchievement(editingAchievement.id, achievement);
                setEditingAchievement(null);
              } else {
                await createAchievement(achievement);
                setShowCreateAchievement(false);
              }
            }}
            onCancel={() => {
              setShowCreateAchievement(false);
              setEditingAchievement(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GamificationAdminPanel;
*/

// Production replacement component
import React from 'react';

export const GamificationAdminPanel: React.FC = () => {
  return (
    <div className="p-6 text-center">
      <h2 className="text-xl font-bold mb-4">Admin Panel Disabled</h2>
      <p className="text-muted-foreground">
        Admin functionality has been disabled for production.
      </p>
    </div>
  );
};

export default GamificationAdminPanel;