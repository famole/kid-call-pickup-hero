
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createPickupAuthorization } from '@/services/pickupAuthorizationService';
import { getStudentsForParent } from '@/services/studentService';
import { getParentsWithStudents } from '@/services/parentService';
import { Child } from '@/types';
import { ParentWithStudents } from '@/types/parent';
import { useAuth } from '@/context/AuthContext';

interface FormData {
  studentId: string;
  authorizedParentId: string;
  startDate: string;
  endDate: string;
}

export const useAddAuthorizationDialog = (isOpen: boolean, onAuthorizationAdded: () => void, onOpenChange: (open: boolean) => void) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState<Child[]>([]);
  const [allParents, setAllParents] = useState<ParentWithStudents[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    studentId: '',
    authorizedParentId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Set default dates (today and one week from today)
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        startDate: today,
        endDate: nextWeek,
      }));
    }
  }, [isOpen]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load user's children
      const userChildren = await getStudentsForParent(user.id);
      setChildren(userChildren);

      // Load all parents (excluding current user)
      const parents = await getParentsWithStudents();
      const otherParents = parents.filter(parent => parent.email !== user.email);
      setAllParents(otherParents);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data for authorization form.",
        variant: "destructive",
      });
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentId || !formData.authorizedParentId || !formData.startDate || !formData.endDate) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast({
        title: "Error",
        description: "Start date must be before or equal to end date.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await createPickupAuthorization(formData);
      toast({
        title: "Success",
        description: "Pickup authorization created successfully.",
      });
      onAuthorizationAdded();
      onOpenChange(false);
      setFormData({
        studentId: '',
        authorizedParentId: '',
        startDate: '',
        endDate: '',
      });
    } catch (error) {
      console.error('Error creating authorization:', error);
      toast({
        title: "Error",
        description: "Failed to create pickup authorization.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    children,
    allParents,
    loading,
    formData,
    updateFormData,
    handleSubmit,
  };
};
