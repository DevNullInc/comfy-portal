import { useLocalSearchParams, useRouter } from 'expo-router';
import { Edit3, Images, Search, ServerCrash, Trash2, Sliders, ArrowUp, ArrowDown, Eye, EyeOff, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Switch } from '@/components/ui/switch';
import { Modal, ModalBackdrop, ModalContent, ModalHeader, ModalBody } from '@/components/ui/modal';
import { ScrollView } from '@/components/ui/scroll-view';
import { showToast } from '@/utils/toast';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';

import { AppBar } from '@/components/layout/app-bar';
import { SheetTabToggle } from '@/components/self-ui/sheet-tab-toggle';
import { HistoryDrawer } from '@/features/generation/components/history-drawer';
import { RunPageHeaderStatus } from '@/features/generation/components/run-page-header-status';
import { GenerateActionButton } from '@/features/generation/components/generate-action-button';

import { Colors } from '@/constants/Colors';
import NodeComponent from '@/features/comfy-node/components/node';
import { AIChatTab, AIChatTabRef } from '@/features/ai-assistant/components/ai-chat-tab';
import { MediaPreview } from '@/features/generation/components/media-preview';
import { AdaptiveKeyboardAwareScrollView, AdaptiveTextInput } from '@/components/self-ui/adaptive-sheet-components';
import { BottomSheetProvider } from '@/context/bottom-sheet-context';
import { GenerationProvider, useGenerationActions } from '@/features/generation/context/generation-context';
import { useResolvedTheme } from '@/store/theme';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';
import BottomSheet from '@gorhom/bottom-sheet';

import { Button, ButtonText } from '@/components/ui/button';

function NodesTabContent({
  nodes,
  searchQuery,
  setSearchQuery,
  serverId,
  workflowId,
  theme,
  targetNodeId,
  sharedImageUri,
  onOpenLayoutConfig,
}: {
  nodes: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  serverId: string;
  workflowId: string;
  theme: string;
  targetNodeId?: string;
  sharedImageUri?: string;
  onOpenLayoutConfig?: () => void;
}) {
  const scrollRef = useRef<any>(null);
  const nodePositions = useRef<Record<string, number>>({});
  const hasScrolled = useRef(false);

  const handleNodeLayout = useCallback((nodeId: string, y: number) => {
    nodePositions.current[nodeId] = y;
  }, []);

  // Scroll to target node after all nodes are laid out and sheet is ready
  useEffect(() => {
    if (!targetNodeId || hasScrolled.current) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    const scrollToTarget = () => {
      const y = nodePositions.current[targetNodeId];
      if (y !== undefined && scrollRef.current) {
        hasScrolled.current = true;
        scrollRef.current.scrollTo({ y, animated: true });
        // Retry a few times to handle BottomSheet layout settling
        for (const delay of [1000, 2000, 3000]) {
          timers.push(setTimeout(() => scrollRef.current?.scrollTo({ y, animated: true }), delay));
        }
      }
    };

    timers.push(setTimeout(scrollToTarget, 2000));

    return () => timers.forEach(clearTimeout);
  }, [targetNodeId, nodes]);

  const bgColor = theme === 'light' ? Colors.light.background[0] : Colors.dark.background[0];

  const nodeList = nodes.map((node: any) => (
    <View
      key={node.id}
      onLayout={(e) => handleNodeLayout(node.id, e.nativeEvent.layout.y)}
    >
      <NodeComponent
        node={node}
        serverId={serverId}
        workflowId={workflowId}
        sharedImageUri={targetNodeId === node.id ? sharedImageUri : undefined}
      />
    </View>
  ));

  const scrollContentStyle = { padding: 16, paddingBottom: 24, backgroundColor: bgColor };
  const scrollStyle = { flex: 1 as const, backgroundColor: bgColor };

  return (
    <View className="flex-1 bg-background-0">
      <View className="px-4 pt-4 pb-2 bg-background-0">
        <HStack space="xs" className="items-center">
          <HStack
            className="flex-1 items-center rounded-lg bg-background-0 px-3 py-3"
            style={{
              borderWidth: 1,
              borderColor: theme === 'light' ? Colors.light.outline[50] : Colors.dark.outline[50],
            }}
          >
            <Icon as={Search} size="sm" className="text-typography-400 mr-2" />
            <AdaptiveTextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search nodes..."
              placeholderTextColor={theme === 'light' ? Colors.light.typography[400] : Colors.dark.typography[400]}
              style={{
                flex: 1,
                color: theme === 'light' ? Colors.light.typography[900] : Colors.dark.typography[900],
                fontSize: 14,
                padding: 0,
              }}
            />
          </HStack>
          {onOpenLayoutConfig && (
            <Button
              variant="outline"
              className="h-11 w-11 rounded-xl p-0 border-primary-500 bg-background-0 active:bg-background-50"
              onPress={onOpenLayoutConfig}
            >
              <Icon as={Sliders} size="sm" className="text-primary-500" />
            </Button>
          )}
        </HStack>
      </View>
      <AdaptiveKeyboardAwareScrollView
        ref={scrollRef}
        bottomOffset={20}
        contentContainerStyle={scrollContentStyle}
        style={scrollStyle}
      >
        {nodeList}
      </AdaptiveKeyboardAwareScrollView>
    </View>
  );
}

