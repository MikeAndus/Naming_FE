import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { defaultProjectsListQueryKey } from '@/features/projects/queries'
import {
  createProject,
  DEFAULT_PROJECTS_LIST_LIMIT,
  DEFAULT_PROJECTS_LIST_OFFSET,
  getErrorMessage,
  type CreateProjectPayload,
  type ListProjectsResponse,
  type Project,
} from '@/lib/api'
import { Button, type ButtonProps } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'

const NAME_MAX_LENGTH = 200
const DESCRIPTION_MAX_LENGTH = 1000

interface FormErrors {
  name?: string
  description?: string
}

interface CreateProjectMutationVariables extends CreateProjectPayload {
  optimisticId: string
}

interface CreateProjectMutationContext {
  previousList?: ListProjectsResponse
  optimisticId: string
}

interface CreateProjectDialogProps {
  triggerLabel?: string
  triggerSize?: ButtonProps['size']
  triggerVariant?: ButtonProps['variant']
}

export function CreateProjectDialog({
  triggerLabel = 'Create Project',
  triggerSize = 'default',
  triggerVariant = 'default',
}: CreateProjectDialogProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (rawName: string, rawDescription: string): FormErrors => {
    const nextErrors: FormErrors = {}
    const trimmedName = rawName.trim()

    if (!trimmedName) {
      nextErrors.name = 'Name is required.'
    } else if (trimmedName.length > NAME_MAX_LENGTH) {
      nextErrors.name = `Name must be ${NAME_MAX_LENGTH} characters or less.`
    }

    if (rawDescription.length > DESCRIPTION_MAX_LENGTH) {
      nextErrors.description = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less.`
    }

    return nextErrors
  }

  const canSubmit = useMemo(() => {
    const nextErrors = validate(name, description)
    return Object.keys(nextErrors).length === 0
  }, [description, name])

  const resetForm = () => {
    setName('')
    setDescription('')
    setErrors({})
  }

  const mutation = useMutation<
    Project,
    unknown,
    CreateProjectMutationVariables,
    CreateProjectMutationContext
  >({
    mutationFn: (variables) =>
      createProject({
        name: variables.name,
        description: variables.description,
      }),
    meta: {
      suppressGlobalErrorToast: true,
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: defaultProjectsListQueryKey,
      })

      const previousList = queryClient.getQueryData<ListProjectsResponse>(
        defaultProjectsListQueryKey,
      )
      const nowIso = new Date().toISOString()
      const optimisticProject: Project = {
        id: variables.optimisticId,
        name: variables.name,
        description: variables.description ?? null,
        created_by: 'You',
        created_at: nowIso,
        updated_at: nowIso,
      }

      queryClient.setQueryData<ListProjectsResponse>(defaultProjectsListQueryKey, (current) => {
        if (!current) {
          return {
            total: 1,
            limit: DEFAULT_PROJECTS_LIST_LIMIT,
            offset: DEFAULT_PROJECTS_LIST_OFFSET,
            items: [optimisticProject],
          }
        }

        return {
          ...current,
          total: current.total + 1,
          items: [optimisticProject, ...current.items],
        }
      })

      return {
        previousList,
        optimisticId: variables.optimisticId,
      }
    },
    onError: (error, _variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(defaultProjectsListQueryKey, context.previousList)
      } else {
        queryClient.removeQueries({
          queryKey: defaultProjectsListQueryKey,
          exact: true,
        })
      }

      toast({
        variant: 'destructive',
        title: 'Failed to create project',
        description: getErrorMessage(error, 'Please try again.'),
      })
    },
    onSuccess: (project, _variables, context) => {
      queryClient.setQueryData<ListProjectsResponse>(defaultProjectsListQueryKey, (current) => {
        if (!current) {
          return {
            total: 1,
            limit: DEFAULT_PROJECTS_LIST_LIMIT,
            offset: DEFAULT_PROJECTS_LIST_OFFSET,
            items: [project],
          }
        }

        const optimisticId = context?.optimisticId
        if (!optimisticId) {
          return {
            ...current,
            total: current.total + 1,
            items: [project, ...current.items.filter((item) => item.id !== project.id)],
          }
        }

        const hadOptimisticEntry = current.items.some((item) => item.id === optimisticId)
        const withoutOptimistic = current.items.filter(
          (item) => item.id !== optimisticId && item.id !== project.id,
        )

        return {
          ...current,
          total: hadOptimisticEntry ? current.total : current.total + 1,
          items: [project, ...withoutOptimistic],
        }
      })

      setOpen(false)
      resetForm()
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (mutation.isPending && !nextOpen) {
      return
    }

    setOpen(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  const handleNameChange = (value: string) => {
    setName(value)
    setErrors(validate(value, description))
  }

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
    setErrors(validate(name, value))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validate(name, description)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0 || mutation.isPending) {
      return
    }

    const trimmedName = name.trim()
    const normalizedDescription = description.trim() ? description : null
    const optimisticId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `optimistic-${Date.now()}`

    mutation.mutate({
      optimisticId,
      name: trimmedName,
      description: normalizedDescription,
    })
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button size={triggerSize} variant={triggerVariant}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Add a project name and optional description to create a new project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="project-name">
                Name
              </label>
              <Input
                aria-invalid={Boolean(errors.name)}
                id="project-name"
                maxLength={NAME_MAX_LENGTH}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Project name"
                required
                value={name}
              />
              {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="project-description">
                Description
              </label>
              <Textarea
                aria-invalid={Boolean(errors.description)}
                id="project-description"
                maxLength={DESCRIPTION_MAX_LENGTH}
                onChange={(event) => handleDescriptionChange(event.target.value)}
                placeholder="Optional description"
                rows={4}
                value={description}
              />
              {errors.description ? (
                <p className="text-xs text-destructive">{errors.description}</p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={mutation.isPending} type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={!canSubmit || mutation.isPending} type="submit">
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
