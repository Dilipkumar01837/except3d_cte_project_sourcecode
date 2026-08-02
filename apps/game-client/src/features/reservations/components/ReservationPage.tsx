import { motion } from 'framer-motion';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormButton } from '@/shared/components/ui/FormButton';
import { Input } from '@/shared/components/ui/Input';
import { reservationApi, type ReservationRequest } from '../lib/reservation-api';

type ReservationForm = ReservationRequest;

export function ReservationPage() {
  const [confirmationId, setConfirmationId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ReservationForm>({ defaultValues: { guests: 2 } });

  const submit = async (data: ReservationForm): Promise<void> => {
    setSubmitError('');
    try {
      const result = await reservationApi.create({ ...data, guests: data.guests });
      setConfirmationId(result.confirmationId);
      reset({ guests: 2 });
    } catch {
      setSubmitError('We could not save your reservation. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-14 text-slate-100 sm:px-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl shadow-cyan-950/30 lg:grid-cols-[.85fr_1.15fr]"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-cyan-500/20 via-slate-900 to-violet-600/20 p-8 sm:p-12">
          <div
            aria-hidden="true"
            className="absolute -left-20 top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl"
          />
          <p className="relative text-xs font-bold uppercase tracking-[.22em] text-cyan-200">
            The escape lounge
          </p>
          <h1 className="relative mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            Reserve your next quest.
          </h1>
          <p className="relative mt-5 max-w-sm leading-7 text-slate-300">
            Book a table for your crew, plan a learning session, and we will prepare the perfect
            launch point.
          </p>
          <div className="relative mt-12 space-y-4 text-sm text-slate-300">
            <p>✦ Collaborative coding stations</p>
            <p>✦ Events and team missions</p>
            <p>✦ A reply within one business day</p>
          </div>
        </div>
        <div className="p-6 sm:p-10">
          {confirmationId ? (
            <div
              role="status"
              className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-6"
            >
              <p className="text-lg font-bold text-emerald-200">Reservation received</p>
              <p className="mt-2 text-sm text-emerald-100/80">
                Your confirmation reference is {confirmationId}. We will be in touch shortly.
              </p>
              <button
                type="button"
                onClick={() => {
                  setConfirmationId(null);
                }}
                className="mt-5 text-sm font-semibold text-emerald-200 underline"
              >
                Make another reservation
              </button>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                void handleSubmit(submit)(event);
              }}
              className="space-y-4"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">
                  Book a table
                </p>
                <h2 className="mt-2 text-2xl font-bold">Tell us when to expect you</h2>
              </div>
              {submitError && (
                <p
                  role="alert"
                  className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200"
                >
                  {submitError}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="name"
                  label="Name"
                  placeholder="Alex Morgan"
                  error={errors.name?.message}
                  {...register('name', { required: 'Name is required' })}
                />
                <Input
                  id="email"
                  label="Email"
                  type="email"
                  placeholder="alex@example.com"
                  error={errors.email?.message}
                  {...register('email', { required: 'Email is required' })}
                />
              </div>
              <Input
                id="phone"
                label="Phone"
                type="tel"
                placeholder="+1 555 0123"
                error={errors.phone?.message}
                {...register('phone', { required: 'Phone is required' })}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  id="date"
                  label="Date"
                  type="date"
                  error={errors.date?.message}
                  {...register('date', { required: 'Select a date' })}
                />
                <Input
                  id="time"
                  label="Time"
                  type="time"
                  error={errors.time?.message}
                  {...register('time', { required: 'Select a time' })}
                />
                <Input
                  id="guests"
                  label="Guests"
                  type="number"
                  min="1"
                  max="20"
                  error={errors.guests?.message}
                  {...register('guests', {
                    required: 'Guest count is required',
                    min: { value: 1, message: 'At least one guest' },
                    valueAsNumber: true,
                  })}
                />
              </div>
              <label className="flex flex-col gap-1 text-sm font-medium text-brand-50/80">
                Notes
                <textarea
                  className="min-h-24 rounded-lg border border-brand-500/30 bg-brand-900/60 px-3 py-2 text-brand-50 placeholder-brand-50/40 outline-none transition focus:ring-2 focus:ring-brand-500/40"
                  placeholder="Accessibility needs, occasion, or anything else?"
                  {...register('notes')}
                />
              </label>
              <FormButton type="submit" loading={isSubmitting}>
                Request reservation
              </FormButton>
              <p className="text-center text-xs text-slate-500">
                This request is confirmed by our team; no payment is taken.
              </p>
            </form>
          )}
        </div>
      </motion.section>
    </div>
  );
}