function RunWorkflowScreenContent() {
  const { serverId, workflowId, sharedImageUri, targetNodeId } = useLocalSearchParams<{
    serverId: string;
    workflowId: string;
    sharedImageUri?: string;
    targetNodeId?: string;
  }>();
  const router = useRouter();
  const theme = useResolvedTheme();
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const workflowRecord = useWorkflowStore((state) => state.workflow.find((p) => p.id === workflowId));
  const updateWorkflow = useWorkflowStore((state) => state.updateWorkflow);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const snapPoints = useMemo(() => ['30%', '60%', '80%'], []);
  const sheetRef = useRef<BottomSheet>(null);
  const aiChatTabRef = useRef<AIChatTabRef>(null);
  const sheetSnapIndexRef = useRef(1);

  // Tab state — simple index, no longer driven by react-native-tab-view
  const [tabIndex, setTabIndex] = useState(0);

  const { generate, setGeneratedMedia } = useGenerationActions();

  const [searchQuery, setSearchQuery] = useState('');
  const { layout, isLandscape, width: screenWidth } = useDeviceLayout();
  const useSplitLayout = layout !== 'compact' && isLandscape;
  const panelWidth = useSplitLayout
    ? Math.min(480, Math.max(360, screenWidth * 0.35))
    : 0;

  const handleGenerate = useCallback(() => {
    if (!server || !workflowRecord) return;
    generate(workflowRecord.data, workflowRecord.id, server.id);
  }, [server, workflowRecord, generate]);

  const handleSelectHistoryMedia = useCallback((url: string) => {
    setGeneratedMedia([url]);
    setIsHistoryOpen(false);
  }, [setGeneratedMedia]);

  const handleTabChange = useCallback((newIndex: number) => {
    setTabIndex(newIndex);
    // Auto-expand sheet when switching to AI tab at minimum snap
    if (newIndex === 1 && sheetSnapIndexRef.current === 0) {
      sheetRef.current?.snapToIndex(1);
    }
  }, []);

  const handleSheetChange = useCallback((index: number) => {
    sheetSnapIndexRef.current = index;
  }, []);

  const uiConfig = workflowRecord?.metadata?.uiConfig;

  const nodes = useMemo(() => {
    if (!workflowRecord) return [];
    const allNodes = Object.values(workflowRecord.data);
    
    // Sort nodes based on user's nodeOrder or default ID-based sorting
    let sorted = [...allNodes];
    if (uiConfig?.nodeOrder && uiConfig.nodeOrder.length > 0) {
      sorted.sort((a: any, b: any) => {
        const indexA = uiConfig.nodeOrder.indexOf(a.id);
        const indexB = uiConfig.nodeOrder.indexOf(b.id);
        const valA = indexA === -1 ? 999999 : indexA;
        const valB = indexB === -1 ? 999999 : indexB;
        return valA - valB;
      });
    } else {
      sorted.sort((a: any, b: any) => {
        const aId = parseInt(a.id);
        const bId = parseInt(b.id);
        return aId - bId;
      });
    }

    // Filter by visibility list (if configured)
    if (uiConfig?.visibleNodeIds) {
      sorted = sorted.filter((node: any) => uiConfig.visibleNodeIds.includes(node.id));
    }

    if (!searchQuery) return sorted;
    const lowerQuery = searchQuery.toLowerCase();
    return sorted.filter((node: any) => {
      const title = node._meta?.title || '';
      const type = node.class_type || '';
      const inputs = Object.keys(node.inputs || {}).join(' ');

      return title.toLowerCase().includes(lowerQuery) ||
        type.toLowerCase().includes(lowerQuery) ||
        inputs.toLowerCase().includes(lowerQuery);
    });
  }, [workflowRecord, searchQuery, uiConfig]);

  // Layout Config Modal state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempVisibleIds, setTempVisibleIds] = useState<string[]>([]);
  const [tempOrder, setTempOrder] = useState<string[]>([]);

  const handleOpenConfig = useCallback(() => {
    if (!workflowRecord) return;
    const allNodes = Object.values(workflowRecord.data);
    const defaultSortedIds = [...allNodes]
      .sort((a: any, b: any) => parseInt(a.id) - parseInt(b.id))
      .map((n: any) => n.id);

    const visibleIds = workflowRecord.metadata?.uiConfig?.visibleNodeIds ?? defaultSortedIds;
    const order = workflowRecord.metadata?.uiConfig?.nodeOrder ?? defaultSortedIds;

    // Ensure all node IDs are present in order
    const mergedOrder = [...order];
    defaultSortedIds.forEach((id) => {
      if (!mergedOrder.includes(id)) {
        mergedOrder.push(id);
      }
    });

    setTempVisibleIds(visibleIds);
    setTempOrder(mergedOrder);
    setIsConfigOpen(true);
  }, [workflowRecord]);

  const handleSaveConfig = () => {
    if (!workflowRecord) return;
    updateWorkflow(workflowRecord.id, {
      metadata: {
        ...workflowRecord.metadata,
        uiConfig: {
          visibleNodeIds: tempVisibleIds,
          nodeOrder: tempOrder,
        },
      },
    });
    setIsConfigOpen(false);
    showToast.success('Layout Updated', 'UI customization saved successfully.');
  };

  const handleResetConfig = () => {
    if (!workflowRecord) return;
    const allNodes = Object.values(workflowRecord.data);
    const defaultSortedIds = [...allNodes]
      .sort((a: any, b: any) => parseInt(a.id) - parseInt(b.id))
      .map((n: any) => n.id);

    setTempVisibleIds(defaultSortedIds);
    setTempOrder(defaultSortedIds);
  };

  const toggleVisibility = (nodeId: string) => {
    setTempVisibleIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  const moveNode = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...tempOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[targetIndex];
      newOrder[targetIndex] = temp;
      setTempOrder(newOrder);
    }
  };

  // Early returns after all hooks
  if (!workflowRecord) {
    router.back();
    return null;
  }

  if (!server) {
    return (
      <VStack className="flex-1 items-center justify-center px-6" space="md">
        <View className="rounded-full bg-background-50 p-3">
          <Icon as={ServerCrash} size="xl" className="h-10 w-10 text-typography-300" />
        </View>
        <VStack className="items-center" space="xs">
          <Text className="text-center text-base font-semibold text-typography-800">
            Server Not Found
          </Text>
          <Text className="text-center text-sm text-typography-500">
            Please check your server list and try again.
          </Text>
        </VStack>
      </VStack>
    );
  }

  return (
    <View className="z-0 flex-1 bg-background-0">
      <AppBar
        showBack
        title={workflowRecord.name}
        showBottomBorder={useSplitLayout}
        centerElement={
          <RunPageHeaderStatus serverName={server.name} />
        }
        rightElement={
          <HStack className="items-center" space="xs">
            {/* View Graph (Lite) Button */}
            <Button
              variant="link"
              className="h-9 w-9 rounded-xl p-0"
              onPress={() => {
                if (workflowRecord.addMethod === 'server-sync' && workflowRecord.metadata?.originalFilename) {
                  router.push(
                    `/workflow/${serverId}/viewer?mode=edit&filename=${encodeURIComponent(
                      workflowRecord.metadata.originalFilename
                    )}`
                  );
                } else {
                  useWorkflowStore.getState().setTempValidationWorkflow(workflowRecord.data);
                  router.push(`/workflow/${serverId}/viewer?mode=validation`);
                }
              }}
            >
              <Icon as={Eye} size="md" className="text-primary-500" />
            </Button>

            {workflowRecord.addMethod === 'server-sync' && workflowRecord.metadata?.originalFilename && (
              <Button
                variant="link"
                className="h-9 w-9 rounded-xl p-0"
                onPress={() =>
                  router.push(
                    `/workflow/${serverId}/editor?mode=edit&filename=${encodeURIComponent(
                      workflowRecord.metadata.originalFilename
                    )}`
                  )
                }
              >
                <Icon as={Edit3} size="md" className="text-primary-500" />
              </Button>
            )}
            <Button variant="link" className="h-9 w-9 rounded-xl p-0" onPress={() => setIsHistoryOpen(true)}>
              <Icon as={Images} size="md" className="text-primary-500" />
            </Button>
          </HStack>
        }
        className="relative z-30 bg-background-0"
      />

      {useSplitLayout ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <MediaPreview workflowId={workflowRecord.id} serverId={serverId as string} />
          </View>
          <View
            style={{
              width: panelWidth,
              borderLeftWidth: 1,
              borderLeftColor: theme === 'light' ? Colors.light.outline[50] : Colors.dark.outline[50],
            }}
          >
            {/* Panel Header */}
            <View className="flex-row items-center justify-between px-4 py-3 bg-background-0">
              <SheetTabToggle index={tabIndex} onChange={handleTabChange} />
              <HStack className="items-center" space="xs">
                {tabIndex === 1 && (
                  <Pressable
                    onPress={() => aiChatTabRef.current?.clearChat()}
                    className="rounded-lg p-2 active:bg-background-100"
                  >
                    <Icon as={Trash2} size="sm" className="text-typography-400" />
                  </Pressable>
                )}
                <GenerateActionButton onGenerate={handleGenerate} />
              </HStack>
            </View>
            {/* Panel Content */}
            <BottomSheetProvider isInSheet={false}>
              <View style={{ flex: 1 }}>
                {tabIndex === 0 ? (
                    <AdaptiveKeyboardAwareScrollView
                      ref={scrollRef}
                      bottomOffset={20}
                      contentContainerStyle={scrollContentStyle}
                      style={scrollStyle}
                    >
                      <NodesTabContent
                        nodes={nodes}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        serverId={serverId as string}
                        workflowId={workflowId as string}
                        theme={theme}
                        targetNodeId={targetNodeId}
                        sharedImageUri={sharedImageUri}
                        onOpenLayoutConfig={handleOpenConfig}
                      />
                    </AdaptiveKeyboardAwareScrollView>
                ) : (
                  <AIChatTab
                    ref={aiChatTabRef}
                    workflowId={workflowId as string}
                    serverId={serverId as string}
                    onRunWorkflow={handleGenerate}
                  />
                )}
              </View>
            </BottomSheetProvider>
          </View>
        </View>
      ) : (
        <>
          <MediaPreview workflowId={workflowRecord.id} serverId={serverId as string} />

          <BottomSheet
            ref={sheetRef}
            index={sharedImageUri ? 2 : 1}
            snapPoints={snapPoints}
            enableDynamicSizing={false}
            onChange={handleSheetChange}
            backgroundStyle={{
              backgroundColor: theme === 'light' ? Colors.light.background[0] : Colors.dark.background[0],
              borderWidth: 1,
              borderColor: theme === 'light' ? Colors.light.outline[50] : Colors.dark.outline[50],
            }}
            handleIndicatorStyle={{
              backgroundColor: theme === 'light' ? Colors.light.background[300] : Colors.dark.background[300],
              width: 48,
            }}
            handleStyle={{
              height: 32,
            }}
            keyboardBehavior="extend"
            keyboardBlurBehavior="restore"
          >
            {/* Sheet Header: toggle + contextual actions + generate button */}
            <View className="flex-row items-center justify-between px-4 pb-2 bg-background-0">
              <SheetTabToggle index={tabIndex} onChange={handleTabChange} />
              <HStack className="items-center" space="xs">
                {tabIndex === 1 && (
                  <Pressable
                    onPress={() => aiChatTabRef.current?.clearChat()}
                    className="rounded-lg p-2 active:bg-background-100"
                  >
                    <Icon as={Trash2} size="sm" className="text-typography-400" />
                  </Pressable>
                )}
                <GenerateActionButton onGenerate={handleGenerate} />
              </HStack>
            </View>

            {tabIndex === 0 ? (
              <NodesTabContent
                nodes={nodes}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                serverId={serverId as string}
                workflowId={workflowId as string}
                theme={theme}
                targetNodeId={targetNodeId}
                sharedImageUri={sharedImageUri}
                onOpenLayoutConfig={handleOpenConfig}
              />
            ) : (
              <AIChatTab
                ref={aiChatTabRef}
                workflowId={workflowId as string}
                serverId={serverId as string}
                onRunWorkflow={handleGenerate}
              />
            )}
          </BottomSheet>
        </>
      )}

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        serverId={serverId as string}
        workflowId={workflowRecord?.id}
        onSelectMedia={handleSelectHistoryMedia}
      />

      {/* UI Layout Customization Config Modal */}
      <Modal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)}>
        <ModalBackdrop />
        <ModalContent className="w-11/12 max-w-lg h-5/6 rounded-2xl bg-background-0">
          <ModalHeader className="px-4 py-3 border-b border-background-100 dark:border-background-800 flex-row justify-between items-center">
            <Text className="text-base font-bold text-typography-900">Configure UI Layout</Text>
            <Pressable onPress={() => setIsConfigOpen(false)} className="p-1 active:bg-background-100 rounded-full">
              <Icon as={X} size="sm" className="text-typography-500" />
            </Pressable>
          </ModalHeader>
          <ModalBody className="p-0 flex-1">
            <View className="flex-1">
              <View className="px-4 py-2.5 bg-background-50 dark:bg-background-900">
                <Text className="text-xs text-typography-500 leading-relaxed">
                  Toggle visibility to keep the screen clean. Tap arrows to rearrange node forms cosmetically.
                </Text>
              </View>
              <ScrollView className="flex-1 p-4">
                {tempOrder.map((nodeId, index) => {
                  const node = workflowRecord?.data[nodeId];
                  if (!node) return null;
                  const isVisible = tempVisibleIds.includes(nodeId);
                  const title = node._meta?.title || node.class_type;

                  return (
                    <HStack
                      key={nodeId}
                      className="items-center justify-between py-2.5 border-b border-background-100 dark:border-background-800/40"
                    >
                      <HStack space="xs" className="flex-1 items-center mr-4">
                        <Pressable onPress={() => toggleVisibility(nodeId)} className="p-1 mr-1">
                          <Icon
                            as={isVisible ? Eye : EyeOff}
                            size="sm"
                            className={isVisible ? 'text-primary-500' : 'text-typography-300'}
                          />
                        </Pressable>
                        <VStack className="flex-1">
                          <Text className="text-sm font-semibold text-typography-900" numberOfLines={1}>
                            {title}
                          </Text>
                          <Text className="text-2xs text-typography-400">
                            ID: {nodeId} • {node.class_type}
                          </Text>
                        </VStack>
                      </HStack>
                      <HStack space="xs" className="items-center">
                        <Switch
                          size="sm"
                          value={isVisible}
                          onValueChange={() => toggleVisibility(nodeId)}
                        />
                        <HStack space="2xs" className="ml-2">
                          <Pressable
                            disabled={index === 0}
                            onPress={() => moveNode(index, 'up')}
                            className={`p-1.5 rounded-lg active:bg-background-100 ${index === 0 ? 'opacity-30' : ''}`}
                          >
                            <Icon as={ArrowUp} size="sm" className="text-typography-600" />
                          </Pressable>
                          <Pressable
                            disabled={index === tempOrder.length - 1}
                            onPress={() => moveNode(index, 'down')}
                            className={`p-1.5 rounded-lg active:bg-background-100 ${index === tempOrder.length - 1 ? 'opacity-30' : ''}`}
                          >
                            <Icon as={ArrowDown} size="sm" className="text-typography-600" />
                          </Pressable>
                        </HStack>
                      </HStack>
                    </HStack>
                  );
                })}
              </ScrollView>
              
              <HStack space="sm" className="p-4 border-t border-background-100 dark:border-background-800">
                <Button
                  onPress={handleResetConfig}
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl border-primary-500"
                >
                  <ButtonText className="text-primary-500 font-bold">Reset</ButtonText>
                </Button>
                <Button
                  onPress={handleSaveConfig}
                  size="sm"
                  className="flex-1 rounded-xl bg-primary-500"
                >
                  <ButtonText className="text-white">Save Settings</ButtonText>
                </Button>
              </HStack>
            </View>
          </ModalBody>
        </ModalContent>
      </Modal>
    </View>
  );
}

export default function RunWorkflowScreen() {
  return (
    <GenerationProvider>
      <RunWorkflowScreenContent />
    </GenerationProvider>
  );
}
