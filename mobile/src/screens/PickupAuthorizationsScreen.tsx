import React, { useState, useEffect } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { YStack, XStack, Card, H2, Paragraph, Button, Text, Sheet, Input, Select, Adapt } from 'tamagui';
import { Plus, Users, Calendar, Edit, Trash2 } from '@tamagui/lucide-icons';
import { useTranslation } from '../hooks/useTranslation';
import { logger } from '../../utils/logger';

// Mock data - in real app this would come from Supabase
interface PickupAuthorization {
  id: string;
  studentName: string;
  authorizedParentName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: 'active' | 'inactive' | 'expired' | 'scheduled';
}

interface Child {
  id: string;
  name: string;
}

interface Parent {
  id: string;
  name: string;
  email: string;
}

const PickupAuthorizationsScreen: React.FC = () => {
  const { t } = useTranslation();
  const [authorizations, setAuthorizations] = useState<PickupAuthorization[]>([]);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state
  const [selectedChild, setSelectedChild] = useState('');
  const [selectedParent, setSelectedParent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Mock data
  const children: Child[] = [
    { id: '1', name: 'Maria González' },
    { id: '2', name: 'Carlos González' }
  ];
  
  const parents: Parent[] = [
    { id: '1', name: 'Ana Rodriguez', email: 'ana@email.com' },
    { id: '2', name: 'Luis Martinez', email: 'luis@email.com' }
  ];

  useEffect(() => {
    loadAuthorizations();
  }, []);

  const loadAuthorizations = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockData: PickupAuthorization[] = [
        {
          id: '1',
          studentName: 'Maria González',
          authorizedParentName: 'Ana Rodriguez',
          startDate: '2025-01-15',
          endDate: '2025-01-30',
          isActive: true,
          status: 'active'
        }
      ];
      setAuthorizations(mockData);
    } catch (error) {
      logger.error('Error loading authorizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAuthorizations();
    setRefreshing(false);
  };

  const handleCreateAuthorization = async () => {
    try {
      // Mock creation - replace with actual API call
      const newAuth: PickupAuthorization = {
        id: Date.now().toString(),
        studentName: children.find(c => c.id === selectedChild)?.name || '',
        authorizedParentName: parents.find(p => p.id === selectedParent)?.name || '',
        startDate,
        endDate,
        isActive: true,
        status: 'active'
      };
      
      setAuthorizations(prev => [...prev, newAuth]);
      setIsAddSheetOpen(false);
      resetForm();
    } catch (error) {
      logger.error('Error creating authorization:', error);
    }
  };

  const resetForm = () => {
    setSelectedChild('');
    setSelectedParent('');
    setStartDate('');
    setEndDate('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '$green10';
      case 'expired': return '$red10';
      case 'scheduled': return '$blue10';
      default: return '$gray10';
    }
  };

  const getStatusText = (status: string) => {
    return t(`pickupAuthorizations.${status}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>{t('common.loading')}</Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <YStack padding="$4" space="$4">
          {/* Header */}
          <YStack space="$2">
            <XStack alignItems="center" space="$2">
              <Users size={24} />
              <H2>{t('pickupAuthorizations.title')}</H2>
            </XStack>
            <Paragraph color="$gray11" fontSize="$3">
              {t('pickupAuthorizations.description')}
            </Paragraph>
          </YStack>

          {/* Add Button */}
          <Button
            backgroundColor="$blue10"
            color="white"
            onPress={() => setIsAddSheetOpen(true)}
            icon={Plus}
          >
            {t('pickupAuthorizations.addAuthorization')}
          </Button>

          {/* Authorizations List */}
          {authorizations.length === 0 ? (
            <Card padding="$6" alignItems="center">
              <Users size={48} color="$gray8" />
              <H2 marginTop="$4">{t('pickupAuthorizations.noAuthorizationsYet')}</H2>
              <Paragraph textAlign="center" color="$gray11" marginTop="$2">
                {t('pickupAuthorizations.noAuthorizationsDescription')}
              </Paragraph>
              <Button
                marginTop="$4"
                backgroundColor="$blue10"
                color="white"
                onPress={() => setIsAddSheetOpen(true)}
                icon={Plus}
              >
                {t('pickupAuthorizations.createFirstAuthorization')}
              </Button>
            </Card>
          ) : (
            <YStack space="$3">
              {authorizations.map((auth) => (
                <Card key={auth.id} padding="$4">
                  <YStack space="$3">
                    <XStack justifyContent="space-between" alignItems="flex-start">
                      <YStack flex={1} space="$2">
                        <Text fontWeight="600" fontSize="$4">
                          {auth.studentName}
                        </Text>
                        <Text color={getStatusColor(auth.status)} fontSize="$2" fontWeight="500">
                          {getStatusText(auth.status)}
                        </Text>
                      </YStack>
                      <XStack space="$2">
                        <Button size="$3" variant="outlined" icon={Edit}>
                          {t('common.edit')}
                        </Button>
                        <Button size="$3" variant="outlined" icon={Trash2} color="$red10">
                          {t('common.delete')}
                        </Button>
                      </XStack>
                    </XStack>
                    
                    <YStack space="$1">
                      <Text fontSize="$2" color="$gray11">
                        <Text fontWeight="500">{t('pickupAuthorizations.authorizedTo')}:</Text> {auth.authorizedParentName}
                      </Text>
                      <XStack alignItems="center" space="$1">
                        <Calendar size={12} color="$gray9" />
                        <Text fontSize="$2" color="$gray11">
                          {formatDate(auth.startDate)} - {formatDate(auth.endDate)}
                        </Text>
                      </XStack>
                    </YStack>
                  </YStack>
                </Card>
              ))}
            </YStack>
          )}
        </YStack>
      </ScrollView>

      {/* Add Authorization Sheet */}
      <Sheet
        modal
        open={isAddSheetOpen}
        onOpenChange={setIsAddSheetOpen}
        snapPoints={[90]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4">
          <Sheet.Handle />
          <YStack space="$4">
            <H2>{t('pickupAuthorizations.addAuthorization')}</H2>
            
            {/* Child Selection */}
            <YStack space="$2">
              <Text fontWeight="500">{t('pickupAuthorizations.child')}</Text>
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <Select.Trigger>
                  <Select.Value placeholder={t('pickupAuthorizations.selectChild')} />
                </Select.Trigger>
                <Adapt when="sm" platform="touch">
                  <Select.Sheet modal dismissOnSnapToBottom>
                    <Select.Sheet.Frame>
                      <Select.Sheet.ScrollView>
                        <Adapt.Contents />
                      </Select.Sheet.ScrollView>
                    </Select.Sheet.Frame>
                    <Select.Sheet.Overlay />
                  </Select.Sheet>
                </Adapt>
                <Select.Content zIndex={200000}>
                  <Select.ScrollUpButton />
                  <Select.Viewport>
                    {children.map((child) => (
                      <Select.Item key={child.id} index={parseInt(child.id)} value={child.id}>
                        <Select.ItemText>{child.name}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                  <Select.ScrollDownButton />
                </Select.Content>
              </Select>
            </YStack>

            {/* Parent Selection */}
            <YStack space="$2">
              <Text fontWeight="500">{t('pickupAuthorizations.parent')}</Text>
              <Select value={selectedParent} onValueChange={setSelectedParent}>
                <Select.Trigger>
                  <Select.Value placeholder={t('pickupAuthorizations.searchForParent')} />
                </Select.Trigger>
                <Adapt when="sm" platform="touch">
                  <Select.Sheet modal dismissOnSnapToBottom>
                    <Select.Sheet.Frame>
                      <Select.Sheet.ScrollView>
                        <Adapt.Contents />
                      </Select.Sheet.ScrollView>
                    </Select.Sheet.Frame>
                    <Select.Sheet.Overlay />
                  </Select.Sheet>
                </Adapt>
                <Select.Content zIndex={200000}>
                  <Select.ScrollUpButton />
                  <Select.Viewport>
                    {parents.map((parent) => (
                      <Select.Item key={parent.id} index={parseInt(parent.id)} value={parent.id}>
                        <Select.ItemText>{parent.name}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                  <Select.ScrollDownButton />
                </Select.Content>
              </Select>
            </YStack>

            {/* Date Selection */}
            <XStack space="$3">
              <YStack flex={1} space="$2">
                <Text fontWeight="500">{t('pickupAuthorizations.startDate')}</Text>
                <Input
                  placeholder="YYYY-MM-DD"
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </YStack>
              <YStack flex={1} space="$2">
                <Text fontWeight="500">{t('pickupAuthorizations.endDate')}</Text>
                <Input
                  placeholder="YYYY-MM-DD"
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </YStack>
            </XStack>

            {/* Buttons */}
            <XStack space="$3" marginTop="$4">
              <Button
                flex={1}
                variant="outlined"
                onPress={() => setIsAddSheetOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                flex={1}
                backgroundColor="$blue10"
                color="white"
                onPress={handleCreateAuthorization}
                disabled={!selectedChild || !selectedParent || !startDate || !endDate}
              >
                {t('pickupAuthorizations.createAuthorization')}
              </Button>
            </XStack>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </YStack>
  );
};

export default PickupAuthorizationsScreen;