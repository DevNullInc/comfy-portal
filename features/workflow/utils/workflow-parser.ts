import { type Node, type Workflow } from "@/features/workflow/types";

// Common node widget definitions for compiler fallback mapping
const COMMON_WIDGETS_MAP: Record<string, string[]> = {
  'KSampler': ['seed', 'control_after_generate', 'steps', 'cfg', 'sampler_name', 'scheduler', 'denoise'],
  'KSamplerAdvanced': ['add_noise', 'noise_seed', 'control_after_generate', 'steps', 'cfg', 'sampler_name', 'scheduler', 'start_at_step', 'end_at_step', 'return_with_leftover_noise'],
  'CheckpointLoaderSimple': ['ckpt_name'],
  'LoraLoader': ['lora_name', 'strength_model', 'strength_clip'],
  'CLIPTextEncode': ['text'],
  'EmptyLatentImage': ['width', 'height', 'batch_size'],
  'SaveImage': ['filename_prefix'],
  'LoadImage': ['image', 'upload'],
  'CLIPLoader': ['clip_name', 'type'],
  'DualCLIPLoader': ['clip_name1', 'clip_name2', 'type'],
  'UNETLoader': ['unet_name', 'weight_dtype'],
  'VAELoader': ['vae_name'],
  'FluxGuidance': ['guidance'],
  'BasicScheduler': ['scheduler', 'steps', 'denoise'],
  'BasicGuider': ['cfg'],
  'RandomNoise': ['noise_seed'],
  'ModelSamplingFlux': ['max_shift', 'base_shift', 'width', 'height'],
  'PrimitiveStringMultiline': ['string'],
};

/**
 * Compiles a visual workflow graph format (LiteGraph) into ComfyUI's flat API execution format
 */
export function compileVisualGraphToApi(visualGraph: any): any {
  if (!visualGraph || typeof visualGraph !== 'object') return {};
  if (!visualGraph.nodes || !Array.isArray(visualGraph.nodes)) {
    // If it's already in API format, return as-is
    return visualGraph;
  }

  const apiFormat: any = {};
  const linksMap = new Map<number, any>(); // linkId -> [originNodeId, originOutputIndex]

  if (visualGraph.links && Array.isArray(visualGraph.links)) {
    for (const link of visualGraph.links) {
      if (Array.isArray(link) && link.length >= 4) {
        const [linkId, originNodeId, originOutputIndex, targetNodeId, targetInputIndex] = link;
        linksMap.set(linkId, [originNodeId.toString(), originOutputIndex]);
      }
    }
  }

  const objectInfo = typeof global !== 'undefined' ? (global as any).objectInfo : null;

  for (const node of visualGraph.nodes) {
    if (!node || !node.id) continue;
    const nodeIdStr = node.id.toString();
    const nodeApi: any = {
      inputs: {},
      class_type: node.type || '',
      _meta: { title: node.title || node.type || '' },
    };

    // Determine widgets parameters list
    let widgetInputNames: string[] = [];
    const def = objectInfo?.[node.type];
    if (def) {
      const requiredInputs = def.input?.required ? Object.entries(def.input.required) : [];
      const optionalInputs = def.input?.optional ? Object.entries(def.input.optional) : [];
      const allInputDefs = [...requiredInputs, ...optionalInputs];

      for (const [name, typeInfo] of allInputDefs) {
        const type = typeInfo[0];
        const isLink = Array.isArray(type) ? false : ['MODEL', 'LATENT', 'VAE', 'CONDITIONING', 'IMAGE', 'MASK', 'CLIP', 'STYLE'].includes(type.toUpperCase());
        if (!isLink) {
          widgetInputNames.push(name);
        }
      }
    } else {
      // Use fallback COMMON_WIDGETS_MAP
      widgetInputNames = COMMON_WIDGETS_MAP[node.type] || [];
    }

    // Map widget values from node.widgets_values
    const widgetsValues = node.widgets_values || [];
    for (let i = 0; i < widgetInputNames.length; i++) {
      if (i < widgetsValues.length) {
        nodeApi.inputs[widgetInputNames[i]] = widgetsValues[i];
      }
    }

    // Fallback generic mapping for excess widgets_values
    if (widgetsValues.length > widgetInputNames.length) {
      for (let i = widgetInputNames.length; i < widgetsValues.length; i++) {
        nodeApi.inputs[`widget_${i}`] = widgetsValues[i];
      }
    }

    // Map connected link inputs
    if (node.inputs && Array.isArray(node.inputs)) {
      for (const input of node.inputs) {
        if (input.link) {
          const linkedOutput = linksMap.get(input.link);
          if (linkedOutput) {
            nodeApi.inputs[input.name] = linkedOutput;
          }
        }
      }
    }

    apiFormat[nodeIdStr] = nodeApi;
  }

  return apiFormat;
}

/**
 * Parse a JSON template into a Workflow type
 * @param template - The JSON template to parse
 * @returns A Workflow object
 */
export function parseWorkflowTemplate(template: Record<string, any>): Workflow {
  const workflow: Workflow = {};
  
  // Compile visual graph automatically to API format if needed
  const apiData = compileVisualGraphToApi(template);

  for (const [nodeId, nodeData] of Object.entries(apiData)) {
    if (typeof nodeData !== 'object' || nodeData === null) {
      throw new Error(`Invalid node data for node ${nodeId}`);
    }

    const node: Node = {
      id: nodeId,
      inputs: (nodeData as any).inputs || {},
      class_type: (nodeData as any).class_type || '',
      _meta: (nodeData as any)._meta,
    };

    workflow[nodeId] = node;
  }

  return workflow;
}

/**
 * Convert a Workflow object back to JSON format
 * @param workflow - The Workflow object to convert
 * @returns A JSON representation of the workflow
 */
export function workflowToJson(workflow: Workflow): Record<string, any> {
  const json: Record<string, any> = {};

  for (const [nodeId, node] of Object.entries(workflow)) {
    json[nodeId] = {
      inputs: node.inputs,
      class_type: node.class_type,
      _meta: node._meta,
    };
  }

  return json;
}
