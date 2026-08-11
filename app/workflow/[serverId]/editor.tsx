import { AppBar } from '@/components/layout/app-bar';
import { Button, ButtonText } from '@/components/ui/button';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { getRawWorkflow, saveWorkflowToServer } from '@/services/comfy-api';
import { buildServerUrl } from '@/services/network';
import { showToast } from '@/utils/toast';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

export default function WorkflowEditorScreen() {
  const { serverId, filename, mode } = useLocalSearchParams<{
    serverId: string;
    filename?: string;
    mode: 'edit' | 'validation';
  }>();
  const router = useRouter();
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const [url, setUrl] = useState('');
  const [workflowJson, setWorkflowJson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    const initEditor = async () => {
      if (!server) {
        showToast.error('Error', 'Server configuration not found.');
        router.back();
        return;
      }

      try {
        // Build WebView URL
        let webViewUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/');
        if (server.token) {
          webViewUrl += `?token=${encodeURIComponent(server.token)}`;
        }
        setUrl(webViewUrl);

        // Load Workflow JSON
        if (mode === 'edit' && filename) {
          const raw = await getRawWorkflow(serverId, filename);
          setWorkflowJson(raw);
        } else if (mode === 'validation') {
          const raw = useWorkflowStore.getState().tempValidationWorkflow;
          if (raw) {
            setWorkflowJson(raw);
          } else {
            throw new Error('No validation workflow found.');
          }
        } else {
          throw new Error('Invalid editor configuration.');
        }
      } catch (err: any) {
        console.error('[WorkflowEditorScreen] Load error:', err);
        showToast.error('Load Error', err.message || 'Failed to initialize workflow data.');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    initEditor();
  }, [serverId, filename, mode, server]);

  const handleLoadEnd = () => {
    if (!workflowJson || !webViewRef.current) return;

    // Inject graph data when ComfyUI is ready
    const injectedJs = `
      (function() {
        const workflowData = ${JSON.stringify(workflowJson)};
        function tryLoad() {
          if (window.app && window.app.loadGraphData) {
            try {
              window.app.loadGraphData(workflowData);
              return true;
            } catch (err) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: 'Failed to load graph: ' + err.message
              }));
              return true;
            }
          }
          return false;
        }

        if (!tryLoad()) {
          const interval = setInterval(function() {
            if (tryLoad()) {
              clearInterval(interval);
            }
          }, 100);
          setTimeout(function() {
            clearInterval(interval);
          }, 15000);
        }
      })();
    `;
    webViewRef.current.injectJavaScript(injectedJs);
  };

  const handleMessage = async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'save_workflow') {
        const editedWorkflow = message.workflow;

        if (mode === 'edit' && filename) {
          await saveWorkflowToServer(serverId, filename, editedWorkflow);
          showToast.success('Saved', 'Workflow saved successfully.');
        } else if (mode === 'validation') {
          useWorkflowStore.getState().setTempValidationWorkflow(editedWorkflow);
          showToast.success('Updated', 'Validation workflow updated.');
        }
        router.back();
      } else if (message.type === 'error') {
        showToast.error('Editor Error', message.message || 'An unknown error occurred.');
        setSaving(false);
      }
    } catch (err: any) {
      console.error('[WorkflowEditorScreen] Message error:', err);
      showToast.error('Save Failed', err.message || 'Failed to save workflow.');
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!webViewRef.current) return;
    setSaving(true);

    // Trigger serialization in ComfyUI frontend
    const saveJs = `
      (function() {
        if (window.app && window.app.graph) {
          try {
            const data = window.app.graph.serialize();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'save_workflow',
              workflow: data
            }));
          } catch (err) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: 'Failed to serialize graph: ' + err.message
            }));
          }
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: 'ComfyUI graph not found'
          }));
        }
      })();
    `;
    webViewRef.current.injectJavaScript(saveJs);
  };

  const renderContent = () => {
    if (loading || !url || !workflowJson) {
      return (
        <View className="flex-1 items-center justify-center bg-background-0">
          <RotatingSpinner size="sm" preset="subtle" />
          <Text className="mt-3 text-sm font-medium text-typography-500">Loading editor...</Text>
        </View>
      );
    }

    return (
      <View className="flex-1 relative bg-background-0">
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          className="flex-1"
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onLoadEnd={handleLoadEnd}
          onMessage={handleMessage}
          style={{ backgroundColor: 'transparent' }}
        />
        {saving && (
          <View className="absolute inset-0 items-center justify-center bg-black/30">
            <View className="rounded-xl bg-background-50 px-5 py-4 items-center shadow-lg">
              <ActivityIndicator size="small" />
              <Text className="mt-2 text-xs font-semibold text-typography-800">Saving changes...</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background-0">
      <AppBar
        title={mode === 'edit' ? 'Edit Workflow' : 'Validate Workflow'}
        showBack
        centerTitle={true}
        rightElement={
          !loading && (
            <Button
              size="sm"
              variant="solid"
              className="rounded-full bg-primary-500"
              onPress={handleSave}
              disabled={saving}
            >
              <ButtonText className="text-white">
                {mode === 'edit' ? 'Save' : 'Apply'}
              </ButtonText>
            </Button>
          )
        }
      />
      {renderContent()}
    </View>
  );
}
