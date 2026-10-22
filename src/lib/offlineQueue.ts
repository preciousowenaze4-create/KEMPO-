/**
 * Kempo Pro - Offline Message Queue & WhatsApp-Style Delivery Sync
 * 
 * Flow:
 * 1. Offline Send: When disconnected, outgoing messages/media are queued locally.
 *    Status is set to 'pending' (clock icon, no checkmark).
 * 2. Auto-Sync: As soon as online connectivity returns (window.online event),
 *    the queue automatically pushes each queued message to Supabase and broadcasts.
 * 3. Status transitions:
 *    - 'pending' -> 'sent' (1 grey checkmark ✓) when Supabase receives message.
 *    - 'sent' -> 'delivered' (2 grey checkmarks ✓✓) when delivered to recipient device.
 *    - 'delivered' -> 'read' (2 blue checkmarks ✓✓) when recipient opens chat.
 */

import { Message } from '../types';
import { insertSupabaseMessage } from './supabase';
import { realtimeService } from './realtimeService';
import { getLocalMedia } from './mediaStorage';

export interface QueuedMessageItem {
  chatId: string;
  myId: string;
  partnerId: string;
  message: Message;
  queuedAt: number;
}

const QUEUE_STORAGE_KEY = 'kempo_offline_message_queue';

class OfflineQueueService {
  private isSyncing = false;
  private listeners: Set<(item: QueuedMessageItem, status: 'sent' | 'delivered') => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.info('Kempo Pro: Internet restored, flushing offline queue...');
        this.flushQueue();
      });
    }
  }

  // Subscribe to message sync events
  onStatusChange(callback: (item: QueuedMessageItem, status: 'sent' | 'delivered') => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Read all queued messages
  getQueue(): QueuedMessageItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // Save updated queue
  private saveQueue(items: QueuedMessageItem[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('saveQueue error:', e);
    }
  }

  // Add message to offline queue
  enqueue(chatId: string, myId: string, partnerId: string, message: Message) {
    const queue = this.getQueue();
    // Avoid duplicate
    if (!queue.some((q) => q.message.id === message.id)) {
      queue.push({
        chatId,
        myId,
        partnerId,
        message: {
          ...message,
          status: 'pending',
          isPendingSync: true,
        },
        queuedAt: Date.now(),
      });
      this.saveQueue(queue);
    }
  }

  // Remove message from queue
  dequeue(messageId: string) {
    const queue = this.getQueue().filter((q) => q.message.id !== messageId);
    this.saveQueue(queue);
  }

  // Check if network is online
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  // Flush all queued messages when online
  async flushQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline()) return;
    this.isSyncing = true;

    try {
      const queue = this.getQueue();
      if (queue.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.info(`Kempo Pro: Syncing ${queue.length} offline queued messages...`);

      for (const item of queue) {
        try {
          // If message has media, make sure we have the full media payload
          let mediaPayload = item.message.mediaUrl;
          if (!mediaPayload && (item.message.mediaType === 'image' || item.message.mediaType === 'audio')) {
            const cached = await getLocalMedia(item.message.id);
            if (cached) {
              mediaPayload = cached;
            }
          }

          // 1. Insert to Supabase database messages table
          const inserted = await insertSupabaseMessage({
            id: item.message.id,
            sender_id: item.myId,
            receiver_id: item.partnerId,
            content: item.message.text || (item.message.mediaType === 'audio' ? '🎤 Voice message' : '📸 Photo'),
            media_type: item.message.mediaType || null,
            media_url: mediaPayload || null,
            timestamp: item.message.timestamp,
            status: 'sent',
          });

          // 2. Broadcast via realtime service to recipient
          const syncedMsg: Message = {
            ...item.message,
            mediaUrl: mediaPayload || item.message.mediaUrl,
            status: 'sent',
            isPendingSync: false,
          };

          realtimeService.sendMessage(item.myId, item.partnerId, syncedMsg);
          realtimeService.sendDirectMessage(item.partnerId, {
            message: syncedMsg,
            senderKempoId: item.myId,
            senderName: item.myId,
            recipientKempoId: item.partnerId,
          });

          // Notify listeners that this message has reached 'sent' state (1 checkmark ✓)
          this.listeners.forEach((fn) => fn(item, 'sent'));

          // Remove from offline queue
          this.dequeue(item.message.id);

          // Small delay between queued items to avoid rate spikes
          await new Promise((r) => setTimeout(r, 200));
        } catch (err) {
          console.warn(`Error syncing queued message ${item.message.id}:`, err);
          // If still offline, abort rest of queue
          if (!this.isOnline()) break;
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }
}

export const offlineQueue = new OfflineQueueService();
