import { LogIn } from 'lucide-react';

type SignInPromptProps = {
  message: string;
  onSignIn: () => void;
};

export default function SignInPrompt({ message, onSignIn }: SignInPromptProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pastel-rose text-pastel-accent dark:bg-pastel-roseDark dark:text-pastel-rose">
        <LogIn className="h-5 w-5" />
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300">{message}</p>
      <button
        type="button"
        onClick={onSignIn}
        className="rounded-xl bg-pastel-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-pastel-accentHover"
      >
        Iniciar sesión o crear cuenta
      </button>
    </div>
  );
}
