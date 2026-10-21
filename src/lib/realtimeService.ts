import { supabase } from './supabase';
import { Message } from '../types';

export interface IncomingCallEvent {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callerKempoId?: string;
  isVideo: boolean;
}

export interface MissedCallEvent {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callerKempoId?: string;
  isVideo: boolean;
  timestamp: string;
}

export interface DirectMessagePayload {
  message: Message;
  senderKempoId: string;
  senderName: string;
  senderAvatar?: string;
  recipientKempoId: string;
}

export class KempoRealtimeService {
  private activeChannels: Map<string, any> = new Map();
  private userChannel: any = null;

  // Normalize ID for clean room channels
  public normalizeId(id: string): string {
    return (id || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
  }

  // Get deterministic room ID between two participants (order invariant)
  getRoomChannelName(myId: string, partnerId: string): string {
    const clean1 = this.normalizeId(myId);
    const clean2 = this.normalizeId(partnerId);
    const sorted = [clean1, clean2].sort();
    return `kempo_chat_${sorted[0]}_${sorted[1]}`;
  }

  // Listen to personal signaling channel for incoming calls, responses, direct messages, and missed calls
  listenToPersonalSignals(
    myKempoId: string,
    onIncomingCall: (call: IncomingCallEvent) => void,
    onCallEnded?: () => void,
    onIncomingDirectMessage?: (dm: DirectMessagePayload) => void,
    onCallAccepted?: () => void,
    onCallDeclined?: () => void,
    onMissedCall?: (event: MissedCallEvent) => void
  ) {
    if (!myKempoId) return;

    if (this.userChannel) {
      try {
        supabase.removeChannel(this.userChannel);
      } catch (e) {
        console.warn(e);
      }
    }

    const cleanChannelName = `user_${this.normalizeId(myKempoId)}`;
    const channel = supabase.channel(cleanChannelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
        if (payload) {
          onIncomingCall(payload as IncomingCallEvent);
        }
      })
      .on('broadcast', { event: 'call_accepted' }, () => {
        onCallAccepted?.();
      })
      .on('broadcast', { event: 'call_declined' }, () => {
        onCallDeclined?.();
      })
      .on('broadcast', { event: 'call_ended' }, () => {
        onCallEnded?.();
      })
      .on('broadcast', { event: 'missed_call' }, ({ payload }) => {
        if (payload && onMissedCall) {
          onMissedCall(payload as MissedCallEvent);
        }
      })
      .on('broadcast', { event: 'direct_message' }, ({ payload }) => {
        if (payload && onIncomingDirectMessage) {
          onIncomingDirectMessage(payload as DirectMessagePayload);
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.info(`Subscribed to personal channel: ${cleanChannelName}`);
        }
      });

    this.userChannel = channel;
  }

  // Send a direct message to a user's personal channel
  sendDirectMessage(recipientKempoId: string, payload: DirectMessagePayload) {
    if (!recipientKempoId) return;
    const cleanChannelName = `user_${this.normalizeId(recipientKempoId)}`;
    const channel = supabase.channel(cleanChannelName, {
      config: { broadcast: { self: false } },
    });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'direct_message',
          payload,
        });
        setTimeout(() => {
          try {
            supabase.removeChannel(channel);
          } catch {}
        }, 1500);
      }
    });
  }

  // Trigger an incoming call on the recipient's phone/screen
  sendCallInvite(
    targetKempoId: string,
    callData: IncomingCallEvent
  ) {
    const cleanChannelName = `user_${this.normalizeId(targetKempoId)}`;
    const channel = supabase.channel(cleanChannelName, {
      config: { broadcast: { self: false } },
    });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'incoming_call',
          payload: callData,
        });
      }
    });
  }

  // Send Call Accepted signal back to caller
  sendCallAccepted(targetKempoId: string) {
    const cleanChannelName = `user_${this.normalizeId(targetKempoId)}`;
    const channel = supabase.channel(cleanChannelName, {
      config: { broadcast: { self: false } },
    });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'call_accepted',
          payload: {},
        });
        setTimeout(() => {
          try { supabase.removeChannel(channel); } catch {}
        }, 1500);
      }
    });
  }

  // Send Call Declined signal back to caller
  sendCallDeclined(targetKempoId: string) {
    const cleanChannelName = `user_${this.normalizeId(targetKempoId)}`;
    const channel = supabase.channel(cleanChannelName, {
      config: { broadcast: { self: false } },
    });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'call_declined',
          payload: {},
        });
        setTimeout(() => {
          try { supabase.removeChannel(channel); } catch {}
        }, 1500);
      }
    });
  }

  // Send Missed Call signal to recipient
  sendMissedCall(targetKempoId: string, event: MissedCallEvent) {
    const cleanChannelName = `user_${this.normalizeId(targetKempoId)}`;
    const channel = supabase.channel(cleanChannelName, {
      config: { broadcast: { self: false } },
    });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'missed_call',
          payload: event,
        });
        setTimeout(() => {
          try { supabase.removeChannel(channel); } catch {}
        }, 1500);
      }
    });
  }

  // Send Call Ended signal to recipient
  sendCallEnded(targetKempoId: string) {
    const cleanChannelName = `user_${this.normalizeId(targetKempoId)}`;
    const channel = supabase.channel(cleanChannelName, {
      config: { broadcast: { self: false } },
    });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'call_ended',
          payload: {},
        });
        setTimeout(() => {
          try { supabase.removeChannel(channel); } catch {}
        }, 1500);
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
    const cleanMyId = this.normalizeId(myId);

    if (this.activeChannels.has(channelName)) {
      try {
        supabase.removeChannel(this.activeChannels.get(channelName));
      } catch {}
    }

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        if (payload && this.normalizeId(payload.senderId) !== cleanMyId) {
          onMessage(payload);
          this.sendReadReceipt(myId, partnerId);
        }
      })
      .on('broadcast', { event: 'read_receipt' }, ({ payload }) => {
        if (payload && this.normalizeId(payload.readerId) !== cleanMyId) {
          onReadReceipt(payload.readerId);
        }
      })
      .subscribe();

    this.activeChannels.set(channelName, channel);

    setTimeout(() => {
      this.sendReadReceipt(myId, partnerId);
    }, 500);

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
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
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'new_message',
            payload: message,
          });
        }
      });
      this.activeChannels.set(channelName, channel);
    } else {
      channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: message,
      });
    }
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
      try {
        supabase.removeChannel(this.userChannel);
      } catch {}
      this.userChannel = null;
    }
    this.activeChannels.forEach((ch) => {
      try {
        supabase.removeChannel(ch);
      } catch {}
    });
    this.activeChannels.clear();
  }
}

export const realtimeService = new KempoRealtimeService();
