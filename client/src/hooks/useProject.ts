import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Project } from '@/types';

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<Project>(`/projects/${projectId}`),
  });
}

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: ['members', projectId],
    queryFn: () =>
      api.get<{ id: string; role: string; createdAt: string; user: any }[]>(
        `/projects/${projectId}/members`
      ),
  });
}
