import { BottomSheetFormInput } from '@/components/self-ui/form-input/bottom-sheet-form-input';
import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { useServersStore } from '@/features/server/stores/server-store';
import { Server } from '@/features/server/types';
import { parseServerUrl, validateHost, validatePort } from '@/services/network';
import { useResolvedTheme } from '@/store/theme';
import { Colors } from '@/constants/Colors';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { ChevronDown } from 'lucide-react-native';
import { Pressable } from 'react-native';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetItem,
  ActionsheetItemText,
} from '@/components/ui/actionsheet';
import * as Clipboard from 'expo-clipboard';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AddServerModalProps {
  // No isOpen or onClose needed
}

export interface AddServerModalRef {
  present: () => void;
}

const MAX_NAME_LENGTH = 30;

export const AddServerModal = forwardRef<AddServerModalRef, AddServerModalProps>(
  (props, ref) => {
    const theme = useResolvedTheme();
    const isDarkMode = theme === 'dark';
    const insets = useSafeAreaInsets();
    const addServer = useServersStore((state) => state.addServer);
    const [name, setName] = React.useState('');
    const [host, setHost] = React.useState('');
    const [port, setPort] = React.useState('8188');
    const [useSSL, setUseSSL] = React.useState<Server['useSSL']>('Auto');
    const [token, setToken] = React.useState('');
    const [nameError, setNameError] = React.useState('');
    const [hostError, setHostError] = React.useState('');
    const [portError, setPortError] = React.useState('');
    const [isProtocolSheetOpen, setIsProtocolSheetOpen] = React.useState(false);

    const bottomSheetModalRef = useRef<BottomSheetModal>(null);

    useImperativeHandle(ref, () => ({
      present: () => {
        checkClipboard();
        bottomSheetModalRef.current?.present();
      },
    }));

    useEffect(() => {
      const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
        bottomSheetModalRef.current?.snapToIndex(0);
      });
      return () => hideSubscription.remove();
    }, []);

    const checkClipboard = async () => {
      try {
        const text = await Clipboard.getStringAsync();
        if (!text) return;

        const parsed = parseServerUrl(text);
        if (parsed) {
          setHost(parsed.host);
          setPort(parsed.port);
          setUseSSL(parsed.useSSL);
          const suggestedName = parsed.host.split('.')[0];
          if (suggestedName && suggestedName.length <= MAX_NAME_LENGTH) {
            setName(suggestedName);
          } else {
            setName('');
          }
        } else {
          setName('');
          setHost('');
          setPort('8188');
          setUseSSL('Auto');
          setToken('');
        }
      } catch (error) {
        // Silently fail
      }
    };

    const validateName = (value: string) => {
      if (value.length === 0) {
        return 'Name is required';
      }
      if (value.length > MAX_NAME_LENGTH) {
        return `Name must be less than ${MAX_NAME_LENGTH} characters`;
      }
      return '';
    };

    const handleSave = () => {
      const newNameError = validateName(name);
      const newHostError = validateHost(host);
      const newPortError = validatePort(port);

      setNameError(newNameError);
      setHostError(newHostError);
      setPortError(newPortError);

      if (newNameError || newHostError || newPortError) {
        return;
      }

      addServer({
        name,
        host,
        port: port ? parseInt(port, 10) : 0,
        useSSL,
        token: token || undefined,
      });
      handleClose();
    };

    const handleClose = useCallback(() => {
      setName('');
      setHost('');
      setPort('8188');
      setUseSSL('Auto');
      setNameError('');
      setHostError('');
      setPortError('');
      setToken('');
      bottomSheetModalRef.current?.dismiss();
    }, []);

    return (
      <ThemedBottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={['70%']}
        onDismiss={handleClose}
        topInset={insets.top}
        enablePanDownToClose={true}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetScrollView
          style={{
            paddingHorizontal: 16,
          }}
        >
          <VStack space="md" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="pb-2">
              <Text className="text-lg font-semibold text-primary-500">Add Server</Text>
            </View>

            <BottomSheetFormInput
              title="Name"
              error={nameError}
              value={name}
              onChangeText={(value: string) => {
                setName(value);
                setNameError('');
              }}
              placeholder="Server name"
              maxLength={MAX_NAME_LENGTH}
            />

            <VStack space="xs">
              <Text className="text-sm font-medium text-typography-600">Host</Text>
              <HStack space="xs" className="items-center">
                <Pressable
                  onPress={() => setIsProtocolSheetOpen(true)}
                  style={{
                    height: 48,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: isDarkMode ? Colors.dark.background[50] : Colors.light.background[100],
                  }}
                >
                  <HStack space="2xs" className="items-center">
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: isDarkMode ? Colors.dark.typography[800] : Colors.light.typography[950],
                      }}
                    >
                      {useSSL === 'Always' ? 'https://' : useSSL === 'Never' ? 'http://' : 'auto://'}
                    </Text>
                    <Icon as={ChevronDown} size="xs" className="text-typography-400" />
                  </HStack>
                </Pressable>
                <View className="flex-1">
                  <BottomSheetFormInput
                    placeholder="Host or IP address"
                    value={host}
                    onChangeText={(value: string) => {
                      setHost(value);
                      setHostError('');
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </HStack>
              {hostError ? (
                <Text className="text-xs text-error-500 mt-1">{hostError}</Text>
              ) : null}
            </VStack>

            <BottomSheetFormInput
              title="Port"
              error={portError}
              value={port}
              onChangeText={(value: string) => {
                setPort(value);
                setPortError('');
              }}
              placeholder="Port number (Optional, defaults to 8188)"
              keyboardType="numeric"
            />

            <BottomSheetFormInput
              title="Authorization Token (Optional)"
              value={token}
              onChangeText={(value: string) => setToken(value)}
              placeholder="Enter token (without 'Bearer')"
              secureTextEntry={true}
            />

            <HStack space="sm" className="mt-3">
              <Button variant="outline" onPress={handleClose} className="flex-1 rounded-md bg-background-100 py-2">
                <ButtonText className="text-primary-400">Cancel</ButtonText>
              </Button>
              <Button variant="solid" onPress={handleSave} className="flex-1 rounded-md bg-primary-500 py-2">
                <ButtonText className="text-background-0">Add</ButtonText>
              </Button>
            </HStack>
          </VStack>
        </BottomSheetScrollView>

        <Actionsheet isOpen={isProtocolSheetOpen} onClose={() => setIsProtocolSheetOpen(false)}>
          <ActionsheetBackdrop />
          <ActionsheetContent>
            <ActionsheetItem onPress={() => { setUseSSL('Never'); setIsProtocolSheetOpen(false); }}>
              <ActionsheetItemText>http:// (Standard)</ActionsheetItemText>
            </ActionsheetItem>
            <ActionsheetItem onPress={() => { setUseSSL('Always'); setIsProtocolSheetOpen(false); }}>
              <ActionsheetItemText>https:// (Secure)</ActionsheetItemText>
            </ActionsheetItem>
            <ActionsheetItem onPress={() => { setUseSSL('Auto'); setIsProtocolSheetOpen(false); }}>
              <ActionsheetItemText>auto:// (Auto Detect)</ActionsheetItemText>
            </ActionsheetItem>
          </ActionsheetContent>
        </Actionsheet>
      </ThemedBottomSheetModal>
    );
  },
);

AddServerModal.displayName = 'AddServerModal';
