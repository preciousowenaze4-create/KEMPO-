import { supabase } from './supabase';
import { Message, Chat, UserProfileData } from '../types';

export interface IncomingCallEvent {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callerKempoId?: string;
  isVideo: boolean;
}

export class KempoRealtimeService {
  private activeChannels: Map<string, any> = new Map();
  private userChannel: any = null;

  // Get deterministic room ID between two participants
  getRoomChannelName(myId: string, partnerId: string): string {
    const sorted = [myId.trim(), partnerId.trim()].sort();
    return `kempo_chat_${sorted[0]}_${sorted[1]}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  // Listen to personal signaling channel for incoming calls and notifications
  listenToPersonalSignals(
    myKempoId: string,
    onIncomingCall: (call: IncomingCallEvent) => void,
    onCallEnded?: () => void
  ) {
    if (!myKempoId) return;

    if (this.userChannel) {
      supabase.removeChannel(this.userChannel);
    }

    const cleanChannelName = `user_${myKempoId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const channel = supabase.channel(cleanChannelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
        if (payload) {
          onIncomingCall(payload as IncomingCallEvent);
        }
      })
      .on('broadcast', { event: 'call_ended' }, () => {
        onCallEnded?.();
      })
      .subscribe();

    this.userChannel = channel;
  }

  // Trigger an incoming call on the recipient's phone/screen
  sendCallInvite(
    targetKempoId: string,
    callData: IncomingCallEvent
  ) {
    const cleanChannelName = `user_${targetKempoId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const channel = supabase.channel(cleanChannelName, {
      config: { broadcast: { self: false } },
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'incoming_call',
          payload: callData,
        });
      }
    });
  }

  // Send Call Ended signal to recipient
  sendCallEnded(targetKempoId: string) {
    const cleanChannelName = `user_${targetKempoId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const channel = supabase.channel(cleanChannelName, {
      config: { broadcast: { self: false } },
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'call_ended',
          payload: {},
        });
      }
    });
  }

  // Subscribe to real-time chat room messages and read receipts
  subscribeToChatRoom(
    myId: string,
    partnerId: string,
    onMessage: (msg: Message) => void,
    onReadReceipt: (readerId: string) => void
  ) {
    const channelName = this.getRoomChannelName(myId, partnerId);

    // Clean up if already exists
    if (this.activeChannels.has(channelName)) {
      supabase.removeChannel(this.activeChannels.get(channelName));
    }

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        if (payload && payload.senderId !== myId) {
          onMessage(payload);
          // Auto send back read receipt
          this.sendReadReceipt(myId, partnerId);
        }
      })
      .on('broadcast', { event: 'read_receipt' }, ({ payload }) => {
        if (payload && payload.readerId !== myId) {
          onReadReceipt(payload.readerId);
        }
      })
      .subscribe();

    this.activeChannels.set(channelName, channel);

    // Initial read receipt emission
    setTimeout(() => {
      this.sendReadReceipt(myId, partnerId);
    }, 500);

    return () => {
      supabase.removeChannel(channel);
      this.activeChannels.delete(channelName);
    };
  }

  // Send a message over the room channel
  sendMessage(myId: string, partnerId: string, message: Message) {
    const channelName = this.getRoomChannelName(myId, partnerId);
    let channel = this.activeChannels.get(channelName);

    if (!channel) {
      channel = supabase.channel(channelName, {
        config: { broadcast: { self: false } },
      });
      channel.subscribe();
      this.activeChannels.set(channelName, channel);
    }

    channel.send({
      type: 'broadcast',
      event: 'new_message',
      payload: message,
    });
  }

  // Send read receipt over the room channel
  sendReadReceipt(myId: string, partnerId: string) {
    const channelName = this.getRoomChannelName(myId, partnerId);
    const channel = this.activeChannels.get(channelName);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'read_receipt',
        payload: { readerId: myId, timestamp: new Date().toISOString() },
      });
    }
  }

  cleanup() {
    if (this.userChannel) {
      supabase.removeChannel(this.userChannel);
      this.userChannel = null;
    }
    this.activeChannels.forEach((ch) => supabase.removeChannel(ch));
    this.activeChannels.clear();
  }
}

export const realtimeService = new KempoRealtimeService();
