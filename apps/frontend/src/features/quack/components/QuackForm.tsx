import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, X } from "lucide-react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
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
import { cn } from "@/lib/utils"
import { quackMoodSchema, type QuackMood } from "@/types/moods"

import { POLL_DURATIONS, type PollDuration } from "@/features/quack/api/quackSchemas"
import { useAddQuack } from "@/features/quack/hooks/useAddQuack"
import { moodDetails } from "@/features/quack/lib/moods"

// Mirrors the server-side DTO (MaxLength(280)) so the user is told before
// the request is made — the server still validates independently.
const MAX_LENGTH = 280

// Poll limits, also mirroring the DTO: 2–4 answers of 1–50 characters.
const MIN_ANSWERS = 2
const MAX_ANSWERS = 4
const ANSWER_MAX_LENGTH = 50

const DURATION_LABELS: Record<PollDuration, string> = {
  "1h": "1 hour",
  "1d": "1 day",
  "1w": "1 week",
}
const DEFAULT_DURATION: PollDuration = "1d"

// Radix Select can't hold an empty value, so "no mood" gets its own option
// and is mapped to null before the request.
const NO_MOOD = "none"

const schema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, "Write something first")
      .max(MAX_LENGTH, `Keep it under ${MAX_LENGTH} characters`),
    mood: z.union([quackMoodSchema, z.literal(NO_MOOD)]),
    // The poll fields stay in the form while hidden, so only check them when asked for.
    hasPoll: z.boolean(),
    answers: z.array(z.object({ text: z.string() })),
    duration: z.enum(POLL_DURATIONS),
  })
  .superRefine((values, ctx) => {
    if (!values.hasPoll) return

    const seen = new Set<string>()
    values.answers.forEach(({ text }, index) => {
      const answer = text.trim()
      const path = ["answers", index, "text"]
      if (!answer) {
        ctx.addIssue({ code: "custom", path, message: "Fill in this answer" })
        return
      }
      if (answer.length > ANSWER_MAX_LENGTH) {
        ctx.addIssue({
          code: "custom",
          path,
          message: `Keep it under ${ANSWER_MAX_LENGTH} characters`,
        })
      }
      // Identical-looking answers would split the votes between them.
      const key = answer.toLowerCase()
      if (seen.has(key)) {
        ctx.addIssue({ code: "custom", path, message: "Answers must be different" })
      }
      seen.add(key)
    })
  })

type FormValues = z.infer<typeof schema>

const emptyValues = (mood: FormValues["mood"]): FormValues => ({
  text: "",
  mood,
  hasPoll: false,
  answers: Array.from({ length: MIN_ANSWERS }, () => ({ text: "" })),
  duration: DEFAULT_DURATION,
})

type QuackFormProps = {
  className?: string
  defaultMood?: QuackMood | null
}

export function QuackForm({ className, defaultMood: initialDefaultMood }: QuackFormProps) {
  const addQuack = useAddQuack()
  const defaultMood = initialDefaultMood ?? NO_MOOD

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(defaultMood),
  })
  const answers = useFieldArray({ control: form.control, name: "answers" })

  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset({ ...emptyValues(defaultMood), text: form.getValues("text") || "" })
    }
  }, [defaultMood, form])

  const text = useWatch({ control: form.control, name: "text" })
  const hasPoll = useWatch({ control: form.control, name: "hasPoll" })
  const length = text?.length ?? 0

  const addPoll = () => form.setValue("hasPoll", true, { shouldDirty: true })

  const removePoll = () => {
    form.setValue("hasPoll", false, { shouldDirty: true })
    form.setValue("duration", DEFAULT_DURATION)
    answers.replace(emptyValues(defaultMood).answers)
    form.clearErrors("answers")
  }

  const handleSubmit = (values: FormValues) => {
    addQuack.mutate(
      {
        text: values.text,
        mood: values.mood === NO_MOOD ? null : values.mood,
        ...(values.hasPoll && {
          poll: {
            answers: values.answers.map((answer) => answer.text.trim()),
            duration: values.duration,
          },
        }),
      },
      { onSuccess: () => form.reset(emptyValues(defaultMood)) },
    )
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-3", className)}
      >
        {addQuack.error ? (
          <Alert variant="destructive">
            <AlertDescription>{addQuack.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>New quack</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Quack something..."
                    disabled={addQuack.isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mood"
            render={({ field }) => (
              <FormItem className="sm:w-40">
                <FormLabel>Mood</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={addQuack.isPending}
                >
                  <FormControl>
                    <SelectTrigger
                      ref={field.ref}
                      onBlur={field.onBlur}
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_MOOD}>No mood</SelectItem>
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {hasPoll ? (
          <div className="flex flex-col gap-3">
            {answers.fields.map((answer, index) => (
              <FormField
                key={answer.id}
                control={form.control}
                name={`answers.${index}.text`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{`Answer ${index + 1}`}</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          maxLength={ANSWER_MAX_LENGTH}
                          disabled={addQuack.isPending}
                          {...field}
                        />
                      </FormControl>
                      {answers.fields.length > MIN_ANSWERS ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove answer ${index + 1}`}
                          disabled={addQuack.isPending}
                          onClick={() => answers.remove(index)}
                        >
                          <X />
                        </Button>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <div className="flex flex-wrap items-end justify-between gap-3">
              {answers.fields.length < MAX_ANSWERS ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={addQuack.isPending}
                  onClick={() => answers.append({ text: "" })}
                >
                  Add answer
                </Button>
              ) : (
                <span />
              )}

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem className="sm:w-40">
                    <FormLabel>Poll length</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={addQuack.isPending}
                    >
                      <FormControl>
                        <SelectTrigger
                          ref={field.ref}
                          onBlur={field.onBlur}
                          className="w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {POLL_DURATIONS.map((duration) => (
                          <SelectItem
                            key={duration}
                            value={duration}
                          >
                            {DURATION_LABELS[duration]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant={hasPoll ? "ghost" : "outline"}
            size="sm"
            disabled={addQuack.isPending}
            onClick={hasPoll ? removePoll : addPoll}
          >
            {hasPoll ? "Remove poll" : "Add poll"}
          </Button>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-sm",
                length > MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {length}/{MAX_LENGTH}
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={addQuack.isPending}
            >
              {addQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Quack
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
