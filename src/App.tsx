import { AuthForm } from "./AuthForm";
import { useSession } from "./AuthProvider";
import { FragranceGrid } from "./FragranceGrid";

export function App() {
  const session = useSession()

  if (session) return <FragranceGrid />

  return <AuthForm />
}