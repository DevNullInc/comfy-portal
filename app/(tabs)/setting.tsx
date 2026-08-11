import { AppBar } from '@/components/layout/app-bar';
import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { Switch } from '@/components/ui/switch';
import { Modal, ModalBackdrop, ModalContent, ModalBody, ModalHeader, ModalCloseButton } from '@/components/ui/modal';
import { useThemeStore } from '@/store/theme';
import { useSettingsStore, SavedPrompt, DebugLog } from '@/store/settings-store';
import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { buildServerUrl, fetchWithAuth } from '@/services/network';
import { showToast } from '@/utils/toast';
import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths, Directory } from 'expo-file-system';
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  FileText,
  GithubIcon,
  Info,
  Palette,
  Shield,
  Sparkles,
  Star,
  Globe,
  Link2,
  Cpu,
  Bookmark,
  Database,
  Trash2,
  Plus,
  RefreshCcw,
  Sliders,
  Settings,
  HardDrive,
  FileCode,
  Terminal,
  Activity,
  AlertTriangle,
  X
} from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Platform, Alert, StyleSheet } from 'react-native';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetItem,
  ActionsheetItemText,
} from '@/components/ui/actionsheet';

const LANGUAGES = [
  { code: 'en', name: 'English (US)' },
  { code: 'zh', name: '简体中文' },
  { code: 'es', name: 'Español' },
  { code: 'ja', name: '日本語' },
  { code: 'de', name: 'Deutsch' },
];

