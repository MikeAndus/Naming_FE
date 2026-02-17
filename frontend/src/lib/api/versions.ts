import { request } from '@/lib/api/client'

export interface ProjectVersionListItem {
  id: string
  version_number: number
  state: string
  created_at: string
  updated_at: string
  summary_snippet: string | null
}

export type ListProjectVersionsResponse = ProjectVersionListItem[]

export interface VersionDetail {
  id: string
  project_id: string
  version_number: number
  state: string
  brief: unknown
  hotspots: unknown
  dials: unknown
  forked_from: string | null
  created_at: string
  updated_at: string
}

export interface PatchVersionPayload {
  brief?: unknown
  hotspots?: unknown
  dials?: unknown
}

export async function listProjectVersions(projectId: string): Promise<ListProjectVersionsResponse> {
  return request<ListProjectVersionsResponse>(
    `/projects/${encodeURIComponent(projectId)}/versions`,
    {
      method: 'GET',
    },
  )
}

export async function createBlankVersion(projectId: string): Promise<VersionDetail> {
  return request<VersionDetail>(`/projects/${encodeURIComponent(projectId)}/versions`, {
    method: 'POST',
  })
}

export async function getVersionById(versionId: string): Promise<VersionDetail> {
  return request<VersionDetail>(`/versions/${encodeURIComponent(versionId)}`, {
    method: 'GET',
  })
}

export async function patchVersion(
  versionId: string,
  payload: PatchVersionPayload,
): Promise<VersionDetail> {
  const sectionPatch: PatchVersionPayload = {}
  if (payload.brief !== undefined) {
    sectionPatch.brief = payload.brief
  }
  if (payload.hotspots !== undefined) {
    sectionPatch.hotspots = payload.hotspots
  }
  if (payload.dials !== undefined) {
    sectionPatch.dials = payload.dials
  }

  return request<VersionDetail, PatchVersionPayload>(`/versions/${encodeURIComponent(versionId)}`, {
    method: 'PATCH',
    body: sectionPatch,
  })
}

export async function forkVersion(versionId: string): Promise<VersionDetail> {
  return request<VersionDetail>(`/versions/${encodeURIComponent(versionId)}/fork`, {
    method: 'POST',
  })
}
