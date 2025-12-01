// Stream Chat Service - Fast, real-time messaging with push notifications
import { StreamChat } from 'stream-chat';
import { firebaseConfig } from '../firebase/config';

// Stream Chat API Key
const STREAM_API_KEY = 'gp3t5p69yd4c';

// Initialize Stream Chat client
let streamClient = null;

export const getStreamClient = () => {
  if (!streamClient) {
    try {
      streamClient = StreamChat.getInstance(STREAM_API_KEY, {
        enableInsights: true,
        enableWSFallback: true,
        logger: (logLevel, msg, extraData) => {
          if (logLevel === 'error' || logLevel === 'warn') {
            console.log(`[Stream Chat ${logLevel}]:`, msg, extraData);
          }
        },
      });
      console.log('✅ Stream Chat client instance created');
    } catch (error) {
      console.error('❌ Failed to create Stream Chat client:', error);
      throw error;
    }
  }
  return streamClient;
};

// Connect user to Stream Chat
export const connectStreamUser = async (user, userToken) => {
  try {
    const client = getStreamClient();
    
    // Disconnect any existing connection
    if (client.userID) {
      try {
        await client.disconnectUser();
      } catch (disconnectError) {
        console.warn('Error disconnecting previous user:', disconnectError);
      }
    }

    // Prepare user data
    const userData = {
      id: user.uid,
      name: `${user.displayName || user.email || 'User'}`.trim(),
    };
    
    // Add optional fields only if they exist
    if (user.photoURL) userData.image = user.photoURL;
    if (user.email) userData.email = user.email;

    // Generate dev token for development (no backend needed)
    // For production, you'd generate tokens on your backend
    let token = userToken;
    if (!token) {
      try {
        // Use devToken for development - works without backend
        token = client.devToken(user.uid);
      } catch (tokenError) {
        console.error('Error generating dev token:', tokenError);
        throw new Error('Failed to generate Stream Chat token');
      }
    }

    // Connect user with token
    await client.connectUser(userData, token);

    console.log('✅ Stream Chat user connected:', user.uid);
    return client;
  } catch (error) {
    console.error('❌ Error connecting to Stream Chat:', error);
    // Provide more detailed error information
    if (error.message) {
      console.error('Error message:', error.message);
    }
    if (error.response) {
      console.error('Error response:', error.response);
    }
    throw error;
  }
};

// Disconnect user from Stream Chat
export const disconnectStreamUser = async () => {
  try {
    const client = getStreamClient();
    if (client.userID) {
      await client.disconnectUser();
    }
  } catch (error) {
    console.error('Error disconnecting from Stream Chat:', error);
  }
};

// Get or create a channel
export const getOrCreateChannel = async (client, userId1, userId2) => {
  try {
    const channelId = [userId1, userId2].sort().join('_');
    
    // Try to get existing channel
    const channels = await client.queryChannels({
      type: 'messaging',
      members: { $in: [userId1, userId2] },
    });

    if (channels.length > 0) {
      return channels[0];
    }

    // Create new channel
    const channel = client.channel('messaging', channelId, {
      name: `Chat between ${userId1} and ${userId2}`,
      members: [userId1, userId2],
    });

    await channel.watch();
    return channel;
  } catch (error) {
    console.error('Error getting/creating channel:', error);
    throw error;
  }
};

// Initialize Firebase Cloud Messaging for push notifications
export const initializeFCM = async () => {
  try {
    // Dynamically import Firebase messaging to avoid issues if not available
    const { getMessaging, getToken } = await import('firebase/messaging');
    const { getApp } = await import('firebase/app');
    const app = getApp();
    
    // Get FCM messaging instance
    const messaging = getMessaging(app);

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FCM_VAPID_KEY || undefined,
    });

    if (token) {
      console.log('FCM Token:', token);
      return { messaging, token };
    } else {
      console.warn('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Error initializing FCM:', error);
    // FCM might not be available in all environments, return null gracefully
    return null;
  }
};

// Set up push notification listener
export const setupPushNotifications = async (client, onNotification) => {
  try {
    // Dynamically import Firebase messaging
    const { getMessaging, onMessage } = await import('firebase/messaging');
    const { getApp } = await import('firebase/app');
    const app = getApp();
    const messaging = getMessaging(app);

    // Listen for foreground messages
    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      if (onNotification) {
        onNotification(payload);
      }
    });

    // Set up Stream Chat push notification handler
    client.on('notification.message_new', (event) => {
      console.log('New message notification:', event);
      if (onNotification) {
        onNotification(event);
      }
    });
  } catch (error) {
    console.error('Error setting up push notifications:', error);
    // Continue without push notifications if FCM is not available
  }
};

// Register device token with Stream Chat for push notifications
export const registerPushToken = async (client, fcmToken) => {
  try {
    if (!fcmToken) {
      console.warn('No FCM token to register');
      return;
    }

    // Register device with Stream Chat
    await client.addDevice(fcmToken, 'firebase');
    console.log('Push token registered with Stream Chat');
  } catch (error) {
    console.error('Error registering push token:', error);
  }
};