export default function SettingScreen() {
  const { preference, setPreference } = useThemeStore();
  const settings = useSettingsStore();
  const { servers, refreshServer } = useServersStore();

  const [activeTab, setActiveTab] = useState<'App' | 'Server' | 'About'>('App');

  // Language Actionsheet
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  // Auto-Connect Actionsheet
  const [isAutoConnectOpen, setIsAutoConnectOpen] = useState(false);

  // Saved Prompts State
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');

  // Debug Log State
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  // Server Diagnostics State
  const [selectedServerId, setSelectedServerId] = useState('');
  const [isServerPickerOpen, setIsServerPickerOpen] = useState(false);
  const [serverStats, setServerStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [syncingModels, setSyncingModels] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  // App Store URL
  const appStoreUrl = 'https://apps.apple.com/us/app/comfy-portal/id6741044736';

  // Automatically select first server for diagnostics if available
  useEffect(() => {
    if (servers.length > 0 && !selectedServerId) {
      setSelectedServerId(servers[0].id);
    }
  }, [servers]);

  // Load server stats when tab switches or server changes
  useEffect(() => {
    if (activeTab === 'Server' && selectedServerId) {
      fetchServerStats(selectedServerId);
    } else {
      setServerStats(null);
    }
  }, [activeTab, selectedServerId]);

  const fetchServerStats = async (serverId: string) => {
    const server = servers.find((s) => s.id === serverId);
    if (!server || server.status !== 'online') {
      setServerStats(null);
      return;
    }

    setStatsLoading(true);
    try {
      const statsUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/system_stats');
      const res = await fetchWithAuth(statsUrl, server.token);
      if (res.ok) {
        const data = await res.json();
        setServerStats(data);
      } else {
        setServerStats(null);
      }
    } catch (e) {
      console.error('Failed to fetch server stats:', e);
      setServerStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      const backupData = {
        language: settings.language,
        autoConnectServerId: settings.autoConnectServerId,
        showLivePreviews: settings.showLivePreviews,
        showBuiltInWorkflows: settings.showBuiltInWorkflows,
        expandPromptField: settings.expandPromptField,
        useInMemoryCache: settings.useInMemoryCache,
        disableMediaCache: settings.disableMediaCache,
        enableDebugLogging: settings.enableDebugLogging,
        savedPrompts: settings.savedPrompts,
      };

      const file = new File(Paths.cache, 'renegade_settings_backup.json');
      await file.write(JSON.stringify(backupData, null, 2));

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export RenegadeComfy Settings',
      });
      showToast.success('Backup Created', 'Settings exported successfully.');
    } catch (e: any) {
      console.error(e);
      showToast.error('Backup Failed', e.message || 'Unable to create backup.');
    }
  };

  const handleRestore = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const content = await new File(fileUri).text();
      const backup = JSON.parse(content);

      if (typeof backup !== 'object' || backup === null) {
        throw new Error('Invalid backup file format.');
      }

      if (backup.language !== undefined) settings.setLanguage(backup.language);
      if (backup.autoConnectServerId !== undefined) settings.setAutoConnectServerId(backup.autoConnectServerId);
      if (backup.showLivePreviews !== undefined) settings.setShowLivePreviews(backup.showLivePreviews);
      if (backup.showBuiltInWorkflows !== undefined) settings.setShowBuiltInWorkflows(backup.showBuiltInWorkflows);
      if (backup.expandPromptField !== undefined) settings.setExpandPromptField(backup.expandPromptField);
      if (backup.useInMemoryCache !== undefined) settings.setUseInMemoryCache(backup.useInMemoryCache);
      if (backup.disableMediaCache !== undefined) settings.setDisableMediaCache(backup.disableMediaCache);
      if (backup.enableDebugLogging !== undefined) settings.setEnableDebugLogging(backup.enableDebugLogging);
      
      if (Array.isArray(backup.savedPrompts)) {
        useSettingsStore.setState({ savedPrompts: backup.savedPrompts });
      }

      showToast.success('Settings Restored', 'Preferences updated successfully.');
    } catch (e: any) {
      console.error(e);
      showToast.error('Restore Failed', e.message || 'Failed to restore settings.');
    }
  };

  const handleResetApp = () => {
    const performReset = () => {
      // Clear workflows
      useWorkflowStore.setState({ workflow: [] });
      // Clear saved prompts
      useSettingsStore.setState({ savedPrompts: [] });
      showToast.success('Reset Complete', 'Workflows and prompts library cleared.');
    };

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to clear your saved prompts and workflow library?')) {
        performReset();
      }
    } else {
      Alert.alert(
        'Confirm Reset',
        'Are you sure you want to clear your saved prompts and workflow library? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reset Library', style: 'destructive', onPress: performReset },
        ]
      );
    }
  };

  const handleRestoreDefaults = () => {
    const performRestore = () => {
      settings.resetSettings();
      showToast.success('Defaults Restored', 'All settings reset to default values.');
    };

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to restore default preferences?')) {
        performRestore();
      }
    } else {
      Alert.alert(
        'Restore Defaults',
        'Are you sure you want to reset all preferences to defaults?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Restore', style: 'destructive', onPress: performRestore },
        ]
      );
    }
  };

  const handleAddPrompt = () => {
    if (!newPromptName.trim() || !newPromptContent.trim()) {
      showToast.error('Input Error', 'Please specify a name and content for the prompt.');
      return;
    }
    settings.addSavedPrompt(newPromptName.trim(), newPromptContent.trim());
    setNewPromptName('');
    setNewPromptContent('');
    showToast.success('Prompt Saved', 'Prompt added to your quick library.');
  };

  const handleRefreshModels = async () => {
    if (!selectedServerId) return;
    setSyncingModels(true);
    try {
      await refreshServer(selectedServerId);
      showToast.success('Sync Complete', 'Models refreshed from remote ComfyUI.');
    } catch (e: any) {
      console.error(e);
      showToast.error('Sync Failed', e.message || 'Failed to pull remote models.');
    } finally {
      setSyncingModels(false);
    }
  };

  const handleClearLocalHistory = async () => {
    const performClear = async () => {
      setClearingHistory(true);
      try {
        const serverDir = new Directory(Paths.document, 'server');
        if (Paths.info(serverDir.uri).exists) {
          await serverDir.delete();
        }
        await serverDir.create({ intermediates: true, idempotent: true });
        showToast.success('History Cleared', 'All local cached generated files have been deleted.');
      } catch (e: any) {
        console.error(e);
        showToast.error('Failed', 'Could not clear local media directory.');
      } finally {
        setClearingHistory(false);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to delete all cached generated previews from this device?')) {
        await performClear();
      }
    } else {
      Alert.alert(
        'Clear Local Cache',
        'Delete all cached preview images and videos from this device? (Outputs on the server will not be affected).',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear History', style: 'destructive', onPress: performClear },
        ]
      );
    }
  };

  const getActiveServerName = () => {
    const server = servers.find((s) => s.id === selectedServerId);
    return server ? `${server.name} (${server.host}:${server.port})` : 'Select a Server';
  };

  // Render Bar Gauge
  const renderGauge = (label: string, percentage: number, subtext: string) => {
    const pct = Math.min(100, Math.max(0, percentage));
    return (
      <View className="mb-4">
        <View className="flex-row justify-between items-center mb-1.5">
          <Text className="text-sm font-semibold text-typography-800">{label}</Text>
          <Text className="text-xs text-typography-500">{subtext}</Text>
        </View>
        <View className="h-2.5 w-full rounded-full bg-background-100 dark:bg-background-800 overflow-hidden">
          <View
            className={`h-full rounded-full ${pct > 85 ? 'bg-error-500' : pct > 65 ? 'bg-warning-500' : 'bg-primary-500'}`}
            style={{ width: `${pct}%` }}
          />
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background-0">
      <AppBar title="Settings" titleSize="xl" />
      
      {/* Segmented Tab Bar */}
      <View className="px-5 py-3">
        <SegmentedControl
          options={['App Settings', 'Server Settings', 'About']}
          value={activeTab === 'App' ? 'App Settings' : activeTab === 'Server' ? 'Server Settings' : 'About'}
          onChange={(val) => {
            if (val === 'App Settings') setActiveTab('App');
            else if (val === 'Server Settings') setActiveTab('Server');
            else setActiveTab('About');
          }}
        />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === 'App' && (
          <VStack space="lg" className="px-5 mt-2">
            
            {/* General Card */}
            <View className="bg-background-50 dark:bg-background-900 rounded-2xl p-4 shadow-sm">
              <HStack space="xs" className="items-center mb-4 border-b border-background-100 dark:border-background-800 pb-2">
                <Icon as={Settings} size="sm" className="text-primary-500 mr-1.5" />
                <Text className="text-base font-bold text-typography-900">General Preferences</Text>
              </HStack>

              {/* Language Row */}
              <Pressable
                onPress={() => setIsLanguageOpen(true)}
                className="flex-row items-center justify-between py-3 border-b border-background-100 dark:border-background-800"
              >
                <HStack space="sm" className="items-center">
                  <Icon as={Globe} size="sm" className="text-typography-600 mr-2" />
                  <Text className="text-sm font-medium text-typography-800">Language & Spelling</Text>
                </HStack>
                <HStack space="xs" className="items-center">
                  <Text className="text-sm text-typography-500">
                    {LANGUAGES.find((l) => l.code === settings.language)?.name || 'English (US)'}
                  </Text>
                  <Icon as={ChevronDown} size="xs" className="text-typography-400" />
                </HStack>
              </Pressable>

              {/* Theme Selector */}
              <View className="py-3">
                <HStack space="sm" className="items-center mb-3">
                  <Icon as={Palette} size="sm" className="text-typography-600 mr-2" />
                  <Text className="text-sm font-medium text-typography-800">App Theme</Text>
                </HStack>
                <SegmentedControl
                  options={['light', 'dark', 'system']}
                  value={preference}
                  onChange={(v) => setPreference(v as 'light' | 'dark' | 'system')}
                />
              </View>
            </View>

            {/* Connection Card */}
            <View className="bg-background-50 dark:bg-background-900 rounded-2xl p-4 shadow-sm">
              <HStack space="xs" className="items-center mb-3 border-b border-background-100 dark:border-background-800 pb-2">
                <Icon as={Link2} size="sm" className="text-primary-500 mr-1.5" />
                <Text className="text-base font-bold text-typography-900">Startup Connection</Text>
              </HStack>
              
              <Pressable
                onPress={() => setIsAutoConnectOpen(true)}
                className="flex-row items-center justify-between py-3"
              >
                <View className="flex-1 pr-4">
                  <Text className="text-sm font-medium text-typography-800">Auto-Connect Server</Text>
                  <Text className="text-xs text-typography-500 mt-0.5">
                    Connects automatically to this server when the app launches.
                  </Text>
                </View>
                <HStack space="xs" className="items-center">
                  <Text className="text-sm text-typography-500">
                    {servers.find((s) => s.id === settings.autoConnectServerId)?.name || 'None'}
                  </Text>
                  <Icon as={ChevronDown} size="xs" className="text-typography-400" />
                </HStack>
              </Pressable>
            </View>

            {/* Generation settings Card */}
            <View className="bg-background-50 dark:bg-background-900 rounded-2xl p-4 shadow-sm">
              <HStack space="xs" className="items-center mb-3 border-b border-background-100 dark:border-background-800 pb-2">
                <Icon as={Sliders} size="sm" className="text-primary-500 mr-1.5" />
                <Text className="text-base font-bold text-typography-900">Generation Settings</Text>
              </HStack>

              {/* Show Live Previews */}
              <HStack className="items-center justify-between py-3 border-b border-background-100 dark:border-background-800">
                <View className="flex-1 pr-4">
                  <Text className="text-sm font-medium text-typography-800">Show Live Previews</Text>
                  <Text className="text-xs text-typography-500 mt-0.5">
                    Display real-time latent outputs while model is sampling.
                  </Text>
                </View>
                <Switch
                  value={settings.showLivePreviews}
                  onValueChange={settings.setShowLivePreviews}
                />
              </HStack>

              {/* Show Built-In Workflows */}
              <HStack className="items-center justify-between py-3 border-b border-background-100 dark:border-background-800">
                <View className="flex-1 pr-4">
                  <Text className="text-sm font-medium text-typography-800">Show Built-in Workflows</Text>
                  <Text className="text-xs text-typography-500 mt-0.5">
                    Display native templates alongside server-synced workflows.
                  </Text>
                </View>
                <Switch
                  value={settings.showBuiltInWorkflows}
                  onValueChange={settings.setShowBuiltInWorkflows}
                />
              </HStack>

              {/* Expand Prompt Field */}
              <HStack className="items-center justify-between py-3">
                <View className="flex-1 pr-4">
                  <Text className="text-sm font-medium text-typography-800">Expand Prompt Fields</Text>
                  <Text className="text-xs text-typography-500 mt-0.5">
                    Increases default height of textareas when typing prompts.
                  </Text>
                </View>
                <Switch
                  value={settings.expandPromptField}
                  onValueChange={settings.setExpandPromptField}
                />
              </HStack>
            </View>

            {/* Cache & Storage Card */}
            <View className="bg-background-50 dark:bg-background-900 rounded-2xl p-4 shadow-sm">
              <HStack space="xs" className="items-center mb-3 border-b border-background-100 dark:border-background-800 pb-2">
                <Icon as={HardDrive} size="sm" className="text-primary-500 mr-1.5" />
                <Text className="text-base font-bold text-typography-900">Cache & Storage</Text>
              </HStack>

              {/* In-memory Cache */}
              <HStack className="items-center justify-between py-3 border-b border-background-100 dark:border-background-800">
                <View className="flex-1 pr-4">
                  <Text className="text-sm font-medium text-typography-800">In-Memory First Cache</Text>
                  <Text className="text-xs text-typography-500 mt-0.5">
                    Prioritize cache reads from memory before querying disk storage.
                  </Text>
                </View>
                <Switch
                  value={settings.useInMemoryCache}
                  onValueChange={settings.setUseInMemoryCache}
                />
              </HStack>

              {/* Disable Media Cache */}
              <HStack className="items-center justify-between py-3">
                <View className="flex-1 pr-4">
                  <Text className="text-sm font-medium text-typography-800">Disable Media Cache</Text>
                  <Text className="text-xs text-typography-500 mt-0.5">
                    Prevent automatically saving previews on device (Privacy Feature).
                  </Text>
                </View>
                <Switch
                  value={settings.disableMediaCache}
                  onValueChange={settings.setDisableMediaCache}
                />
              </HStack>
            </View>

            {/* Prompt Library Card */}
            <View className="bg-background-50 dark:bg-background-900 rounded-2xl p-4 shadow-sm">
              <HStack space="xs" className="items-center mb-3 border-b border-background-100 dark:border-background-800 pb-2">
                <Icon as={Bookmark} size="sm" className="text-primary-500 mr-1.5" />
                <Text className="text-base font-bold text-typography-900">Saved Prompts Library</Text>
              </HStack>

              {/* Saved Prompts list */}
              {settings.savedPrompts.length > 0 ? (
                <View className="mb-4">
                  {settings.savedPrompts.map((item) => (
                    <HStack key={item.id} className="items-center justify-between py-2.5 border-b border-background-100 dark:border-background-800">
                      <View className="flex-1 pr-4">
                        <Text className="text-sm font-semibold text-typography-900">{item.name}</Text>
                        <Text className="text-xs text-typography-500 mt-0.5" numberOfLines={1}>
                          {item.content}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => settings.removeSavedPrompt(item.id)}
                        className="p-2 active:bg-background-100 rounded-full"
                      >
                        <Icon as={Trash2} size="sm" className="text-error-500" />
                      </Pressable>
                    </HStack>
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-typography-500 py-3 text-center">
                  No saved prompts yet. Add one below!
                </Text>
              )}

              {/* Add New Prompt inline Form */}
              <VStack space="sm" className="bg-background-100 dark:bg-background-800/50 rounded-xl p-3 mt-1">
                <Text className="text-xs font-bold text-typography-800">Add New Quick Prompt</Text>
                <Input size="sm" className="rounded-lg bg-background-0">
                  <InputField
                    placeholder="Short Identifier (e.g. Masterpiece)"
                    value={newPromptName}
                    onChangeText={setNewPromptName}
                  />
                </Input>
                <Input size="sm" className="rounded-lg bg-background-0">
                  <InputField
                    placeholder="Prompt Text content"
                    value={newPromptContent}
                    onChangeText={setNewPromptContent}
                    multiline={true}
                  />
                </Input>
                <Button
                  onPress={handleAddPrompt}
                  size="sm"
                  className="rounded-lg bg-primary-500 self-end mt-1"
                >
                  <ButtonIcon as={Plus} size="sm" className="mr-1.5 text-white" />
                  <ButtonText className="text-white">Save to Library</ButtonText>
                </Button>
              </VStack>
            </View>

            {/* Backup & Tools Card */}
            <View className="bg-background-50 dark:bg-background-900 rounded-2xl p-4 shadow-sm">
              <HStack space="xs" className="items-center mb-3 border-b border-background-100 dark:border-background-800 pb-2">
                <Icon as={Database} size="sm" className="text-primary-500 mr-1.5" />
                <Text className="text-base font-bold text-typography-900">Data Management</Text>
              </HStack>

              <HStack space="md" className="py-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl border-primary-500"
                  onPress={handleBackup}
                >
                  <ButtonIcon as={FileCode} size="sm" className="text-primary-500 mr-1.5" />
                  <ButtonText className="text-primary-500">Backup Settings</ButtonText>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl border-primary-500"
                  onPress={handleRestore}
                >
                  <ButtonIcon as={RefreshCcw} size="sm" className="text-primary-500 mr-1.5" />
                  <ButtonText className="text-primary-500">Restore Backup</ButtonText>
                </Button>
              </HStack>

              <HStack space="md" className="py-2.5">
                <Button
                  variant="solid"
                  action="negative"
                  size="sm"
                  className="flex-1 rounded-xl bg-error-50 dark:bg-error-950/20 border border-error-200 dark:border-error-900"
                  onPress={handleResetApp}
                >
                  <ButtonIcon as={Trash2} size="sm" className="text-error-600 mr-1.5" />
                  <ButtonText className="text-error-600 font-semibold">Reset Library</ButtonText>
                </Button>
                <Button
                  variant="solid"
                  action="negative"
                  size="sm"
                  className="flex-1 rounded-xl bg-error-50 dark:bg-error-950/20 border border-error-200 dark:border-error-900"
                  onPress={handleRestoreDefaults}
                >
                  <ButtonIcon as={AlertTriangle} size="sm" className="text-error-600 mr-1.5" />
                  <ButtonText className="text-error-600 font-semibold">Restore Defaults</ButtonText>
                </Button>
              </HStack>
            </View>

            {/* Debug Logging Card */}
            <View className="bg-background-50 dark:bg-background-900 rounded-2xl p-4 shadow-sm">
              <HStack space="xs" className="items-center mb-3 border-b border-background-100 dark:border-background-800 pb-2">
                <Icon as={Terminal} size="sm" className="text-primary-500 mr-1.5" />
                <Text className="text-base font-bold text-typography-900">Developer Tools</Text>
              </HStack>

              <HStack className="items-center justify-between py-3 border-b border-background-100 dark:border-background-800">
                <View className="flex-1 pr-4">
                  <Text className="text-sm font-medium text-typography-800">Enable Debug Logging</Text>
                  <Text className="text-xs text-typography-500 mt-0.5">
                    Save internal messages and WebSockets traffic logs.
                  </Text>
                </View>
                <Switch
                  value={settings.enableDebugLogging}
                  onValueChange={settings.setEnableDebugLogging}
                />
              </HStack>

              {settings.enableDebugLogging && (
                <Button
                  onPress={() => setIsLogsModalOpen(true)}
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-primary-500 mt-3"
                >
                  <ButtonIcon as={Activity} size="sm" className="text-primary-500 mr-1.5" />
                  <ButtonText className="text-primary-500">View In-App Debug Logs</ButtonText>
                </Button>
              )}
            </View>
          </VStack>
        )}

        {activeTab === 'Server' && (
          <VStack space="lg" className="px-5 mt-2">
            
            {/* Server Selector Dropdown */}
            <View className="bg-background-50 dark:bg-background-900 rounded-2xl p-4 shadow-sm">
              <Text className="text-xs font-bold text-typography-500 mb-2 uppercase">Select Server to Inspect</Text>
              <Pressable
                onPress={() => servers.length > 0 && setIsServerPickerOpen(true)}
                className="flex-row items-center justify-between p-3 bg-background-100 dark:bg-background-800 rounded-xl"
              >
                <Text className="text-sm font-medium text-typography-800">{getActiveServerName()}</Text>
                <Icon as={ChevronDown} size="sm" className="text-typography-500" />
              </Pressable>
            </View>

            {selectedServerId ? (
              <>
                {/* Diagnostics Display */}
                {statsLoading ? (
                  <View className="py-12 items-center">
                    <ActivityIndicator size="small" />
                    <Text className="text-xs text-typography-500 mt-2 font-medium">Fetching remote diagnostics...</Text>
                  </View>
                ) : serverStats ? (
                  <>
                    {/* Hardware Info gauges */}
                    <View className="bg-background-50 dark:bg-background-900 rounded-2xl p-4 shadow-sm">
                      <HStack space="xs" className="items-center mb-4 border-b border-background-100 dark:border-background-800 pb-2">
                        <Icon as={Cpu} size="sm" className="text-primary-500 mr-1.5" />
                        <Text className="text-base font-bold text-typography-900">System Resources</Text>
                      </HStack>

                      {/* RAM Gauge */}
                      {serverStats.system?.ram_total && (() => {
                        const total = serverStats.system.ram_total;
                        const free = serverStats.system.ram_free || 0;
                        const used = total - free;
                        const percentage = (used / total) * 100;
                        const totalGB = (total / (1024 * 1024 * 1024)).toFixed(1);
                        const usedGB = (used / (1024 * 1024 * 1024)).toFixed(1);
                        return renderGauge(
                          'System RAM Usage',
                          percentage,
                          `${usedGB} GB / ${totalGB} GB (${Math.round(percentage)}%)`
                        );
                      })()}

                      {/* GPU VRAM Gauges */}
                      {serverStats.devices && serverStats.devices.map((dev: any, i: number) => {
                        if (dev.vram_total) {
                          const total = dev.vram_total;
                          const free = dev.vram_free || 0;
                          const used = total - free;
                          const percentage = (used / total) * 100;
                          const totalGB = (total / (1024 * 1024 * 1024)).toFixed(1);
                          const usedGB = (used / (1024 * 1024 * 1024)).toFixed(1);
                          return (
                            <View key={i} className="mt-2">
                              <Text className="text-xs font-bold text-typography-500 mb-1">
                                GPU: {dev.name || `Card #${i}`}
                              </Text>
                              {renderGauge(
                                'VRAM Usage',
                                percentage,
                                `${usedGB} GB / ${totalGB} GB (${Math.round(percentage)}%)`
                              )}
                            </View>
                          );
                        }
                        return null;
                      })}
                    </View>

                    {/* Server Metadata Specs */}
                    <View className="bg-background-50 dark:bg-background-900 rounded-2xl p-4 shadow-sm">
                      <HStack space="xs" className="items-center mb-3 border-b border-background-100 dark:border-background-800 pb-2">
                        <Icon as={Info} size="sm" className="text-primary-500 mr-1.5" />
                        <Text className="text-base font-bold text-typography-900">Software Environment</Text>
                      </HStack>

                      <VStack space="sm" className="py-1">
                        <HStack className="justify-between border-b border-background-100 dark:border-background-800 pb-2.5">
                          <Text className="text-sm text-typography-500 font-medium">OS Platform</Text>
                          <Text className="text-sm font-semibold text-typography-800">
                            {serverStats.system?.os === 'nt' ? 'Windows OS' : serverStats.system?.os || 'Linux / Unix'}
                          </Text>
                        </HStack>
                        <HStack className="justify-between border-b border-background-100 dark:border-background-800 pb-2.5">
                          <Text className="text-sm text-typography-500 font-medium">ComfyUI Version</Text>
                          <Text className="text-sm font-semibold text-typography-800">{serverStats.system?.comfyui_version || 'Unknown'}</Text>
                        </HStack>
                        <HStack className="justify-between border-b border-background-100 dark:border-background-800 pb-2.5">
                          <Text className="text-sm text-typography-500 font-medium">Python Version</Text>
                          <Text className="text-sm font-semibold text-typography-800" numberOfLines={1}>
                            {(serverStats.system?.python_version || '').split(' ')[0] || 'Unknown'}
                          </Text>
                        </HStack>
                        <HStack className="justify-between pb-1">
                          <Text className="text-sm text-typography-500 font-medium">PyTorch Version</Text>
                          <Text className="text-sm font-semibold text-typography-800">{serverStats.system?.pytorch_version || 'Unknown'}</Text>
                        </HStack>
                      </VStack>
                    </View>
                  </>
                ) : (
                  <View className="bg-background-50 dark:bg-background-900 rounded-2xl p-6 items-center shadow-sm">
                    <Icon as={AlertTriangle} size="lg" className="text-warning-500 mb-2" />
                    <Text className="text-sm font-semibold text-typography-900">Server Offline or Unreachable</Text>
                    <Text className="text-xs text-typography-500 text-center mt-1">
                      Could not pull system stats from the selected server. Make sure it is currently running and online.
                    </Text>
                    <Button
                      onPress={() => fetchServerStats(selectedServerId)}
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-primary-500 mt-4"
                    >
                      <ButtonIcon as={RefreshCcw} size="xs" className="text-primary-500 mr-1.5" />
                      <ButtonText className="text-primary-500">Retry Diagnostics</ButtonText>
                    </Button>
                  </View>
                )}

                {/* Management Operations */}
                <View className="bg-background-50 dark:bg-background-900 rounded-2xl p-4 shadow-sm">
                  <HStack space="xs" className="items-center mb-3 border-b border-background-100 dark:border-background-800 pb-2">
                    <Icon as={Settings} size="sm" className="text-primary-500 mr-1.5" />
                    <Text className="text-base font-bold text-typography-900">Server Management</Text>
                  </HStack>

                  <VStack space="md" className="py-1">
                    <Button
                      onPress={handleRefreshModels}
                      disabled={syncingModels}
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-primary-500"
                    >
                      <ButtonIcon as={RefreshCcw} size="sm" className="text-primary-500 mr-1.5" />
                      <ButtonText className="text-primary-500">
                        {syncingModels ? 'Syncing Models...' : 'Refresh Remote Models Database'}
                      </ButtonText>
                    </Button>

                    <Button
                      onPress={handleClearLocalHistory}
                      disabled={clearingHistory}
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-error-500"
                    >
                      <ButtonIcon as={Trash2} size="sm" className="text-error-500 mr-1.5" />
                      <ButtonText className="text-error-500">
                        {clearingHistory ? 'Clearing cache...' : 'Clear Device Generation History'}
                      </ButtonText>
                    </Button>
                  </VStack>
                </View>
              </>
            ) : (
              <View className="py-12 items-center bg-background-50 dark:bg-background-900 rounded-2xl p-4">
                <Text className="text-sm text-typography-500">No servers configured. Add a server to view stats.</Text>
              </View>
            )}
          </VStack>
        )}

        {activeTab === 'About' && (
          <VStack space="lg" className="px-5 mt-2">
            
            {/* About App Info */}
            <View className="bg-background-50 dark:bg-background-900 rounded-2xl p-5 items-center shadow-sm">
              <View className="h-16 w-16 bg-primary-500 rounded-2xl items-center justify-center mb-4 shadow-md">
                <Icon as={Sparkles} size="xl" className="text-white h-10 w-10" />
              </View>
              <Text className="text-xl font-bold text-typography-900">RenegadeComfy</Text>
              <Text className="text-xs text-typography-400 mt-1">Version 1.2.0 (Stable)</Text>
              <Text className="text-sm text-typography-600 text-center mt-3 leading-relaxed">
                Formerly Comfy Portal. RenegadeComfy is a premium mobile interface designed for ComfyUI. We empower you to run workflows, manage nodes, validate uploaded graphs, and monitor generations on the go.
              </Text>
            </View>

            {/* Links and Legal */}
            <View className="bg-background-50 dark:bg-background-900 rounded-2xl p-4 shadow-sm">
              {/* GitHub Link */}
              <Link href="https://github.com/DevNullInc/comfy-portal" asChild>
                <Pressable className="flex-row items-center justify-between py-3 border-b border-background-100 dark:border-background-800">
                  <HStack space="sm" className="items-center">
                    <Icon as={GithubIcon} size="sm" className="text-typography-600 mr-2" />
                    <Text className="text-sm font-medium text-typography-800">Project GitHub Repository</Text>
                  </HStack>
                  <Icon as={ChevronRight} size="xs" className="text-typography-400" />
                </Pressable>
              </Link>

              {/* Guide Setup */}
              <Link href="/guide" asChild>
                <Pressable className="flex-row items-center justify-between py-3 border-b border-background-100 dark:border-background-800">
                  <HStack space="sm" className="items-center">
                    <Icon as={BookOpen} size="sm" className="text-typography-600 mr-2" />
                    <Text className="text-sm font-medium text-typography-800">Setup instructions & Guide</Text>
                  </HStack>
                  <Icon as={ChevronRight} size="xs" className="text-typography-400" />
                </Pressable>
              </Link>

              {/* Privacy Policy */}
              <Link href="/legal/privacy" asChild>
                <Pressable className="flex-row items-center justify-between py-3 border-b border-background-100 dark:border-background-800">
                  <HStack space="sm" className="items-center">
                    <Icon as={Shield} size="sm" className="text-typography-600 mr-2" />
                    <Text className="text-sm font-medium text-typography-800">Privacy Policy</Text>
                  </HStack>
                  <Icon as={ChevronRight} size="xs" className="text-typography-400" />
                </Pressable>
              </Link>

              {/* Terms of Service */}
              <Link href="/legal/terms" asChild>
                <Pressable className="flex-row items-center justify-between py-3 border-b border-background-100 dark:border-background-800">
                  <HStack space="sm" className="items-center">
                    <Icon as={FileText} size="sm" className="text-typography-600 mr-2" />
                    <Text className="text-sm font-medium text-typography-800">Terms of Service</Text>
                  </HStack>
                  <Icon as={ChevronRight} size="xs" className="text-typography-400" />
                </Pressable>
              </Link>

              {/* Enjoy App Rating */}
              <Pressable onPress={() => Linking.openURL(appStoreUrl)} className="flex-row items-center justify-between py-3">
                <HStack space="sm" className="items-center">
                  <Icon as={Star} size="sm" className="text-typography-600 mr-2" />
                  <Text className="text-sm font-medium text-typography-800">Rate RenegadeComfy</Text>
                </HStack>
                <Icon as={ChevronRight} size="xs" className="text-typography-400" />
              </Pressable>
            </View>
          </VStack>
        )}
      </ScrollView>

      {/* Language Selection Actionsheet */}
      <Actionsheet isOpen={isLanguageOpen} onClose={() => setIsLanguageOpen(false)}>
        <ActionsheetBackdrop />
        <ActionsheetContent className="pb-8">
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          <View className="px-4 py-2 border-b border-background-100 dark:border-background-800 w-full">
            <Text className="text-base font-bold text-typography-900 text-center">Select Language & Spelling</Text>
          </View>
          <ScrollView className="w-full max-h-64 mt-2">
            {LANGUAGES.map((lang) => (
              <ActionsheetItem
                key={lang.code}
                onPress={() => {
                  settings.setLanguage(lang.code);
                  setIsLanguageOpen(false);
                  showToast.success('Language Selected', `Language changed to ${lang.name}`);
                }}
                className={`py-3 px-5 w-full flex-row justify-between items-center ${settings.language === lang.code ? 'bg-primary-50 dark:bg-primary-950/20' : ''}`}
              >
                <ActionsheetItemText className={settings.language === lang.code ? 'text-primary-500 font-bold' : 'text-typography-800'}>
                  {lang.name}
                </ActionsheetItemText>
              </ActionsheetItem>
            ))}
          </ScrollView>
        </ActionsheetContent>
      </Actionsheet>

      {/* Auto-Connect Server Selection Actionsheet */}
      <Actionsheet isOpen={isAutoConnectOpen} onClose={() => setIsAutoConnectOpen(false)}>
        <ActionsheetBackdrop />
        <ActionsheetContent className="pb-8">
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          <View className="px-4 py-2 border-b border-background-100 dark:border-background-800 w-full">
            <Text className="text-base font-bold text-typography-900 text-center">Select Auto-Connect Server</Text>
          </View>
          <ScrollView className="w-full max-h-64 mt-2">
            {/* None option */}
            <ActionsheetItem
              onPress={() => {
                settings.setAutoConnectServerId('');
                setIsAutoConnectOpen(false);
                showToast.success('Auto-Connect Cleared', 'Startup auto-connection disabled.');
              }}
              className={`py-3 px-5 w-full flex-row justify-between items-center ${!settings.autoConnectServerId ? 'bg-primary-50 dark:bg-primary-950/20' : ''}`}
            >
              <ActionsheetItemText className={!settings.autoConnectServerId ? 'text-primary-500 font-bold' : 'text-typography-800'}>
                None (Do not auto-connect)
              </ActionsheetItemText>
            </ActionsheetItem>

            {servers.map((srv) => (
              <ActionsheetItem
                key={srv.id}
                onPress={() => {
                  settings.setAutoConnectServerId(srv.id);
                  setIsAutoConnectOpen(false);
                  showToast.success('Server Selected', `Startup auto-connection set to ${srv.name}`);
                }}
                className={`py-3 px-5 w-full flex-row justify-between items-center ${settings.autoConnectServerId === srv.id ? 'bg-primary-50 dark:bg-primary-950/20' : ''}`}
              >
                <ActionsheetItemText className={settings.autoConnectServerId === srv.id ? 'text-primary-500 font-bold' : 'text-typography-800'}>
                  {srv.name} ({srv.host}:{srv.port})
                </ActionsheetItemText>
              </ActionsheetItem>
            ))}
          </ScrollView>
        </ActionsheetContent>
      </Actionsheet>

      {/* Diagnostics Server Selection Actionsheet */}
      <Actionsheet isOpen={isServerPickerOpen} onClose={() => setIsServerPickerOpen(false)}>
        <ActionsheetBackdrop />
        <ActionsheetContent className="pb-8">
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          <View className="px-4 py-2 border-b border-background-100 dark:border-background-800 w-full">
            <Text className="text-base font-bold text-typography-900 text-center">Select Server to Inspect</Text>
          </View>
          <ScrollView className="w-full max-h-64 mt-2">
            {servers.map((srv) => (
              <ActionsheetItem
                key={srv.id}
                onPress={() => {
                  setSelectedServerId(srv.id);
                  setIsServerPickerOpen(false);
                }}
                className={`py-3 px-5 w-full flex-row justify-between items-center ${selectedServerId === srv.id ? 'bg-primary-50 dark:bg-primary-950/20' : ''}`}
              >
                <ActionsheetItemText className={selectedServerId === srv.id ? 'text-primary-500 font-bold' : 'text-typography-800'}>
                  {srv.name} ({srv.host}:{srv.port})
                </ActionsheetItemText>
              </ActionsheetItem>
            ))}
          </ScrollView>
        </ActionsheetContent>
      </Actionsheet>

      {/* Debug Logs Viewer Modal */}
      <Modal isOpen={isLogsModalOpen} onClose={() => setIsLogsModalOpen(false)}>
        <ModalBackdrop />
        <ModalContent className="w-11/12 max-w-lg h-5/6 rounded-2xl bg-background-0">
          <ModalHeader className="px-4 py-3 border-b border-background-100 dark:border-background-800 flex-row justify-between items-center">
            <Text className="text-base font-bold text-typography-900">In-App Debug Logs</Text>
            <Pressable onPress={() => setIsLogsModalOpen(false)} className="p-1 active:bg-background-100 rounded-full">
              <Icon as={X} size="sm" className="text-typography-500" />
            </Pressable>
          </ModalHeader>
          <ModalBody className="p-0 flex-1">
            <View className="flex-1">
              <ScrollView className="flex-1 p-4">
                {settings.debugLogs.length > 0 ? (
                  settings.debugLogs.map((log, index) => (
                    <View key={index} className="mb-3 border-b border-background-100 dark:border-background-800/40 pb-2">
                      <HStack space="xs" className="items-center mb-1">
                        <Text
                          className={`text-2xs font-extrabold px-1.5 py-0.5 rounded uppercase ${
                            log.level === 'error'
                              ? 'bg-error-100 text-error-700 dark:bg-error-950/30'
                              : log.level === 'warn'
                              ? 'bg-warning-100 text-warning-700 dark:bg-warning-950/30'
                              : 'bg-info-100 text-info-700 dark:bg-info-950/30'
                          }`}
                        >
                          {log.level}
                        </Text>
                        <Text className="text-2xs text-typography-400 font-semibold">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </Text>
                      </HStack>
                      <Text className="text-xs text-typography-700 font-mono leading-relaxed">
                        {log.message}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View className="py-20 items-center justify-center">
                    <Icon as={Terminal} size="lg" className="text-typography-300 mb-2" />
                    <Text className="text-sm text-typography-500">Log list is currently empty.</Text>
                  </View>
                )}
              </ScrollView>
              
              {/* Logs actions */}
              <HStack space="md" className="p-4 border-t border-background-100 dark:border-background-800">
                <Button
                  onPress={() => {
                    settings.clearLogs();
                    showToast.success('Logs Cleared', 'In-app debug log list has been wiped.');
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl border-error-500"
                >
                  <ButtonText className="text-error-500 font-bold">Clear Logs</ButtonText>
                </Button>
                <Button
                  onPress={() => setIsLogsModalOpen(false)}
                  size="sm"
                  className="flex-1 rounded-xl bg-primary-500"
                >
                  <ButtonText className="text-white">Close</ButtonText>
                </Button>
              </HStack>
            </View>
          </ModalBody>
        </ModalContent>
      </Modal>
    </View>
  );
}
