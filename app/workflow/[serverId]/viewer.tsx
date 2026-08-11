import { AppBar } from '@/components/layout/app-bar';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { getRawWorkflow } from '@/services/comfy-api';
import { showToast } from '@/utils/toast';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

export default function WorkflowViewerScreen() {
  const { serverId, filename, mode } = useLocalSearchParams<{
    serverId: string;
    filename?: string;
    mode: 'edit' | 'validation';
  }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [workflowJson, setWorkflowJson] = useState<any>(null);
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));

  useEffect(() => {
    const initViewer = async () => {
      try {
        if (mode === 'edit' && filename) {
          if (!server) {
            throw new Error('Server configurations not found.');
          }
          // Fetch raw saved workflow from server
          const data = await getRawWorkflow(serverId, filename);
          setWorkflowJson(data);
        } else if (mode === 'validation') {
          const raw = useWorkflowStore.getState().tempValidationWorkflow;
          if (raw) {
            setWorkflowJson(raw);
          } else {
            throw new Error('No validation workflow found.');
          }
        } else {
          throw new Error('Invalid viewer configuration.');
        }
      } catch (err: any) {
        console.error('[WorkflowViewerScreen] Load error:', err);
        showToast.error('Load Error', err.message || 'Failed to initialize workflow viewer.');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    initViewer();
  }, [serverId, filename, mode, server]);

  const getHtmlContent = () => {
    if (!workflowJson) return '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <style>
          body {
            background-color: #0f0f11;
            color: #e2e8f0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            overflow: hidden;
            width: 100vw;
            height: 100vh;
            user-select: none;
          }
          #viewport {
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            transform-origin: 0 0;
            cursor: grab;
          }
          .node {
            position: absolute;
            background: #18181b;
            border: 1px solid #27272a;
            border-radius: 12px;
            min-width: 180px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5);
            font-size: 11px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .node-header {
            font-weight: 600;
            background: #27272a;
            color: #f4f4f5;
            padding: 8px 12px;
            font-size: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1.5px solid #3f3f46;
          }
          .node-body {
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .port-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .port {
            display: flex;
            align-items: center;
            color: #a1a1aa;
            font-size: 10px;
          }
          .port.input {
            justify-content: flex-start;
            text-align: left;
          }
          .port.output {
            justify-content: flex-end;
            text-align: right;
          }
          .port-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #3b82f6;
            display: inline-block;
            margin: 0 6px;
          }
          .widget-val {
            color: #3b82f6;
            font-family: monospace;
            background: #09090b;
            padding: 2px 6px;
            border-radius: 4px;
            margin-top: 2px;
            word-break: break-all;
            max-height: 48px;
            overflow: hidden;
            font-size: 9px;
          }
          svg {
            position: absolute;
            top: 0;
            left: 0;
            width: 99999px;
            height: 99999px;
            pointer-events: none;
            z-index: 0;
          }
          path {
            fill: none;
            stroke: #3b82f6;
            stroke-width: 2.5px;
            opacity: 0.65;
          }
          #controls {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #18181b;
            border: 1px solid #27272a;
            border-radius: 20px;
            padding: 8px 16px;
            display: flex;
            gap: 12px;
            z-index: 100;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          }
          .btn {
            color: #a1a1aa;
            background: none;
            border: none;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
          }
          .btn:active {
            color: #ffffff;
          }
        </style>
      </head>
      <body>
        <div id="viewport">
          <svg id="svg-canvas"></svg>
          <div id="nodes-container"></div>
        </div>
        <div id="controls">
          <button class="btn" onclick="zoomIn()">+</button>
          <button class="btn" onclick="zoomOut()">-</button>
          <button class="btn" onclick="resetZoom()">1:1</button>
        </div>

        <script>
          const rawData = ${JSON.stringify(workflowJson)};
          const viewport = document.getElementById('viewport');
          const svg = document.getElementById('svg-canvas');
          const container = document.getElementById('nodes-container');

          let data = rawData;
          if (rawData && !rawData.nodes && typeof rawData === 'object') {
            // Convert API execution format to mock visual graph format
            const mockNodes = [];
            const mockLinks = [];
            let linkId = 1;
            
            Object.entries(rawData).forEach(([id, nodeData]) => {
              const nodeInputs = [];
              if (nodeData.inputs) {
                Object.entries(nodeData.inputs).forEach(([name, value]) => {
                  if (Array.isArray(value) && value.length === 2) {
                    nodeInputs.push({ name, type: 'link', link: linkId });
                    mockLinks.push([
                      linkId,
                      value[0].toString(),
                      value[1],
                      id,
                      nodeInputs.length - 1
                    ]);
                    linkId++;
                  } else {
                    nodeInputs.push({ name, type: 'value', value: value });
                  }
                });
              }
              
              mockNodes.push({
                id,
                type: nodeData.class_type,
                title: nodeData._meta?.title || nodeData.class_type,
                inputs: nodeInputs.filter(i => i.type === 'link'),
                widgets_values: nodeInputs.filter(i => i.type !== 'link').map(i => i.name + ': ' + i.value),
                outputs: [{ name: 'output' }],
              });
            });
            
            data = { nodes: mockNodes, links: mockLinks };
          }

          let zoom = 0.7;
          let panX = window.innerWidth / 4;
          let panY = window.innerHeight / 4;

          function updateTransform() {
            viewport.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoom + ')';
          }

          // Draw nodes
          const nodesMap = {};
          if (data && data.nodes) {
            data.nodes.forEach((node, idx) => {
              const el = document.createElement('div');
              el.className = 'node';
              
              // Fallback coordinates if node.pos is missing (e.g. from converted API format)
              const x = node.pos ? node.pos[0] : (idx % 3) * 240 + 50;
              const y = node.pos ? node.pos[1] : Math.floor(idx / 3) * 240 + 50;
              const w = node.size ? node.size[0] : 200;
              const h = node.size ? node.size[1] : 140;
              
              el.style.left = x + 'px';
              el.style.top = y + 'px';
              el.style.width = w + 'px';
              
              nodesMap[node.id.toString()] = { node, el, x, y, w, h };

              let inputsHtml = '';
              if (node.inputs) {
                node.inputs.forEach((input) => {
                  inputsHtml += '<div class="port input"><span class="port-dot"></span>' + input.name + '</div>';
                });
              }

              let outputsHtml = '';
              if (node.outputs) {
                node.outputs.forEach(output => {
                  outputsHtml += '<div class="port output">' + output.name + '<span class="port-dot"></span></div>';
                });
              }

              let widgetsHtml = '';
              if (node.widgets_values) {
                node.widgets_values.forEach(val => {
                  if (val !== undefined && val !== null && val !== '') {
                    widgetsHtml += '<div class="widget-val">' + val + '</div>';
                  }
                });
              }

              el.innerHTML = \`
                <div class="node-header">
                  <span>\${node.title || node.type}</span>
                  <span style="opacity:0.4; font-size:9px;">#\${node.id}</span>
                </div>
                <div class="node-body">
                  \${inputsHtml ? '<div class="port-list">' + inputsHtml + '</div>' : ''}
                  \${outputsHtml ? '<div class="port-list">' + outputsHtml + '</div>' : ''}
                  \${widgetsHtml}
                </div>
              \`;

              container.appendChild(el);
            });
          }

          // Draw links
          if (data && data.links) {
            data.links.forEach(link => {
              const [linkId, originId, originIdx, targetId, targetIdx] = link;
              const origin = nodesMap[originId.toString()];
              const target = nodesMap[targetId.toString()];
              if (origin && target) {
                const startX = origin.x + origin.w;
                const startY = origin.y + 40 + (originIdx * 16);
                const endX = target.x;
                const endY = target.y + 40 + (targetIdx * 16);

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const cpOffset = Math.max(80, Math.abs(endX - startX) * 0.5);
                const d = 'M ' + startX + ' ' + startY + ' C ' + (startX + cpOffset) + ' ' + startY + ', ' + (endX - cpOffset) + ' ' + endY + ', ' + endX + ' ' + endY;
                path.setAttribute('d', d);
                svg.appendChild(path);
              }
            });
          }

          // Mouse/Touch Pan & Zoom dragging handlers
          let isDragging = false;
          let startX, startY;

          window.addEventListener('mousedown', e => {
            if (e.target.closest('.node') || e.target.closest('#controls')) return;
            isDragging = true;
            viewport.style.cursor = 'grabbing';
            startX = e.clientX - panX;
            startY = e.clientY - panY;
          });

          window.addEventListener('mousemove', e => {
            if (!isDragging) return;
            panX = e.clientX - startX;
            panY = e.clientY - startY;
            updateTransform();
          });

          window.addEventListener('mouseup', () => {
            isDragging = false;
            viewport.style.cursor = 'grab';
          });

          // Touch support for mobile devices
          window.addEventListener('touchstart', e => {
            if (e.target.closest('.node') || e.target.closest('#controls')) return;
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX - panX;
            startY = touch.clientY - panY;
          });

          window.addEventListener('touchmove', e => {
            if (!isDragging) return;
            const touch = e.touches[0];
            panX = touch.clientX - startX;
            panY = touch.clientY - startY;
            updateTransform();
          });

          window.addEventListener('touchend', () => {
            isDragging = false;
          });

          function zoomIn() {
            zoom = Math.min(3, zoom + 0.1);
            updateTransform();
          }

          function zoomOut() {
            zoom = Math.max(0.1, zoom - 0.1);
            updateTransform();
          }

          function resetZoom() {
            zoom = 0.7;
            panX = window.innerWidth / 4;
            panY = window.innerHeight / 4;
            updateTransform();
          }

          updateTransform();
        </script>
      </body>
      </html>
    `;
  };

  return (
    <View className="flex-1 bg-background-0">
      <AppBar
        title={mode === 'edit' ? 'View Workflow (Lite)' : 'Validate Workflow (Lite)'}
        showBack
        centerTitle={true}
      />
      {loading ? (
        <View className="flex-1 items-center justify-center bg-background-0">
          <RotatingSpinner size="sm" preset="subtle" />
          <Text className="mt-3 text-sm font-medium text-typography-500">Loading graph...</Text>
        </View>
      ) : (
        <WebView
          source={{ html: getHtmlContent() }}
          className="flex-1"
          style={{ backgroundColor: '#0f0f11' }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      )}
    </View>
  );
}
