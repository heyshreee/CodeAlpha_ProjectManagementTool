import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { connectSocket, disconnectSocket, resyncProjects } from '@/lib/socket';
import { toast } from '@/lib/toast';

const PROJECT_EVENTS = [
  'task.created',
  'task.updated',
  'task.deleted',
  'task.moved',
  'comment.created',
  'comment.updated',
  'comment.deleted',
  'member.added',
  'member.removed',
  'attachment.created',
  'activity.created',
];

// Connects the socket for an authenticated user and maps real-time events to
// query invalidation + toast notifications.
export function useRealtime() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const socket = connectSocket();

    const invalids: Record<string, string> = {
      'task.created': 'tasks',
      'task.updated': 'tasks',
      'task.deleted': 'tasks',
      'task.moved': 'tasks',
      'attachment.created': 'tasks',
      'comment.created': 'comments',
      'comment.updated': 'comments',
      'comment.deleted': 'comments',
      'member.added': 'members',
      'member.removed': 'members',
      'activity.created': 'activities',
    };

    for (const [event, key] of Object.entries(invalids)) {
      socket.on(event, () => {
        qc.invalidateQueries({ queryKey: [key] });
      });
    }

    socket.on('notification.created', (n) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast(n?.title || 'New notification', 'info');
      // If membership changed while connected, re-resolve project rooms.
      if (n?.type === 'MEMBER_ADDED' || n?.type === 'MEMBER_REMOVED') {
        resyncProjects();
      }
    });

    socket.on('connect_error', () => {
      /* transient */
    });

    return () => {
      for (const event of PROJECT_EVENTS) socket.off(event);
      socket.off('notification.created');
      socket.off('connect_error');
      disconnectSocket();
    };
  }, [user?.id, qc]);
}
