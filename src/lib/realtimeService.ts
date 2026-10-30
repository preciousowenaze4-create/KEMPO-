import { supabase, insertSupabaseMessage, updateSupabaseMessageStatus } from './supabase';
import { Message } from '../types';
import { getCanonicalUserId } from './accountRules';

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
  senderCoverUrl?: string;
  senderCoverType?: 'image' | 'video';
  senderEmail?: string;
  recipientKempoId: string;
}

export class KempoRealtimeService {
  private activeChannels: Map<string, any> = new Map();
  private userChannels: any[] = [];
  private userChannel: any = null;
  private postgresMessagesChannel: any = null;
  private presenceChannel: any = null;
  private seenMessageIds: Set<string> = new Set();
  private onlineUsers: Set<string> = new Set();
  private userLastSeenMap: Map<string, string> = new Map();
  private presenceListeners: Set<(onlineUserIds: Set<string>) => void> = new Set();
  private currentUserId: string = '';

  // Normalize ID for clean room channels
  public normalizeId(id: string): string {
    return (id || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
  }

  // Get deterministic room ID between two participants (order invariant)
  getRoomChannelName(myId: string, partnerId: string): string {
    const c1 = getCanonicalUserId(myId) || this.normalizeId(myId);
    const c2 = getCanonicalUserId(partnerId) || this.normalizeId(partnerId);
    const sorted = [c1, c2].sort();
    return `kempo_chat_${sorted[0]}_${sorted[1]}`;
  }

  // Real-time Supabase Presence Tracking
  initPresence(myKempoId: string, myDisplayName?: string) {
    if (!myKempoId) return () => {};
    const cleanMyId = this.normalizeId(myKempoId);
    this.currentUserId = cleanMyId;

    if (this.presenceChannel) {
      try {
        supabase.removeChannel(this.presenceChannel);
      } catch {}
    }

    const channel = supabase.channel('kempo_global_presence', {
      config: {
        presence: {
          key: cleanMyId,
        },
      },
    });

    const updatePresenceState = () => {
      const state = channel.presenceState();
      const online = new Set<string>();
      Object.keys(state).forEach((key) => {
        online.add(this.normalizeId(key));
        const canonical = getCanonicalUserId(key);
        if (canonical) online.add(canonical);
        const presences = state[key] as any[];
        if (Array.isArray(presences)) {
          presences.forEach((p) => {
            if (p?.user_id) {
              online.add(this.normalizeId(p.user_id));
              const c = getCanonicalUserId(p.user_id);
              if (c) online.add(c);
            }
            if (p?.canonical_id) {
              online.add(this.normalizeId(p.canonical_id));
            }
            if (p?.display_name) {
              online.add(this.normalizeId(p.display_name));
            }
          });
        }
      });
      // Current user is always online
      online.add(cleanMyId);
      const myCanonical = getCanonicalUserId(myKempoId);
      if (myCanonical) online.add(myCanonical);
      this.onlineUsers = online;
      this.presenceListeners.forEach((listener) => {
        try {
          listener(new Set(this.onlineUsers));
        } catch {}
      });
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        updatePresenceState();
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key) {
          this.onlineUsers.add(this.normalizeId(key));
          const canonical = getCanonicalUserId(key);
          if (canonical) this.onlineUsers.add(canonical);
          this.presenceListeners.forEach((listener) => {
            try {
              listener(new Set(this.onlineUsers));
            } catch {}
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key) {
          const norm = this.normalizeId(key);
          const canonical = getCanonicalUserId(key);
          this.onlineUsers.delete(norm);
          if (canonical) this.onlineUsers.delete(canonical);
          const leftTime = new Date().toISOString();
          this.userLastSeenMap.set(norm, leftTime);
          if (canonical) this.userLastSeenMap.set(canonical, leftTime);
          this.presenceListeners.forEach((listener) => {
            try {
              listener(new Set(this.onlineUsers));
            } catch {}
          });
        }
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: cleanMyId,
            canonical_id: getCanonicalUserId(myKempoId),
            display_name: myDisplayName || cleanMyId,
            online_at: new Date().toISOString(),
          });
        }
      });

    this.presenceChannel = channel;

    // Periodic heartbeat to record latest online time in Supabase
    const heartbeatTimer = setInterval(() => {
      try {
        if (myKempoId) {
          supabase
            .from('profiles')
            .update({ last_seen: new Date().toISOString() })
            .or(`kempo_id.eq."${myKempoId}",id.eq."${myKempoId}"`);
        }
      } catch {}
    }, 25000);

    const handleUnload = () => {
      if (this.presenceChannel) {
        try {
          this.presenceChannel.untrack();
        } catch {}
      }
      try {
        if (myKempoId) {
          supabase
            .from('profiles')
            .update({ last_seen: new Date().toISOString() })
            .or(`kempo_id.eq."${myKempoId}",id.eq."${myKempoId}"`);
        }
      } catch {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleUnload);
    }

    return () => {
      clearInterval(heartbeatTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleUnload);
      }
      try {
        supabase.removeChannel(channel);
      } catch {}
      this.presenceChannel = null;
    };
  }

  // Check if a specific user / contact is currently active and online
  isUserOnline(userIdOrKempoId: string): boolean {
    if (!userIdOrKempoId) return false;
    const clean = this.normalizeId(userIdOrKempoId);
    const canonical = getCanonicalUserId(userIdOrKempoId);
    return this.onlineUsers.has(clean) || (canonical ? this.onlineUsers.has(canonical) : false);
  }

  // Get contact's last seen ISO timestamp
  getUserLastSeen(userIdOrKempoId: string): string | undefined {
    if (!userIdOrKempoId) return undefined;
    return this.userLastSeenMap.get(this.normalizeId(userIdOrKempoId));
  }

  // Subscribe to real-time presence changes
  onPresenceChange(listener: (onlineUserIds: Set<string>) => void): () => void {
    this.presenceListeners.add(listener);
    listener(new Set(this.onlineUsers));
    return () => {
      this.presenceListeners.delete(listener);
    };
  }

  // Mark user as active from room interaction
  markUserActive(userIdOrKempoId: string) {
    if (!userIdOrKempoId) return;
    const clean = this.normalizeId(userIdOrKempoId);
    this.onlineUsers.add(clean);
    this.presenceListeners.forEach((listener) => {
      try {
        listener(new Set(this.onlineUsers));
      } catch {}
    });
  }

  // 1. Supabase Realtime Postgres Changes Subscription on 'messages' table
  subscribeToPostgresMessages(
    myKempoId: string,
    onNewMessage: (msg: Message, senderId: string, receiverId: string) => void,
    onStatusUpdate?: (messageId: string, status: 'sent' | 'delivered' | 'read') => void
  ) {
    if (!myKempoId) return () => {};

    const cleanMyId = this.normalizeId(myKempoId);
    const channelName = `realtime_postgres_messages_${cleanMyId}`;

    if (this.postgresMessagesChannel) {
      try {
        supabase.removeChannel(this.postgresMessagesChannel);
      } catch {}
    }

    const channel = supabase.channel(channelName);

    // Listen to INSERT events on 'messages' table via Supabase postgres_changes
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          const row = payload.new;
          if (!row || !row.id) return;

          // Idempotency: Guard against duplicate events
          if (this.seenMessageIds.has(row.id)) return;
          this.seenMessageIds.add(row.id);

          const sender = (row.sender_id || '').trim();
          const receiver = (row.receiver_id || '').trim();

          // Only process messages involving current user
          if (
            this.normalizeId(receiver) === cleanMyId ||
            this.normalizeId(sender) === cleanMyId
          ) {
            const incomingMsg: Message = {
              id: row.id,
              senderId: row.sender_id,
              recipientId: row.receiver_id,
              text: row.content,
              mediaType: row.media_type || undefined,
              mediaUrl: row.media_url || undefined,
              timestamp: row.timestamp || 'Just now',
              status: (row.status as any) || 'delivered',
            };
            onNewMessage(incomingMsg, sender, receiver);
          }
        }
      )
      // Listen to UPDATE events on 'messages' table (e.g. read receipts / delivery confirmation)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          const row = payload.new;
          if (row?.id && row?.status && onStatusUpdate) {
            onStatusUpdate(row.id, row.status);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.info(`Subscribed to Supabase postgres_changes on messages table`);
        }
      });

    this.postgresMessagesChannel = channel;

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
      this.postgresMessagesChannel = null;
    };
  }

  listenToPersonalSignals(
    myKempoId: string,
    onIncomingCall: (call: IncomingCallEvent) => void,
    onCallEnded?: () => void,
    onIncomingDirectMessage?: (dm: DirectMessagePayload) => void,
    onCallAccepted?: () => void,
    onCallDeclined?: () => void,
    onMissedCall?: (event: MissedCallEvent) => void,
    onDeliveryReceipt?: (messageId: string) => void,
    onReadReceipt?: (readerId: string, messageId?: string) => void
  ) {
    if (!myKempoId) return;

    if (this.userChannels.length > 0) {
      this.userChannels.forEach((ch) => {
        try {
          supabase.removeChannel(ch);
        } catch {}
      });
      this.userChannels = [];
    }
    if (this.userChannel) {
      try {
        supabase.removeChannel(this.userChannel);
      } catch (e) {
        console.warn(e);
      }
      this.userChannel = null;
    }

    const cleanMyId = this.normalizeId(myKempoId);
    const canonicalMyId = getCanonicalUserId(myKempoId);

    const isMatch = (targetId?: string) => {
      if (!targetId) return false;
      const tClean = this.normalizeId(targetId);
      const tCanonical = getCanonicalUserId(targetId);
      return (
        tClean === cleanMyId ||
        tCanonical === canonicalMyId ||
        (canonicalMyId && tClean.includes(canonicalMyId)) ||
        (cleanMyId && tCanonical.includes(cleanMyId))
      );
    };

    const channelNames = Array.from(
      new Set([`user_${cleanMyId}`, `user_${canonicalMyId}`, 'kempo_global_direct_signals'])
    ).filter(Boolean);

    channelNames.forEach((chName) => {
      const channel = supabase.channel(chName, {
        config: { broadcast: { self: false } },
      });

      channel
        .on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
          if (
            payload &&
            (chName !== 'kempo_global_direct_signals' || isMatch((payload as any).targetId || (payload as any).callerKempoId))
          ) {
            onIncomingCall(payload as IncomingCallEvent);
          }
        })
        .on('broadcast', { event: 'call_accepted' }, ({ payload }) => {
          if (!payload || !payload.targetId || isMatch(payload.targetId)) {
            onCallAccepted?.();
          }
        })
        .on('broadcast', { event: 'call_declined' }, ({ payload }) => {
          if (!payload || !payload.targetId || isMatch(payload.targetId)) {
            onCallDeclined?.();
          }
        })
        .on('broadcast', { event: 'call_ended' }, ({ payload }) => {
          if (!payload || !payload.targetId || isMatch(payload.targetId)) {
            onCallEnded?.();
          }
        })
        .on('broadcast', { event: 'missed_call' }, ({ payload }) => {
          if (
            payload &&
            onMissedCall &&
            (chName !== 'kempo_global_direct_signals' || isMatch((payload as any).targetId))
          ) {
            onMissedCall(payload as MissedCallEvent);
          }
        })
        .on('broadcast', { event: 'direct_message' }, ({ payload }) => {
          if (payload && onIncomingDirectMessage) {
            const dm = payload as DirectMessagePayload;
            if (isMatch(dm.recipientKempoId)) {
              if (dm?.message?.id) {
                if (this.seenMessageIds.has(dm.message.id)) return;
                this.seenMessageIds.add(dm.message.id);
              }
              onIncomingDirectMessage(dm);
            }
          }
        })
        .on('broadcast', { event: 'delivery_receipt' }, ({ payload }) => {
          if (payload?.messageId && onDeliveryReceipt) {
            onDeliveryReceipt(payload.messageId);
          }
        })
        .on('broadcast', { event: 'read_receipt' }, ({ payload }) => {
          if (payload?.readerId && onReadReceipt) {
            onReadReceipt(payload.readerId, payload.messageId);
          }
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.info(`Subscribed to personal channel: ${chName}`);
          }
        });

      this.userChannels.push(channel);
    });

    this.userChannel = this.userChannels[0] || null;
  }

  // Send a direct message to a user's personal channel
  sendDirectMessage(recipientKempoId: string, payload: DirectMessagePayload) {
    if (!recipientKempoId) return;
    const cleanChannelName = `user_${this.normalizeId(recipientKempoId)}`;
    const canonicalChannelName = `user_${getCanonicalUserId(recipientKempoId)}`;

    const targetChannels = Array.from(
      new Set([cleanChannelName, canonicalChannelName, 'kempo_global_direct_signals'])
    );

    targetChannels.forEach((chName) => {
      const channel = supabase.channel(chName, {
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
          }, 2000);
        }
      });
    });
  }

  // Trigger an incoming call on recipient's screen
  sendCallInvite(targetKempoId: string, callData: IncomingCallEvent) {
    const cleanChannelName = `user_${this.normalizeId(targetKempoId)}`;
    const canonicalChannelName = `user_${getCanonicalUserId(targetKempoId)}`;
    const targetChannels = Array.from(
      new Set([cleanChannelName, canonicalChannelName, 'kempo_global_direct_signals'])
    );

    targetChannels.forEach((chName) => {
      const channel = supabase.channel(chName, {
        config: { broadcast: { self: false } },
      });

      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'incoming_call',
            payload: { ...callData, targetId: targetKempoId },
          });
          setTimeout(() => {
            try {
              supabase.removeChannel(channel);
            } catch {}
          }, 3000);
        }
      });
    });
  }

  // Send Call Accepted signal back to caller
  sendCallAccepted(targetKempoId: string) {
    const cleanChannelName = `user_${this.normalizeId(targetKempoId)}`;
    const canonicalChannelName = `user_${getCanonicalUserId(targetKempoId)}`;
    const targetChannels = Array.from(
      new Set([cleanChannelName, canonicalChannelName, 'kempo_global_direct_signals'])
    );

    targetChannels.forEach((chName) => {
      const channel = supabase.channel(chName, {
        config: { broadcast: { self: false } },
      });

      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'call_accepted',
            payload: { targetId: targetKempoId },
          });
          setTimeout(() => {
            try {
              supabase.removeChannel(channel);
            } catch {}
          }, 1500);
        }
      });
    });
  }

  // Send Call Declined signal back to caller
  sendCallDeclined(targetKempoId: string) {
    const cleanChannelName = `user_${this.normalizeId(targetKempoId)}`;
    const canonicalChannelName = `user_${getCanonicalUserId(targetKempoId)}`;
    const targetChannels = Array.from(
      new Set([cleanChannelName, canonicalChannelName, 'kempo_global_direct_signals'])
    );

    targetChannels.forEach((chName) => {
      const channel = supabase.channel(chName, {
        config: { broadcast: { self: false } },
      });

      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'call_declined',
            payload: { targetId: targetKempoId },
          });
          setTimeout(() => {
            try {
              supabase.removeChannel(channel);
            } catch {}
          }, 1500);
        }
      });
    });
  }

  // Send Missed Call signal to recipient
  sendMissedCall(targetKempoId: string, event: MissedCallEvent) {
    const cleanChannelName = `user_${this.normalizeId(targetKempoId)}`;
    const canonicalChannelName = `user_${getCanonicalUserId(targetKempoId)}`;
    const targetChannels = Array.from(
      new Set([cleanChannelName, canonicalChannelName, 'kempo_global_direct_signals'])
    );

    targetChannels.forEach((chName) => {
      const channel = supabase.channel(chName, {
        config: { broadcast: { self: false } },
      });

      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'missed_call',
            payload: { ...event, targetId: targetKempoId },
          });
          setTimeout(() => {
            try {
              supabase.removeChannel(channel);
            } catch {}
          }, 1500);
        }
      });
    });
  }

  // Send Call Ended signal to recipient
  sendCallEnded(targetKempoId: string) {
    const cleanChannelName = `user_${this.normalizeId(targetKempoId)}`;
    const canonicalChannelName = `user_${getCanonicalUserId(targetKempoId)}`;
    const targetChannels = Array.from(
      new Set([cleanChannelName, canonicalChannelName, 'kempo_global_direct_signals'])
    );

    targetChannels.forEach((chName) => {
      const channel = supabase.channel(chName, {
        config: { broadcast: { self: false } },
      });

      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'call_ended',
            payload: { targetId: targetKempoId },
          });
          setTimeout(() => {
            try {
              supabase.removeChannel(channel);
            } catch {}
          }, 1500);
        }
      });
    });
  }

  // 3. Subscribe to real-time chat room messages, read receipts, and typing indicators
  subscribeToChatRoom(
    myId: string,
    partnerId: string,
    onMessage: (msg: Message) => void,
    onReadReceipt: (readerId: string) => void,
    onTyping?: (isTyping: boolean) => void,
    onProfileSync?: (partnerProfile: {
      kempoId?: string;
      displayName?: string;
      avatarUrl?: string;
      coverUrl?: string;
      coverType?: 'image' | 'video';
      email?: string;
    }) => void,
    myProfile?: {
      displayName?: string;
      avatarUrl?: string;
      coverUrl?: string;
      coverType?: 'image' | 'video';
      email?: string;
    },
    onDeliveryReceipt?: (messageId: string) => void
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
          this.markUserActive(partnerId);
          if (payload.id) {
            if (this.seenMessageIds.has(payload.id)) return;
            this.seenMessageIds.add(payload.id);
          }
          onMessage(payload);
          this.sendReadReceipt(myId, partnerId, payload.id);
        }
      })
      .on('broadcast', { event: 'delivery_receipt' }, ({ payload }) => {
        if (payload?.messageId && onDeliveryReceipt) {
          this.markUserActive(partnerId);
          onDeliveryReceipt(payload.messageId);
        }
      })
      .on('broadcast', { event: 'read_receipt' }, ({ payload }) => {
        if (payload && this.normalizeId(payload.readerId) !== cleanMyId) {
          this.markUserActive(partnerId);
          onReadReceipt(payload.readerId);
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload && this.normalizeId(payload.senderId) !== cleanMyId) {
          this.markUserActive(partnerId);
          onTyping?.(Boolean(payload.isTyping));
        }
      })
      .on('broadcast', { event: 'profile_exchange' }, ({ payload }) => {
        if (payload && this.normalizeId(payload.kempoId) !== cleanMyId) {
          this.markUserActive(partnerId);
          onProfileSync?.(payload);
        }
      })
      .on('broadcast', { event: 'heartbeat' }, ({ payload }) => {
        if (payload && this.normalizeId(payload.senderId) !== cleanMyId) {
          this.markUserActive(partnerId);
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Send room heartbeat and profile sync
          channel.send({
            type: 'broadcast',
            event: 'heartbeat',
            payload: { senderId: myId, timestamp: new Date().toISOString() },
          });

          if (myProfile) {
            channel.send({
              type: 'broadcast',
              event: 'profile_exchange',
              payload: { ...myProfile, kempoId: myId },
            });
          }
        }
      });

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

  // Send typing indicator over room channel
  sendTyping(myId: string, partnerId: string, isTyping: boolean) {
    const channelName = this.getRoomChannelName(myId, partnerId);
    const channel = this.activeChannels.get(channelName);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { senderId: myId, isTyping, timestamp: new Date().toISOString() },
      });
    }
  }

  // Send a message over both Supabase Postgres Table and Realtime Channels
  async sendMessage(
    myId: string,
    partnerId: string,
    message: Message,
    senderName?: string,
    senderAvatar?: string,
    onDelivered?: () => void,
    senderCoverUrl?: string,
    senderCoverType?: 'image' | 'video',
    senderEmail?: string
  ): Promise<boolean> {
    // Record message id locally
    this.seenMessageIds.add(message.id);

    // 1. Automatically insert into the Supabase 'messages' table with required fields:
    // sender_id, receiver_id, content, and timestamp
    const insertPromise = insertSupabaseMessage({
      id: message.id,
      sender_id: myId,
      receiver_id: partnerId,
      content: message.text || (message.mediaType === 'audio' ? '🎤 Voice message' : 'Media file'),
      media_type: message.mediaType || null,
      media_url: message.mediaUrl || null,
      timestamp: message.timestamp,
      status: 'sent',
    });

    // 2. Broadcast immediately over the room channel for instant 0ms UX
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

    // 3. Send direct message payload to recipient's personal user channel
    this.sendDirectMessage(partnerId, {
      message,
      senderKempoId: myId,
      senderName: senderName || myId,
      senderAvatar: senderAvatar || '',
      senderCoverUrl,
      senderCoverType,
      senderEmail,
      recipientKempoId: partnerId,
    });

    // When DB write settles, invoke callback without prematurely marking delivered
    insertPromise.then((inserted: boolean) => {
      // If the partner is currently confirmed online in presence, immediately confirm delivery
      if (inserted && this.isUserOnline(partnerId)) {
        updateSupabaseMessageStatus(message.id, 'delivered');
        onDelivered?.();
      }
    }).catch(() => {});

    return true;
  }

  // Send delivery receipt to inform sender that their message reached the recipient device
  sendDeliveryReceipt(myId: string, senderId: string, messageId: string) {
    if (!messageId) return;
    // 1. Update in Supabase database
    updateSupabaseMessageStatus(messageId, 'delivered');

    // 2. Broadcast on room channel if active
    const channelName = this.getRoomChannelName(myId, senderId);
    const roomChannel = this.activeChannels.get(channelName);
    if (roomChannel) {
      roomChannel.send({
        type: 'broadcast',
        event: 'delivery_receipt',
        payload: { messageId, readerId: myId, timestamp: new Date().toISOString() },
      });
    }

    // 3. Broadcast on sender's personal signal channel
    if (senderId) {
      const cleanChannelName = `user_${this.normalizeId(senderId)}`;
      const canonicalChannelName = `user_${getCanonicalUserId(senderId)}`;
      const targetChannels = Array.from(
        new Set([cleanChannelName, canonicalChannelName, 'kempo_global_direct_signals'])
      );

      targetChannels.forEach((chName) => {
        const channel = supabase.channel(chName, {
          config: { broadcast: { self: false } },
        });

        channel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'delivery_receipt',
              payload: { messageId, targetId: senderId, senderId: myId },
            });
            setTimeout(() => {
              try {
                supabase.removeChannel(channel);
              } catch {}
            }, 1200);
          }
        });
      });
    }
  }

  // Send read receipt over room channel and update DB
  sendReadReceipt(myId: string, partnerId: string, messageId?: string) {
    const channelName = this.getRoomChannelName(myId, partnerId);
    const channel = this.activeChannels.get(channelName);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'read_receipt',
        payload: { readerId: myId, messageId, timestamp: new Date().toISOString() },
      });
    }
    if (messageId) {
      updateSupabaseMessageStatus(messageId, 'read');
    }
    // Also broadcast read_receipt on partner's personal signal channel
    if (partnerId) {
      const cleanChannelName = `user_${this.normalizeId(partnerId)}`;
      const canonicalChannelName = `user_${getCanonicalUserId(partnerId)}`;
      const targetChannels = Array.from(
        new Set([cleanChannelName, canonicalChannelName, 'kempo_global_direct_signals'])
      );
      targetChannels.forEach((chName) => {
        const ch = supabase.channel(chName, {
          config: { broadcast: { self: false } },
        });
        ch.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            ch.send({
              type: 'broadcast',
              event: 'read_receipt',
              payload: { readerId: myId, messageId, targetId: partnerId },
            });
            setTimeout(() => {
              try {
                supabase.removeChannel(ch);
              } catch {}
            }, 1200);
          }
        });
      });
    }
  }

  // 4. Real-time Profile Updates Subscription (Supabase postgres_changes & broadcast)
  subscribeToProfileUpdates(
    onProfileUpdated: (updatedProfile: {
      id?: string;
      kempoId?: string;
      displayName?: string;
      avatarUrl?: string;
      coverUrl?: string;
      coverType?: 'image' | 'video';
      status?: string;
      email?: string;
    }) => void
  ) {
    const channelName = 'kempo_global_profiles';
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT or UPDATE
          schema: 'public',
          table: 'profiles',
        },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;

          onProfileUpdated({
            id: row.id,
            kempoId: row.kempo_id || row.id,
            displayName: row.display_name,
            avatarUrl: row.avatar_url,
            coverUrl: row.cover_url,
            coverType: row.cover_type,
            status: row.status,
            email: row.email,
          });
        }
      )
      .on('broadcast', { event: 'profile_update' }, ({ payload }) => {
        if (payload) {
          onProfileUpdated(payload);
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.info('Subscribed to real-time profile updates');
        }
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }

  // Broadcast own profile update immediately over the real-time channel
  broadcastProfileUpdate(profile: {
    id?: string;
    kempoId?: string;
    displayName?: string;
    avatarUrl?: string;
    coverUrl?: string;
    coverType?: 'image' | 'video';
    status?: string;
    email?: string;
  }) {
    const channelName = 'kempo_global_profiles';
    const channel = supabase.channel(channelName);

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'profile_update',
          payload: profile,
        });
        setTimeout(() => {
          try {
            supabase.removeChannel(channel);
          } catch {}
        }, 1500);
      }
    });
  }

  cleanup() {
    if (this.userChannel) {
      try {
        supabase.removeChannel(this.userChannel);
      } catch {}
      this.userChannel = null;
    }
    if (this.postgresMessagesChannel) {
      try {
        supabase.removeChannel(this.postgresMessagesChannel);
      } catch {}
      this.postgresMessagesChannel = null;
    }
    if (this.presenceChannel) {
      try {
        supabase.removeChannel(this.presenceChannel);
      } catch {}
      this.presenceChannel = null;
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
