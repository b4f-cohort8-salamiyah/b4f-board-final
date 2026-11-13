import { RegisterForm } from './RegisterForm';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-1 text-xl font-semibold">Create your account</h1>
        <p className="mb-4 text-sm text-gray-500">Instructor-only preview.</p>
        <RegisterForm />
      </div>
    </div>
  );
}
