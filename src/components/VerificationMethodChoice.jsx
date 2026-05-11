// Choose email or SMS for one-time signup verification
import React from 'react';
import { Mail, Phone, ArrowLeft } from 'lucide-react';

export default function VerificationMethodChoice({
  email,
  phone,
  onChooseEmail,
  onChoosePhone,
  onBack
}) {
  return (
    <div className="max-w-lg mx-auto p-6 md:p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          How should we send your code?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Pick one — you only need to verify one way to continue.
        </p>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={onChooseEmail}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-left shadow-sm"
        >
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shrink-0">
            <Mail className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">Email</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{email}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={onChoosePhone}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50/50 dark:hover:bg-green-900/20 transition-all text-left shadow-sm"
        >
          <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 shrink-0">
            <Phone className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">Text message (SMS)</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{phone}</p>
          </div>
        </button>
      </div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-8 w-full flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to form
        </button>
      )}

      <p className="mt-6 text-xs text-center text-gray-500 dark:text-gray-400">
        If messages don&apos;t arrive, you&apos;ll see your code on the next screen (when email/SMS isn&apos;t configured yet).
      </p>
    </div>
  );
}
