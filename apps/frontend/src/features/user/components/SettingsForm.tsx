import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { HTTPError } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { moodDetails, quackMoodSchema } from "@/types/moods"

import {
  NO_DEFAULT_MOOD,
  userSettingsFormSchema,
  type UserSettingsFormValues,
  type UserSettingsResponse,
} from "@/features/user/api/userSchemas"
import { useUpdateUserSettings } from "@/features/user/hooks/useUpdateUserSettings"

const BIO_MAX_LENGTH = 160

type SettingsFormProps = {
  settings: UserSettingsResponse
  className?: string
}

export function SettingsForm({ settings, className }: SettingsFormProps) {
  const updateSettings = useUpdateUserSettings()
  const [isSaveSuccessful, setIsSaveSuccessful] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const defaultValues: UserSettingsFormValues = {
    username: settings.username,
    name: settings.name,
    bio: settings.bio ?? "",
    defaultMood: settings.defaultMood ?? NO_DEFAULT_MOOD,
  }

  const form = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsFormSchema),
    defaultValues,
  })

  // Keep form updated if settings prop changes and user hasn't dirtied the form
  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset({
        username: settings.username,
        name: settings.name,
        bio: settings.bio ?? "",
        defaultMood: settings.defaultMood ?? NO_DEFAULT_MOOD,
      })
    }
  }, [settings, form])

  const bio = useWatch({ control: form.control, name: "bio" })
  const bioLength = bio?.length ?? 0

  const handleSubmit = async (values: UserSettingsFormValues) => {
    setIsSaveSuccessful(false)
    setGeneralError(null)
    try {
      const updated = await updateSettings.mutateAsync({
        name: values.name,
        username: values.username,
        bio: values.bio ? values.bio.trim() : null,
        defaultMood: values.defaultMood === NO_DEFAULT_MOOD ? null : values.defaultMood,
      })
      form.reset({
        username: updated.username,
        name: updated.name,
        bio: updated.bio ?? "",
        defaultMood: updated.defaultMood ?? NO_DEFAULT_MOOD,
      })
      setIsSaveSuccessful(true)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update settings"
      const isUsernameTaken =
        errorMessage.toLowerCase().includes("username") ||
        errorMessage.toLowerCase().includes("taken") ||
        errorMessage.includes("409") ||
        (err instanceof HTTPError && err.response.status === 409)

      if (isUsernameTaken) {
        form.setError("username", {
          message:
            errorMessage.includes("status code") || errorMessage.includes("Conflict")
              ? "This username is already taken"
              : errorMessage,
        })
      } else {
        setGeneralError(errorMessage)
      }
    }
  }

  const handleDiscard = () => {
    form.reset({
      username: settings.username,
      name: settings.name,
      bio: settings.bio ?? "",
      defaultMood: settings.defaultMood ?? NO_DEFAULT_MOOD,
    })
    form.clearErrors()
    setIsSaveSuccessful(false)
    setGeneralError(null)
  }

  const isPending = updateSettings.isPending

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-6", className)}
      >
        {isSaveSuccessful ? (
          <Alert className="border-border">
            <Check className="size-4" />
            <AlertDescription>Your settings have been saved.</AlertDescription>
          </Alert>
        ) : null}

        {generalError ? (
          <Alert variant="destructive">
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                3–30 characters: letters, numbers, dots and underscores.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Bio</FormLabel>
                <span
                  className={cn(
                    "text-xs",
                    bioLength > BIO_MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {bioLength}/{BIO_MAX_LENGTH}
                </span>
              </div>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Tell others a bit about yourself..."
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultMood"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default mood</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isPending}
              >
                <FormControl>
                  <SelectTrigger
                    ref={field.ref}
                    onBlur={field.onBlur}
                    className="w-full sm:w-60"
                  >
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_DEFAULT_MOOD}>No mood</SelectItem>
                  {quackMoodSchema.options.map((mood) => {
                    const { label, icon: Icon } = moodDetails[mood]
                    return (
                      <SelectItem
                        key={mood}
                        value={mood}
                      >
                        <Icon aria-hidden />
                        {label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <FormDescription>New posts start with this mood selected.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleDiscard}
            disabled={isPending || !form.formState.isDirty}
          >
            Discard changes
          </Button>
        </div>
      </form>
    </Form>
  )
}
