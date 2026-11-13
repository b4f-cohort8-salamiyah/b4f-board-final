import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-1 text-xl font-semibold">Log in to B4F Board</h1>
        <p className="mb-4 text-sm text-gray-500">Instructor-only preview.</p>
        <LoginForm />
      </div>
    </div>
  );
}
