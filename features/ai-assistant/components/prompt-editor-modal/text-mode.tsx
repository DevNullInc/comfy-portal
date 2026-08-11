import { StyledTextarea } from '@/components/self-ui/styled-textarea';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import React, { useState } from 'react';
import { ScrollView, Pressable } from 'react-native';
import { useSettingsStore } from '@/store/settings-store';

interface TextModeProps {
  initialValue: string;
  onChange: (value: string) => void;
  inputKey: number;
}

export function TextMode({ initialValue, onChange, inputKey }: TextModeProps) {
  const savedPrompts = useSettingsStore((s) => s.savedPrompts);
  const [text, setText] = useState(initialValue);

  const handleAppend = (content: string) => {
    const space = text.length > 0 && !text.endsWith(' ') ? ' ' : '';
    const newText = text + space + content;
    setText(newText);
    onChange(newText);
  };

  return (
    <View className="flex-1">
      <Text className="mb-2 text-sm font-medium text-typography-600">Prompt</Text>
      
      {savedPrompts && savedPrompts.length > 0 && (
        <View className="mb-3">
          <Text className="mb-1.5 text-xs font-semibold text-typography-400">Quick Inject Saved Prompts:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {savedPrompts.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => handleAppend(p.content)}
                className="mr-2 rounded-full bg-primary-50 px-3 py-1.5 border border-primary-200 active:bg-primary-100"
              >
                <Text className="text-xs font-semibold text-primary-600">{p.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <StyledTextarea
        key={inputKey}
        placeholder="Enter your prompt here..."
        value={text}
        onChangeText={(val) => {
          setText(val);
          onChange(val);
        }}
        minHeight={240}
      />
    </View>
  );
}
