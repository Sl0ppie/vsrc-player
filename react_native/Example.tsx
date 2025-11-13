/**
 * VSRCPlayer React Native - Example Usage
 * 
 * This file demonstrates various ways to use the VSRCPlayer component
 * in a React Native application.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Button,
  StyleSheet,
  Text,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { VSRCPlayer, VSRCPlayerRef } from './index';

/**
 * Example 1: Basic VOD Player
 */
export function BasicVODExample() {
  const playerRef = useRef<VSRCPlayerRef>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Basic VOD Example</Text>
      <VSRCPlayer
        ref={playerRef}
        options={{
          type: 'vod',
          mediaId: 'my-video-123',
        }}
        onReady={() => console.log('Player is ready!')}
        onError={(error) => console.error('Player error:', error)}
        style={styles.player}
      />
      <View style={styles.controls}>
        <Button title="Play" onPress={() => playerRef.current?.play()} />
        <Button title="Pause" onPress={() => playerRef.current?.pause()} />
      </View>
    </View>
  );
}

/**
 * Example 2: Live Streaming with Probing
 */
export function LiveStreamExample() {
  const [status, setStatus] = useState('Initializing...');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Streaming Example</Text>
      <Text style={styles.status}>{status}</Text>
      <VSRCPlayer
        options={{
          type: 'live',
          mediaId: 'my-live-stream-456',
          probeInterval: 5000,
          maxProbeAttempts: 12,
        }}
        onReady={() => setStatus('Player ready')}
        onProbeSuccess={() => setStatus('Stream found! Starting playback...')}
        onProbeFailed={() => setStatus('Stream not available')}
        onError={(error) => setStatus(`Error: ${error.message || error}`)}
        style={styles.player}
      />
    </View>
  );
}

/**
 * Example 3: Player with Full Controls
 */
export function FullControlsExample() {
  const playerRef = useRef<VSRCPlayerRef>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const handleSeek = (seconds: number) => {
    playerRef.current?.seek(seconds);
    setCurrentTime(seconds);
  };

  const handleVolumeChange = (level: number) => {
    playerRef.current?.setVolume(level);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Full Controls Example</Text>
      <VSRCPlayer
        ref={playerRef}
        options={{
          type: 'vod',
          mediaId: 'my-video-123',
          vhs: {
            limitRenditionByPlayerDimensions: true,
            enableLowInitialPlaylist: true,
            useDevicePixelRatio: false,
            bandwidth: 5000000, // 5 Mbps
          },
        }}
        onReady={() => console.log('Player ready')}
        style={styles.player}
      />
      
      <View style={styles.controlsGrid}>
        <View style={styles.controlRow}>
          <Text style={styles.label}>Playback:</Text>
          <Button title="Play" onPress={() => playerRef.current?.play()} />
          <Button title="Pause" onPress={() => playerRef.current?.pause()} />
        </View>
        
        <View style={styles.controlRow}>
          <Text style={styles.label}>Seek:</Text>
          <Button title="10s" onPress={() => handleSeek(10)} />
          <Button title="30s" onPress={() => handleSeek(30)} />
          <Button title="60s" onPress={() => handleSeek(60)} />
        </View>
        
        <View style={styles.controlRow}>
          <Text style={styles.label}>Volume:</Text>
          <Button title="0%" onPress={() => handleVolumeChange(0)} />
          <Button title="50%" onPress={() => handleVolumeChange(0.5)} />
          <Button title="100%" onPress={() => handleVolumeChange(1)} />
        </View>
      </View>
    </View>
  );
}

/**
 * Example 4: Live Stream with Chat
 */
export function LiveStreamWithChatExample() {
  const playerRef = useRef<VSRCPlayerRef>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatConnected, setChatConnected] = useState(false);

  const handleSendMessage = () => {
    playerRef.current?.sendChatMessage('Hello from React Native!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Stream with Chat</Text>
      <Text style={styles.status}>
        Chat: {chatConnected ? 'Connected' : 'Disconnected'}
      </Text>
      
      <VSRCPlayer
        ref={playerRef}
        options={{
          type: 'live',
          mediaId: 'video-456',
          chat: {
            serverUrl: 'ws://localhost:8080',
            username: 'ReactNativeUser',
            colors: {
              background: '#1f1f1f',
              inputBackground: '#2a2a2a',
              userMessage: '#0e4c92',
              otherMessage: '#2a2a2a',
              systemMessage: '#666',
              text: '#ffffff',
              border: '#3a3a3a',
            },
          },
        }}
        onChatMessage={(data) => {
          console.log('New message:', data);
          setMessages((prev) => [...prev, data]);
        }}
        onChatConnect={() => {
          console.log('Connected to chat');
          setChatConnected(true);
        }}
        onChatDisconnect={() => {
          console.log('Disconnected from chat');
          setChatConnected(false);
        }}
        style={styles.player}
      />
      
      <View style={styles.controls}>
        <Button 
          title="Send Test Message" 
          onPress={handleSendMessage}
          disabled={!chatConnected}
        />
      </View>
      
      <View style={styles.messageList}>
        <Text style={styles.label}>Recent Messages:</Text>
        {messages.slice(-5).map((msg, idx) => (
          <Text key={idx} style={styles.message}>
            {msg.username}: {msg.message}
          </Text>
        ))}
      </View>
    </View>
  );
}

/**
 * Example 5: Debug Mode (Local Development)
 */
export function DebugModeExample() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug Mode Example</Text>
      <Text style={styles.status}>
        Using local development server at localhost:3000
      </Text>
      
      <VSRCPlayer
        options={{
          type: 'vod',
          mediaId: 'my-video-123',
          debug: 'localhost:3000',
        }}
        onReady={() => console.log('Connected to debug server')}
        onError={(error) => console.error('Error:', error)}
        style={styles.player}
      />
    </View>
  );
}

/**
 * Main App Component - Demonstrates all examples
 */
export default function VSRCPlayerExamples() {
  const [selectedExample, setSelectedExample] = useState(0);

  const examples = [
    { title: 'Basic VOD', component: <BasicVODExample /> },
    { title: 'Live Stream', component: <LiveStreamExample /> },
    { title: 'Full Controls', component: <FullControlsExample /> },
    { title: 'Live Chat', component: <LiveStreamWithChatExample /> },
    { title: 'Debug Mode', component: <DebugModeExample /> },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView horizontal style={styles.exampleSelector}>
        {examples.map((example, index) => (
          <Button
            key={index}
            title={example.title}
            onPress={() => setSelectedExample(index)}
            color={selectedExample === index ? '#007bff' : '#6c757d'}
          />
        ))}
      </ScrollView>
      {examples[selectedExample].component}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  player: {
    flex: 1,
    minHeight: 300,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    padding: 15,
    backgroundColor: '#f0f0f0',
  },
  status: {
    fontSize: 14,
    padding: 10,
    backgroundColor: '#e7f3ff',
    color: '#007bff',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  controlsGrid: {
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
    minWidth: 80,
  },
  messageList: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  message: {
    fontSize: 12,
    color: '#333',
    marginBottom: 5,
  },
  exampleSelector: {
    flexGrow: 0,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
});
