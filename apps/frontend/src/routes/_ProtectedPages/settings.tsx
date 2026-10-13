import { createFileRoute } from "@tanstack/react-router"
import { AlertCircle, Loader2 } from "lucide-react"

import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { SettingsForm } from "@/features/user/components/SettingsForm"
import { useUserSettings } from "@/features/user/hooks/useUserSettings"

export const Route = createFileRoute("/_ProtectedPages/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const settingsQuery = useUserSettings()

  return (
    <>
      <Seo title="Settings" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>

        {settingsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : settingsQuery.error ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Failed to load settings</AlertTitle>
            <AlertDescription className="mt-2 flex flex-col gap-3">
              <span>{settingsQuery.error.message}</span>
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void settingsQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : settingsQuery.data ? (
          <SettingsForm settings={settingsQuery.data} />
        ) : null}
      </section>
    </>
  )
}
